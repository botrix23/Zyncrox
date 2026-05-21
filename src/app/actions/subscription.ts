"use server"

import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-session'
import {
  createPaymentMethod,
  createN1coSubscription,
  cancelN1coSubscription,
  N1coCardData,
  N1CO_PLAN_IDS,
} from '@/lib/n1co'
import { getPlanPrice } from '@/core/plans'
import { enforceDowngradeLimits } from '@/lib/billing'

// Re-export so billing UI can import from here
export type { N1coCardData }

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const PLAN_ORDER: Record<string, number> = { BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

function isDowngrade(currentPlan: string, newPlan: string): boolean {
  return (PLAN_ORDER[newPlan] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0)
}

function n1coPlanId(plan: string): string {
  const key = plan as keyof typeof N1CO_PLAN_IDS
  return N1CO_PLAN_IDS[key] ?? ''
}

const LOCATION_CODE = process.env.N1CO_LOCATION_CODE ?? ''

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
// Activate (first payment — trial ended or new tenant)
// ---------------------------------------------------------------------------

export async function activateSubscriptionAction(
  tenantId: string,
  plan: string,
  cardData: N1coCardData
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    // 1. Tokenize card → payment method
    const pm = await createPaymentMethod(cardData)

    // 2. Create N1CO subscription (N1CO handles recurring billing)
    const n1coSub = await createN1coSubscription({
      planId:          n1coPlanId(plan),
      locationCode:    LOCATION_CODE,
      paymentMethodId: pm.paymentMethodId,
      customerId:      tenantId,
      customerName:    tenant.name,
      customerEmail:   tenant.contactEmail ?? '',
    })

    const now = new Date()
    const periodEnd = addDays(now, 30)

    await db.insert(subscriptions).values({
      tenantId,
      plan,
      status: 'ACTIVE',
      // Card display info
      cardLast4:    pm.last4,
      cardBrand:    pm.brand,
      cardExpMonth: pm.expMonth,
      cardExpYear:  pm.expYear,
      // N1CO references
      n1coSubscriptionId:  n1coSub.subscriptionId,
      n1coPaymentMethodId: pm.paymentMethodId,
      // Period (informational — N1CO controls actual renewal)
      currentPeriodStart: now,
      currentPeriodEnd:   periodEnd,
      lastPaymentAt:      now,
      lastPaymentAmount:  String(getPlanPrice(plan)),
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        plan,
        status: 'ACTIVE',
        cardLast4:    pm.last4,
        cardBrand:    pm.brand,
        cardExpMonth: pm.expMonth,
        cardExpYear:  pm.expYear,
        n1coSubscriptionId:  n1coSub.subscriptionId,
        n1coPaymentMethodId: pm.paymentMethodId,
        currentPeriodStart:  now,
        currentPeriodEnd:    periodEnd,
        cancelledAt:         null,
        gracePeriodEndsAt:   null,
        lastPaymentAt:       now,
        lastPaymentAmount:   String(getPlanPrice(plan)),
        updatedAt:           now,
      },
    })

    await db.update(tenants)
      .set({ plan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('activateSubscription error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error al procesar el pago' }
  }
}

// ---------------------------------------------------------------------------
// Change plan
// ---------------------------------------------------------------------------

export async function changePlanAction(
  tenantId: string,
  newPlan: string,
): Promise<{ success: boolean; error?: string; deferred?: boolean }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const [sub, tenant] = await Promise.all([
      db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenantId) }),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    ])

    if (!sub || !sub.n1coPaymentMethodId) {
      return { success: false, error: 'No hay método de pago registrado' }
    }
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    const now = new Date()
    const currentPlan = sub.plan

    // -------------------------------------------------------------------------
    // DOWNGRADE — schedule for end of current period; don't touch N1CO now
    // -------------------------------------------------------------------------
    if (isDowngrade(currentPlan, newPlan)) {
      await db.update(subscriptions)
        .set({ pendingPlan: newPlan, updatedAt: now })
        .where(eq(subscriptions.tenantId, tenantId))

      revalidatePath('/[locale]/admin/billing', 'page')
      return { success: true, deferred: true }
    }

    // -------------------------------------------------------------------------
    // UPGRADE — apply immediately: cancel old N1CO sub, create new one
    // -------------------------------------------------------------------------

    // Cancel existing N1CO subscription
    if (sub.n1coSubscriptionId) {
      try {
        await cancelN1coSubscription(sub.n1coSubscriptionId, `Upgrade to ${newPlan}`)
      } catch (err) {
        console.warn('Could not cancel old N1CO subscription:', err)
      }
    }

    // Create new N1CO subscription with new plan
    const n1coSub = await createN1coSubscription({
      planId:          n1coPlanId(newPlan),
      locationCode:    LOCATION_CODE,
      paymentMethodId: sub.n1coPaymentMethodId,
      customerId:      tenantId,
      customerName:    tenant.name,
      customerEmail:   tenant.contactEmail ?? '',
    })

    const periodEnd = addDays(now, 30)

    await db.update(subscriptions)
      .set({
        plan:                newPlan,
        status:              'ACTIVE',
        n1coSubscriptionId:  n1coSub.subscriptionId,
        currentPeriodStart:  now,
        currentPeriodEnd:    periodEnd,
        cancelledAt:         null,
        gracePeriodEndsAt:   null,
        pendingPlan:         null,   // clear any scheduled downgrade
        lastPaymentAt:       now,
        lastPaymentAmount:   String(getPlanPrice(newPlan)),
        updatedAt:           now,
      })
      .where(eq(subscriptions.tenantId, tenantId))

    await db.update(tenants)
      .set({ plan: newPlan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    revalidatePath('/[locale]/admin/(dashboard)/staff', 'page')
    return { success: true, deferred: false }
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

  try {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    })

    // Cancel in N1CO (subscription will remain active until period end)
    if (sub?.n1coSubscriptionId) {
      try {
        await cancelN1coSubscription(sub.n1coSubscriptionId, 'Customer cancelled from admin panel')
      } catch (err) {
        console.warn('N1CO cancel failed (marking cancelled locally anyway):', err)
      }
    }

    const now = new Date()
    await db.update(subscriptions)
      .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
      .where(eq(subscriptions.tenantId, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('cancelSubscription error:', err)
    return { success: false, error: 'Error al cancelar la suscripción' }
  }
}

// ---------------------------------------------------------------------------
// Update card (creates new payment method, recreates subscription)
// ---------------------------------------------------------------------------

export async function updateCardAction(tenantId: string, cardData: N1coCardData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const [sub, tenant] = await Promise.all([
      db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenantId) }),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    ])

    if (!sub) return { success: false, error: 'No hay suscripción activa' }
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    // Create new payment method with new card
    const pm = await createPaymentMethod(cardData)

    // Cancel old N1CO subscription and recreate with new payment method
    if (sub.n1coSubscriptionId) {
      try {
        await cancelN1coSubscription(sub.n1coSubscriptionId, 'Card update')
      } catch (err) {
        console.warn('Could not cancel old N1CO subscription on card update:', err)
      }
    }

    const n1coSub = await createN1coSubscription({
      planId:          n1coPlanId(sub.plan),
      locationCode:    LOCATION_CODE,
      paymentMethodId: pm.paymentMethodId,
      customerId:      tenantId,
      customerName:    tenant.name,
      customerEmail:   tenant.contactEmail ?? '',
    })

    const now = new Date()
    await db.update(subscriptions)
      .set({
        cardLast4:           pm.last4,
        cardBrand:           pm.brand,
        cardExpMonth:        pm.expMonth,
        cardExpYear:         pm.expYear,
        n1coPaymentMethodId: pm.paymentMethodId,
        n1coSubscriptionId:  n1coSub.subscriptionId,
        updatedAt:           now,
      })
      .where(eq(subscriptions.tenantId, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('updateCard error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar la tarjeta' }
  }
}

