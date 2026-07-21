/**
 * N1CO Webhook Handler
 *
 * N1CO fires events when subscriptions are confirmed, renewed, failed, or cancelled.
 * This route updates the local DB so the app reflects the real billing state.
 *
 * Auth: N1CO signs the raw body with HMAC-SHA256 (key = N1CO_WEBHOOK_SECRET,
 *       the secret generated in the N1CO Business portal) and sends the
 *       signature in the `X-H4B-Hmac-Sha256` header. See validateWebhookSignature.
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
import { subscriptions, tenants, n1coWebhookEvents, subscriptionPlans } from '@/db/schema'
import { and, eq, ilike } from 'drizzle-orm'
import {
  validateWebhookSignature,
  extractWebhookEmail,
  extractNextBillingDate,
  extractPeriodStart,
  extractAmount,
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
  // Read body FIRST so every attempt gets logged to the DB, even rejected ones.
  // Vercel log retention is too short to debug webhooks that fire every 2 days.
  let event: N1coWebhookPayload
  let rawBody: string
  try {
    rawBody = await req.text()
    event = JSON.parse(rawBody) as N1coWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mask = (v: string | null | undefined) =>
    v ? `${v.slice(0, 4)}…${v.slice(-4)} (len ${v.length})` : 'null'

  // Validate webhook HMAC signature.
  // N1CO signs the raw body with HMAC-SHA256 and sends it in X-H4B-Hmac-Sha256.
  const signature = req.headers.get('x-h4b-hmac-sha256')
  if (!validateWebhookSignature(rawBody, signature)) {
    const headerNames = Array.from(req.headers.keys()).join(', ')
    const diagnostics = {
      _rejected: 'invalid_signature',
      _receivedSignature: mask(signature),
      _secretConfigured: process.env.N1CO_WEBHOOK_SECRET ? 'yes' : 'no',
      _headers: headerNames,
    }
    console.warn(`[N1CO Webhook] Invalid signature —`, JSON.stringify(diagnostics))
    // Persist the rejected attempt (payload + secret diagnostics) for later review
    void db.insert(n1coWebhookEvents).values({
      eventType:      `REJECTED_401:${event.type ?? 'UNKNOWN'}`,
      subscriptionId: event.subscriptionId ?? null,
      rawPayload:     { ...event, ...diagnostics } as Record<string, unknown>,
      httpStatus:     401,
    }).catch((err) => console.error('[N1CO Webhook] Failed to log rejected event:', err))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    // ── Resolve billing dates and amount from the N1CO payload ────────────────
    // Needed both for matching (plan/price preference) and the updates below.
    // N1CO puts all of these inside metadata.* (see helpers in lib/n1co.ts).
    const n1coNextDate    = extractNextBillingDate(event)
    const n1coPeriodStart = extractPeriodStart(event)
    const n1coAmount      = extractAmount(event)

    const now = new Date()

    // ── Match the local subscription this event belongs to ────────────────────
    // 1) Primary: by N1CO subscription ID. Reliable for every recurring event
    //    once the first payment has linked the ID onto the row.
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.n1coSubscriptionId, subscriptionId),
    })

    // 2) Email fallback — first-time linking only. We ONLY attach to a
    //    subscription that is AWAITING payment (PENDING_PAYMENT) and is not
    //    already linked to a *different* N1CO subscription. This guarantees a
    //    payment can never hijack another tenant's active subscription, even
    //    when the same email is shared across several (test) tenants.
    //    If nothing safe matches, we log and skip instead of guessing.
    if (!sub) {
      const email = extractWebhookEmail(event)

      const pending = await db
        .select({
          id:                 subscriptions.id,
          tenantId:           subscriptions.tenantId,
          plan:               subscriptions.plan,
          pendingPlan:        subscriptions.pendingPlan,
          n1coSubscriptionId: subscriptions.n1coSubscriptionId,
          updatedAt:          subscriptions.updatedAt,
          contactEmail:       tenants.contactEmail,
        })
        .from(subscriptions)
        .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
        .where(eq(subscriptions.status, 'PENDING_PAYMENT'))

      // Never attach to a row already tied to a *different* N1CO subscription.
      const safe = pending.filter(
        (c) => !c.n1coSubscriptionId || c.n1coSubscriptionId === subscriptionId,
      )

      // Plan prices come from the DB plans table — the same source used to build
      // the N1CO checkout links — falling back to the code constants.
      const dbPlans = await db
        .select({ slug: subscriptionPlans.slug, price: subscriptionPlans.price })
        .from(subscriptionPlans)
      const priceOf = (slug: string): number => {
        const row = dbPlans.find((p) => p.slug === slug)
        const parsed = row ? parseFloat(row.price) : NaN
        return Number.isNaN(parsed) ? getPlanPrice(slug) : parsed
      }

      // Anchor on the AMOUNT: only a subscription awaiting payment for a plan
      // priced exactly at what N1CO just charged can be the right one.
      const candidates = n1coAmount != null
        ? safe.filter((c) => priceOf(c.pendingPlan ?? c.plan) === n1coAmount)
        : []

      // Email only breaks ties between otherwise-equal candidates.
      const emailMatches = (c: (typeof safe)[number]) =>
        Boolean(email && c.contactEmail && c.contactEmail.toLowerCase() === email.toLowerCase())

      candidates.sort((a, b) => {
        const d = (emailMatches(b) ? 1 : 0) - (emailMatches(a) ? 1 : 0)
        if (d !== 0) return d
        return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
      })

      if (candidates.length > 0) {
        const picked = candidates[0]
        sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.id, picked.id),
        })
        console.log(
          `[N1CO Webhook] ${type} — linked subscription ${picked.id} (tenant ${picked.tenantId}, ` +
          `plan ${picked.pendingPlan ?? picked.plan}) by amount $${n1coAmount}` +
          `${emailMatches(picked) ? ' + email match' : ''}` +
          `${candidates.length > 1 ? ` — ${candidates.length} candidates, picked most recent` : ''}`
        )
      }

      if (!sub) {
        console.warn(
          `[N1CO Webhook] ${type} — no PENDING_PAYMENT subscription priced at $${n1coAmount ?? '?'} ` +
          `for N1CO subscription ${subscriptionId} (buyer: ${email ?? 'unknown'}). ` +
          `Skipping to avoid mis-assignment (event stored in n1co_webhook_events).`
        )
        return NextResponse.json({ received: true, matched: false })
      }
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

        // Period end: prefer N1CO's SubscriptionEndDate, fall back to calculation
        const periodEnd = n1coNextDate ?? addDays(now, getPlanFeatures(activePlan).billingCycleDays)

        // Period start: prefer N1CO's SubscriptionStartDate, fall back to now
        const paymentDate = n1coPeriodStart ?? (event.timestamp ? new Date(event.timestamp) : now)

        // Amount: prefer N1CO's SubscriptionPrice, fall back to plan default
        const amount = n1coAmount ?? getPlanPrice(activePlan)

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
          `plan: ${activePlan}, periodStart: ${paymentDate.toISOString()}, ` +
          `periodEnd: ${periodEnd.toISOString()} ` +
          `(source: ${n1coNextDate ? 'N1CO metadata.SubscriptionEndDate' : 'calculated'})`
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
        const amount = n1coAmount ?? getPlanPrice(sub.plan)
        const paymentDate = n1coPeriodStart ?? (event.timestamp ? new Date(event.timestamp) : now)
        const periodEnd = n1coNextDate ?? addDays(paymentDate, getPlanFeatures(sub.plan).billingCycleDays)

        // If the tenant already cancelled, N1CO charged despite the cancellation
        // (we can't stop N1CO's recurring charge from our side — it must be
        // cancelled in panel.n1co.com). Record the payment for audit but DO NOT
        // reactivate: keep status CANCELLED so the app respects the user's intent.
        if (sub.status === 'CANCELLED') {
          await db.update(subscriptions)
            .set({
              n1coSubscriptionId: subscriptionId,
              lastPaymentAt:      paymentDate,
              lastPaymentAmount:  String(amount),
              // They paid, so extend access through the paid period, but stay cancelled.
              currentPeriodEnd:   periodEnd,
              updatedAt:          now,
            })
            .where(eq(subscriptions.id, sub.id))

          console.warn(
            `[N1CO Webhook] SubscriptionPayment on CANCELLED sub — tenant ${sub.tenantId} ` +
            `charged $${amount} despite cancellation. Kept CANCELLED; recorded payment. ` +
            `N1CO subscription must be cancelled in panel.n1co.com.`
          )
          void createNotification({
            type: 'PAYMENT_RECEIVED',
            message: `⚠️ N1CO cobró $${amount} a "${tenantName}" pese a estar CANCELADA. Cancelar en panel.n1co.com.`,
            link: `/admin/super/payments`,
            tenantId: sub.tenantId,
            tenantName,
            urgency: 'HIGH',
          })
          break
        }

        await db.update(subscriptions)
          .set({
            // Self-heal the link so every future event matches by ID, not email.
            n1coSubscriptionId: subscriptionId,
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
          `periodEnd: ${periodEnd.toISOString()} (source: ${n1coNextDate ? 'N1CO metadata.SubscriptionEndDate' : 'calculated'})`
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
        // Idempotent: we may have already cancelled via the N1CO API from the
        // billing page. Keep the original cancelledAt so the customer-facing
        // date doesn't jump when N1CO's confirmation webhook lands afterwards.
        await db.update(subscriptions)
          .set({ status: 'CANCELLED', cancelledAt: sub.cancelledAt ?? now, updatedAt: now })
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
