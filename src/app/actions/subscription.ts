"use server"

import { db } from '@/db'
import { subscriptions, tenants, subscriptionPlans } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-session'
import { getN1coSubscriptionLink, buildN1coLink } from '@/lib/n1co'
import { isN1coApiConfigured, cancelN1coSubscription } from '@/lib/n1co-api'
import { getPlanPrice, getPlanFeatures, PlanType } from '@/core/plans'
import { enforceDowngradeLimits } from '@/lib/billing'
import { logAuditEvent } from '@/lib/audit'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const PLAN_ORDER: Record<string, number> = { BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

function isDowngrade(currentPlan: string, newPlan: string): boolean {
  return (PLAN_ORDER[newPlan] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0)
}

// ---------------------------------------------------------------------------
// Read subscription
// ---------------------------------------------------------------------------

export async function getSubscriptionAction(tenantId: string) {
  const session = await getSession()
  if (!session) return null

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenantId),
  })
  return sub ?? null
}

// ---------------------------------------------------------------------------
// Activate (trial ended or new tenant → redirect to N1CO link)
// ---------------------------------------------------------------------------

/**
 * Returns an N1CO subscription link URL for the given plan.
 * Also creates a PENDING_PAYMENT subscription row so the webhook handler
 * can match the incoming confirmation to this tenant.
 *
 * No card data is collected by Zyncrox — the customer enters their card
 * directly on N1CO's hosted page.
 */
export async function activateSubscriptionAction(
  tenantId: string,
  plan: string,
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }
  if (!session.isOwner && session.role !== 'SUPER_ADMIN') return { success: false, error: 'OWNER_ONLY' }

  try {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    // Create/update a PENDING_PAYMENT row so the webhook can match by email
    const now = new Date()
    await db.insert(subscriptions).values({
      tenantId,
      plan,
      status: 'PENDING_PAYMENT',
      currentPeriodStart: now,
      currentPeriodEnd:   addDays(now, getPlanFeatures(plan).billingCycleDays),
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        plan,
        status:              'PENDING_PAYMENT',
        n1coSubscriptionId:  null,
        n1coPaymentMethodId: null,
        cardLast4:           null,
        cardBrand:           null,
        cardExpMonth:        null,
        cardExpYear:         null,
        cancelledAt:         null,
        gracePeriodEndsAt:   null,
        pendingPlan:         null,
        updatedAt:           now,
      },
    })

    // Look up N1CO link from DB plan first; fall back to env var for backward compat
    let redirectUrl: string
    const dbPlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, plan),
    })
    if (dbPlan?.n1coLink) {
      redirectUrl = buildN1coLink(dbPlan.n1coLink, tenant.contactEmail ?? undefined)
    } else {
      redirectUrl = getN1coSubscriptionLink(plan, tenant.contactEmail ?? undefined)
    }

    revalidatePath('/[locale]/admin/billing', 'page')
    await logAuditEvent({ action: 'SUBSCRIPTION_ACTIVATED', userId: session.userId, tenantId, details: { plan } })
    return { success: true, redirectUrl }
  } catch (err) {
    console.error('activateSubscription error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error al activar suscripción' }
  }
}

// ---------------------------------------------------------------------------
// Change plan
// ---------------------------------------------------------------------------

export async function changePlanAction(
  tenantId: string,
  newPlan: string,
): Promise<{ success: boolean; error?: string; deferred?: boolean; redirectUrl?: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }
  if (!session.isOwner && session.role !== 'SUPER_ADMIN') return { success: false, error: 'OWNER_ONLY' }

  try {
    const [sub, tenant] = await Promise.all([
      db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenantId) }),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    ])

    if (!sub) return { success: false, error: 'No hay suscripción activa' }
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    const now = new Date()
    const currentPlan = sub.plan

    // -----------------------------------------------------------------------
    // DOWNGRADE — schedule for end of current period; apply in billing cron
    // -----------------------------------------------------------------------
    if (isDowngrade(currentPlan, newPlan)) {
      await db.update(subscriptions)
        .set({ pendingPlan: newPlan, updatedAt: now })
        .where(eq(subscriptions.tenantId, tenantId))

      revalidatePath('/[locale]/admin/billing', 'page')
      await logAuditEvent({ action: 'PLAN_CHANGED', userId: session.userId, tenantId, details: { from: currentPlan, to: newPlan, deferred: true } })
      return { success: true, deferred: true }
    }

    // -----------------------------------------------------------------------
    // UPGRADE — redirect to new plan's N1CO link
    // The customer subscribes directly on N1CO. Once confirmed via webhook,
    // the tenant's plan is updated. The old N1CO subscription should be
    // cancelled manually from the N1CO portal (or it will charge in parallel).
    // -----------------------------------------------------------------------
    await db.update(subscriptions)
      .set({ pendingPlan: newPlan, status: 'PENDING_PAYMENT', updatedAt: now })
      .where(eq(subscriptions.tenantId, tenantId))

    const redirectUrl = getN1coSubscriptionLink(newPlan, tenant.contactEmail ?? undefined)

    revalidatePath('/[locale]/admin/billing', 'page')
    await logAuditEvent({ action: 'PLAN_CHANGED', userId: session.userId, tenantId, details: { from: currentPlan, to: newPlan, deferred: false } })
    return { success: true, deferred: false, redirectUrl }
  } catch (err) {
    console.error('changePlan error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error al cambiar el plan' }
  }
}