// ---------------------------------------------------------------------------
// Reactivate (after cancellation)
// ---------------------------------------------------------------------------

export async function reactivateSubscriptionAction(
  tenantId: string,
  newPlan: string,
  cardData?: N1coCardData
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const [sub, tenant] = await Promise.all([
      db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenantId) }),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    ])
    if (!tenant) return { success: false, error: 'Tenant no encontrado' }

    let paymentMethodId = sub?.n1coPaymentMethodId
    let last4 = sub?.cardLast4
    let brand = sub?.cardBrand
    let expMonth = sub?.cardExpMonth
    let expYear = sub?.cardExpYear

    // Use new card if provided
    if (cardData) {
      const pm = await createPaymentMethod(cardData)
      paymentMethodId = pm.paymentMethodId
      last4    = pm.last4
      brand    = pm.brand
      expMonth = pm.expMonth
      expYear  = pm.expYear
    }

    if (!paymentMethodId) {
      return { success: false, error: 'Se requiere método de pago' }
    }

    const n1coSub = await createN1coSubscription({
      planId:          n1coPlanId(newPlan),
      locationCode:    LOCATION_CODE,
      paymentMethodId,
      customerId:      tenantId,
      customerName:    tenant.name,
      customerEmail:   tenant.contactEmail ?? '',
    })

    const now = new Date()
    const periodEnd = addDays(now, 30)

    await db.insert(subscriptions).values({
      tenantId,
      plan:                newPlan,
      status:              'ACTIVE',
      cardLast4:           last4 ?? undefined,
      cardBrand:           brand ?? undefined,
      cardExpMonth:        expMonth ?? undefined,
      cardExpYear:         expYear ?? undefined,
      n1coSubscriptionId:  n1coSub.subscriptionId,
      n1coPaymentMethodId: paymentMethodId,
      currentPeriodStart:  now,
      currentPeriodEnd:    periodEnd,
      lastPaymentAt:       now,
      lastPaymentAmount:   String(getPlanPrice(newPlan)),
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        plan:                newPlan,
        status:              'ACTIVE',
        cardLast4:           last4,
        cardBrand:           brand,
        cardExpMonth:        expMonth,
        cardExpYear:         expYear,
        n1coSubscriptionId:  n1coSub.subscriptionId,
        n1coPaymentMethodId: paymentMethodId,
        currentPeriodStart:  now,
        currentPeriodEnd:    periodEnd,
        cancelledAt:         null,
        gracePeriodEndsAt:   null,
        lastPaymentAt:       now,
        lastPaymentAmount:   String(getPlanPrice(newPlan)),
        updatedAt:           now,
      },
    })

    await db.update(tenants)
      .set({ plan: newPlan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('reactivateSubscription error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error al reactivar la suscripción' }
  }
}
