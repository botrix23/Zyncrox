/**
 * N1CO Webhook Handler
 *
 * N1CO fires events when subscriptions are confirmed, renewed, failed, or cancelled.
 * This route updates the local DB so the app reflects the real billing state.
 *
 * Header: x-n1co-secret  (compared against N1CO_WEBHOOK_SECRET env var)
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
import { eq } from 'drizzle-orm'
import { validateWebhookSecret, N1coWebhookPayload } from '@/lib/n1co'
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
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.n1coSubscriptionId, subscriptionId),
    })

    if (!sub) {
      console.warn(`[N1CO Webhook] No local subscription found for n1coSubscriptionId: ${subscriptionId}`)
      // Still return 200 to prevent N1CO retries for unknown subscriptions
      return NextResponse.json({ received: true })
    }

    const now = new Date()

    // Fetch tenant name for notification messages
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, sub.tenantId),
      columns: { id: true, name: true },
    })
    const tenantName = tenant?.name ?? 'Empresa desconocida'

    switch (type) {
      case 'SubscriptionConfirmation': {
        // Subscription activated — ensure DB reflects ACTIVE state
        await db.update(subscriptions)
          .set({
            status:             'ACTIVE',
            cancelledAt:        null,
            gracePeriodEndsAt:  null,
            currentPeriodStart: now,
            currentPeriodEnd:   addDays(now, 30),
            updatedAt:          now,
          })
          .where(eq(subscriptions.id, sub.id))

        await db.update(tenants)
          .set({ status: 'ACTIVE', updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        console.log(`[N1CO Webhook] SubscriptionConfirmation — tenant ${sub.tenantId} activated`)
        break
      }

      case 'SubscriptionPayment': {
        // Recurring payment succeeded — extend period
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
        // N1CO cancelled (could be by us or by N1CO side)
        await db.update(subscriptions)
          .set({
            status:     'CANCELLED',
            cancelledAt: now,
            updatedAt:  now,
          })
          .where(eq(subscriptions.id, sub.id))

        console.log(`[N1CO Webhook] SubscriptionCancelled — tenant ${sub.tenantId}`)
        break
      }

      default:
        console.log(`[N1CO Webhook] Unhandled event type: ${type}`)
    }
  } catch (err) {
    console.error('[N1CO Webhook] DB error:', err)
    // Return 500 so N1CO retries (except unknown subscriptions handled above)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
