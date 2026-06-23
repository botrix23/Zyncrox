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
 *   SubscriptionConfirmation  — subscription was created/activated
 *   SubscriptionPayment       — recurring payment succeeded
 *   SubscriptionFailed        — payment failed (move to PAST_DUE)
 *   SubscriptionCancelled     — subscription was cancelled in N1CO
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { and, eq, ilike } from 'drizzle-orm'
import { validateWebhookSecret, extractWebhookEmail, N1coWebhookPayload } from '@/lib/n1co'
import { getPlanPrice } from '@/core/plans'
import { createNotification } from '@/lib/notifications'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-n1co-secret')
  const expected = process.env.N1CO_WEBHOOK_SECRET
  console.log(`[N1CO Webhook Debug] received prefix: "${secret?.substring(0, 6)}" expected prefix: "${expected?.substring(0, 6)}"`)
  if (!validateWebhookSecret(secret)) {
    console.warn('[N1CO Webhook] Invalid secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let event: N1coWebhookPayload
  try {
    const body = await req.text()
    event = JSON.parse(body) as N1coWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, subscriptionId } = event

  if (!subscriptionId) {
    console.warn('[N1CO Webhook] Missing subscriptionId in payload')
    return NextResponse.json({ received: true })
  }

  console.log(`[N1CO Webhook] ${type} — subscriptionId: ${subscriptionId}`)

  try {
    // Primary lookup: find subscription row by N1CO subscription ID
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.n1coSubscriptionId, subscriptionId),
    })

    const now = new Date()

    // --------------------------------------------------------------------------
    // SubscriptionConfirmation: if no row matched by subscriptionId,
    // this is likely a brand-new subscriber — try email-based matching
    // --------------------------------------------------------------------------
    if (type === 'SubscriptionConfirmation' && !sub) {
      const email = extractWebhookEmail(event)
      if (email) {
        // Find tenant by contact email (case-insensitive)
        const matchedTenant = await db.query.tenants.findFirst({
          where: ilike(tenants.contactEmail, email),
        })
        if (matchedTenant) {
          sub = await db.query.subscriptions.findFirst({
            where: and(
              eq(subscriptions.tenantId, matchedTenant.id),
              eq(subscriptions.status, 'PENDING_PAYMENT'),
            ),
          })
          if (sub) {
            console.log(`[N1CO Webhook] SubscriptionConfirmation — matched tenant ${matchedTenant.id} by email: ${email}`)
          }
        }
      }
      if (!sub) {
        console.warn(`[N1CO Webhook] SubscriptionConfirmation — no match for subscriptionId: ${subscriptionId} or email`)
        return NextResponse.json({ received: true })
      }
    }

    if (!sub) {
      console.warn(`[N1CO Webhook] No local subscription found for n1coSubscriptionId: ${subscriptionId}`)
      return NextResponse.json({ received: true })
    }

    // Fetch tenant for notification messages
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, sub.tenantId),
      columns: { id: true, name: true },
    })
    const tenantName = tenant?.name ?? 'Empresa desconocida'

    switch (type) {
      case 'SubscriptionConfirmation': {
        // Determine plan: use pendingPlan if upgrading, otherwise current plan
        const activePlan = sub.pendingPlan ?? sub.plan

        await db.update(subscriptions)
          .set({
            plan:               activePlan,
            n1coSubscriptionId: subscriptionId,   // store for all future webhook matching
            status:             'ACTIVE',
            pendingPlan:        null,
            cancelledAt:        null,
            gracePeriodEndsAt:  null,
            currentPeriodStart: now,
            currentPeriodEnd:   addDays(now, 30),
            updatedAt:          now,
          })
          .where(eq(subscriptions.id, sub.id))

        await db.update(tenants)
          .set({ plan: activePlan, status: 'ACTIVE', updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        console.log(`[N1CO Webhook] SubscriptionConfirmation — tenant ${sub.tenantId} activated, plan: ${activePlan}`)
        break
      }

      case 'SubscriptionPayment': {
        const amount = event.amount ?? getPlanPrice(sub.plan)

        await db.update(subscriptions)
          .set({
            status:             'ACTIVE',
            cancelledAt:        null,
            gracePeriodEndsAt:  null,
            currentPeriodStart: now,
            currentPeriodEnd:   addDays(now, 30),
            lastPaymentAt:      now,
            lastPaymentAmount:  String(amount),
            updatedAt:          now,
          })
          .where(eq(subscriptions.id, sub.id))

        await db.update(tenants)
          .set({ status: 'ACTIVE', updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        console.log(`[N1CO Webhook] SubscriptionPayment — tenant ${sub.tenantId}, amount: ${amount}`)
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
        // Payment failed — give a 3-day grace period before suspending
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