// ---------------------------------------------------------------------------
// Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscriptionAction(tenantId: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }
  if (!session.isOwner && session.role !== 'SUPER_ADMIN') return { success: false, error: 'OWNER_ONLY' }

  try {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    })
    if (!sub) return { success: false, error: 'No hay suscripción activa' }

    const now = new Date()

    // ── Stop the recurring charge at N1CO FIRST ───────────────────────────────
    // Cancelling only in our DB would leave N1CO charging the card every cycle.
    // So if we cannot stop it upstream we deliberately do NOT mark it cancelled
    // locally — the UI must never say "cancelled" while the customer is still
    // being charged. The owner gets an actionable error instead.
    if (!isN1coApiConfigured()) {
      console.error('[Cancel] N1CO API credentials not configured — cannot stop recurring charge')
      return {
        success: false,
        error: 'No se pudo detener el cobro recurrente: la integración con N1CO no está configurada. Contacta a soporte.',
      }
    }

    if (!sub.n1coSubscriptionId) {
      console.error(`[Cancel] tenant ${tenantId} has no n1coSubscriptionId — cannot cancel upstream`)
      return {
        success: false,
        error: 'No pudimos identificar tu suscripción en N1CO, por lo que no podemos detener el cobro automáticamente. Contacta a soporte para cancelarla.',
      }
    }

    const result = await cancelN1coSubscription(sub.n1coSubscriptionId)
    if (!result.ok) {
      // Full upstream response is logged so the exact N1CO error/body is visible.
      console.error(
        `[Cancel] N1CO cancel failed — tenant ${tenantId}, subscription ${sub.n1coSubscriptionId}:`,
        result.error,
      )
      return {
        success: false,
        error: 'No pudimos cancelar el cobro recurrente en N1CO. Intenta de nuevo; si el problema persiste, contacta a soporte.',
      }
    }

    console.log(
      `[Cancel] N1CO subscription ${sub.n1coSubscriptionId} cancelled for tenant ${tenantId} ` +
      `(status ${result.status}) — response: ${result.body.slice(0, 300)}`,
    )

    // Upstream billing is stopped — now it's safe to reflect it locally.
    // If N1CO also fires a SubscriptionCancelled webhook, that handler is
    // idempotent and preserves this original cancelledAt timestamp.
    await db.update(subscriptions)
      .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
      .where(eq(subscriptions.tenantId, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    await logAuditEvent({
      action: 'SUBSCRIPTION_CANCELLED',
      userId: session.userId,
      tenantId,
      details: { n1coSubscriptionId: sub.n1coSubscriptionId },
    })
    return { success: true }
  } catch (err) {
    console.error('cancelSubscription error:', err)
    return { success: false, error: 'Error al cancelar la suscripción' }
  }
}

// ---------------------------------------------------------------------------
// Reactivate (after cancellation or suspension)
// ---------------------------------------------------------------------------

/**
 * Same as activate: returns an N1CO redirect URL for the selected plan.
 * The customer re-subscribes on N1CO's hosted page.
 */
export async function reactivateSubscriptionAction(
  tenantId: string,
  newPlan: string,
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  return activateSubscriptionAction(tenantId, newPlan)
}

// ---------------------------------------------------------------------------
// Apply scheduled downgrade (called by billing cron when period ends)
// ---------------------------------------------------------------------------

export async function applyPendingDowngradeAction(tenantId: string, newPlan: string) {
  const now = new Date()
  const periodEnd = addDays(now, getPlanFeatures(newPlan).billingCycleDays)

  await db.update(subscriptions)
    .set({
      plan:               newPlan,
      status:             'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd:   periodEnd,
      pendingPlan:        null,
      lastPaymentAt:      now,
      lastPaymentAmount:  String(getPlanPrice(newPlan)),
      updatedAt:          now,
    })
    .where(eq(subscriptions.tenantId, tenantId))

  await db.update(tenants)
    .set({ plan: newPlan, updatedAt: now })
    .where(eq(tenants.id, tenantId))

  // Enforce plan limits (deactivate excess resources)
  await enforceDowngradeLimits(tenantId, newPlan)
}
