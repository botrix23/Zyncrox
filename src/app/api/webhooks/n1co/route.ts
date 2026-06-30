/**
 * N1CO Webhook Handler
 *
 * N1CO fires events when subscriptions are confirmed, renewed, failed, or cancelled.
 * This route updates the local DB so the app reflects the real billing state.
 *
 * Header: x-n1co-secret  (compared against N1CO_WEBHOOK_SECRET env var)
 *
 * Tenant lookup strategy (redirect/hosted-checkout model):
 *   SubscriptionConfirmation:
 *     1. Try matching by n1coSubscriptionId (recurring payments already stored it)
 *     2. Fall back to matching by subscriber email + PENDING_PAYMENT status
 *        (first-time subscription — tenant initiated the redirect and we pre-filled email)
 *   All other events:
 *     Match by n1coSubscriptionId (stored during SubscriptionConfirmation)
 *
 * Supported event types:
 *   SubscriptionConfirmation  — subscription was created/activated (also fires on renewals)
 *   SubscriptionPayment       — recurring payment succeeded
 *   SubscriptionFailed        — payment failed (move to PAST_DUE)
 *   SubscriptionCancelled     — subscription was cancelled in N1CO
 *
 * Every payload is logged to n1co_webhook_events for audit and field discovery.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions, tenants, n1coWebhookEvents } from '@/db/schema'
import { and, eq, ilike } from 'drizzle-orm'
import {
  validateWebhookSecret,
  extractWebhookEmail,
  extractNextBillingDate,
  N1coWebhookPayload,
} from '@/lib/n1co'
import { getPlanPrice, getPlanFeatures } from '@/core/plans'
import { createNotification } from '@/lib/notifications'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-n1co-secret')
  if (!validateWebhookSecret(secret)) {
    console.warn('[N1CO Webhook] Invalid secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let event: N1coWebhookPayload
  let rawBody: string
  try {
    rawBody = await req.text()
    event = JSON.parse(rawBody) as N1coWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, subscriptionId } = event

  if (!subscriptionId) {
    console.warn('[N1CO Webhook] Missing subscriptionId in payload')
    // Still log even malformed payloads
    void db.insert(n1coWebhookEvents).values({
      eventType:      type ?? 'UNKNOWN',
      subscriptionId: null,
      rawPayload:     event as Record<string, unknown>,
      httpStatus:     200,
    }).catch(() => {})
    return NextResponse.json({ received: true })
  }

  console.log(`[N1CO Webhook] ${type} — subscriptionId: ${subscriptionId}`)
  console.log('[N1CO Webhook] raw payload:', rawBody)

  // ── Persist raw payload to n1co_webhook_events ────────────────────────────
  // Fire-and-forget: don't let a logging failure block the main flow.
  void db.insert(n1coWebhookEvents).values({
    eventType:      type,
    subscriptionId: subscriptionId,
    rawPayload:     event as Record<string, unknown>,
    httpStatus:     200,
  }).catch((err) => console.error('[N1CO Webhook] Failed to log event to DB:', err))

  try {
    // Primary lookup: find subscription row by N1CO subscription ID
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.n1coSubscriptionId, subscriptionId),
    })

    const now = new Date()

    // ── Email-based fallback ──────────────────────────────────────────────────
    // Covers first-time SubscriptionConfirmation (no subscriptionId stored yet)
    // and any case where N1CO uses a different subscriptionId on renewals.
    if (!sub) {
      const email = extractWebhookEmail(event)
      if (email) {
        const matchedTenant = await db.query.tenants.findFirst({
          where: ilike(tenants.contactEmail, email),
        })
        if (matchedTenant) {
          sub = await db.query.subscriptions.findFirst({
            where: type === 'SubscriptionConfirmation'
              ? and(eq(subscriptions.tenantId, matchedTenant.id), eq(subscriptions.status, 'PENDING_PAYMENT'))
              : eq(subscriptions.tenantId, matchedTenant.id),
          })
          if (sub) {
            console.log(`[N1CO Webhook] ${type} — matched tenant ${matchedTenant.id} by email: ${email}`)
          }
        }
      }
      if (!sub) {
        console.warn(`[N1CO Webhook] ${type} — no match for subscriptionId: ${subscriptionId} or email`)
        return NextResponse.json({ received: true })
      }
    }

    // Fetch tenant for notification messages
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, sub.tenantId),
      columns: { id: true, name: true },
    })
    const tenantName = tenant?.name ?? 'Empresa desconocida'

    // ── Resolve next billing date ─────────────────────────────────────────────
    // Prefer N1CO's authoritative date; fall back to our local calculation.
    const n1coNextDate = extractNextBillingDate(event)

    switch (type) {
      case 'SubscriptionConfirmation': {
        // Determine plan: use pendingPlan if upgrading, otherwise current plan
        const activePlan = sub.pendingPlan ?? sub.plan

        // Use N1CO's next billing date if provided; otherwise calculate from now.
        const periodEnd = n1coNextDate ?? addDays(now, getPlanFeatures(activePlan).billingCycleDays)

        // lastPaymentAt: always update — SubscriptionConfirmation fires on both
        // first-time signup AND each recurring renewal charge.
        const paymentDate = event.timestamp ? new Date(event.timestamp) : now
        const amount = event.amount ?? getPlanPrice(activePlan)

        await db.update(subscriptions)
          .set({
            plan:               activePlan,
            n1coSubscriptionId: subscriptionId,
            status:             'ACTIVE',
            pendingPlan:        null,
            cancelledAt:        null,
            gracePeriodEndsAt:  null,
            currentPeriodStart: paymentDate,
            currentPeriodEnd:   periodEnd,
            lastPaymentAt:      paymentDate,
            lastPaymentAmount:  String(amount),
            updatedAt:          now,
          })
          .where(eq(subscriptions.id, sub.id))

        await db.update(tenants)
          .set({ plan: activePlan, status: 'ACTIVE', updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        console.log(
          `[N1CO Webhook] SubscriptionConfirmation — tenant ${sub.tenantId} activated/renewed, ` +
          `plan: ${activePlan}, periodEnd: ${periodEnd.toISOString()} ` +
          `(source: ${n1coNextDate ? 'N1CO payload' : 'calculated'})`
        )
        void createNotification({
          type: 'PAYMENT_RECEIVED',
          message: `Pago recibido de "${tenantName}" — $${amount} (${activePlan})`,
          link: `/admin/super/payments`,
          tenantId: sub.tenantId,
          tenantName,
          urgency: 'LOW',
        })
        break
      }

      case 'SubscriptionPayment': {
        const amount = event.amount ?? getPlanPrice(sub.plan)
        const paymentDate = event.timestamp ? new Date(event.timestamp) : now
        const periodEnd = n1coNextDate ?? addDays(paymentDate, getPlanFeatures(sub.plan).billingCycleDays)

        await db.update(subscriptions)
          .set({
            status:             'ACTIVE',
            cancelledAt:        null,
            gracePeriodEndsAt:  null,
            currentPeriodStart: paymentDate,
            currentPeriodEnd:   periodEnd,
            lastPaymentAt:      paymentDate,
            lastPaymentAmount:  String(amount),
            updatedAt:          now,
          })
          .where(eq(subscriptions.id, sub.id))

        await db.update(tenants)
          .set({ status: 'ACTIVE', updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        console.log(
          `[N1CO Webhook] SubscriptionPayment — tenant ${sub.tenantId}, amount: ${amount}, ` +
          `periodEnd: ${periodEnd.toISOString()} (source: ${n1coNextDate ? 'N1CO payload' : 'calculated'})`
        )
        void createNotification({
          type: 'PAYMENT_RECEIVED',
          message: `Pago recibido de "${tenantName}" — $${amount} (${sub.plan})`,
          link: `/admin/super/payments`,
          tenantId: sub.tenantId,
          tenantName,
          urgency: 'LOW',
        })
        break
      }

      case 'SubscriptionFailed': {
        await db.update(subscriptions)
          .set({
            status:            'PAST_DUE',
            gracePeriodEndsAt: addDays(now, 3),
            updatedAt:         now,
          })
          .where(eq(subscriptions.id, sub.id))

        console.warn(`[N1CO Webhook] SubscriptionFailed — tenant ${sub.tenantId} marked PAST_DUE`)
        void createNotification({
          type: 'PAYMENT_FAILED',
          message: `Pago fallido de "${tenantName}" — plan ${sub.plan}. Se otorgaron 3 días de gracia.`,
          link: `/admin/super/tenants`,
          tenantId: sub.tenantId,
          tenantName,
          urgency: 'HIGH',
        })
        break
      }

      case 'SubscriptionCancelled': {
        await db.update(subscriptions)
          .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
          .where(eq(subscriptions.id, sub.id))

        console.log(`[N1CO Webhook] SubscriptionCancelled — tenant ${sub.tenantId}`)
        break
      }

      default:
        console.log(`[N1CO Webhook] Unhandled event type: ${type}`)
    }
  } catch (err) {
    console.error('[N1CO Webhook] DB error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
