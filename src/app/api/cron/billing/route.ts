/**
 * Billing Cron — runs daily via Vercel Cron or external scheduler.
 *
 * NOTE: With N1CO subscriptions, recurring charges are handled entirely
 * by N1CO and reported back via webhooks (/api/webhooks/n1co).
 * This cron enforces local state transitions:
 *   1. PAST_DUE (grace expired)      → suspend tenant
 *   2. CANCELLED (period ended)      → suspend tenant
 *   3. pendingPlan (period ended)    → apply scheduled downgrade
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { and, eq, isNotNull, lte } from 'drizzle-orm'
import { cancelN1coSubscription, createN1coSubscription, N1CO_PLAN_IDS } from '@/lib/n1co'
import { enforceDowngradeLimits } from '@/lib/billing'
import { getPlanPrice } from '@/core/plans'

const LOCATION_CODE = process.env.N1CO_LOCATION_CODE ?? ''

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let suspended = 0
  let downgrades = 0

  try {
    // 1. Tenants in PAST_DUE whose grace period has expired → SUSPENDED
    const pastDueExpired = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'PAST_DUE'),
        lte(subscriptions.gracePeriodEndsAt, now),
      ),
    })

    for (const sub of pastDueExpired) {
      await db.update(tenants)
        .set({ status: 'SUSPENDED', updatedAt: now })
        .where(eq(tenants.id, sub.tenantId))
      suspended++
      console.log(`[Billing Cron] Suspended tenant ${sub.tenantId} (grace period expired)`)
    }

    // 2. Tenants CANCELLED whose period has ended → SUSPENDED
    const cancelledExpired = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'CANCELLED'),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    })

    for (const sub of cancelledExpired) {
      await db.update(tenants)
        .set({ status: 'SUSPENDED', updatedAt: now })
        .where(eq(tenants.id, sub.tenantId))
      suspended++
      console.log(`[Billing Cron] Suspended tenant ${sub.tenantId} (cancelled, period ended)`)
    }

    // 3. Scheduled downgrades whose period has ended → apply now
    const pendingDowngrades = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'ACTIVE'),
        isNotNull(subscriptions.pendingPlan),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    })

    for (const sub of pendingDowngrades) {
      const newPlan = sub.pendingPlan!
      const currentPlanName = sub.plan
      console.log(`[Billing Cron] Applying pending downgrade: tenant ${sub.tenantId} ${currentPlanName} → ${newPlan}`)

      try {
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, sub.tenantId),
        })

        if (!tenant || !sub.n1coPaymentMethodId) {
          console.error(`[Billing Cron] Missing tenant or payment method for ${sub.tenantId}`)
          continue
        }

        // Cancel current N1CO subscription
        if (sub.n1coSubscriptionId) {
          try {
            await cancelN1coSubscription(sub.n1coSubscriptionId, `Scheduled downgrade to ${newPlan}`)
          } catch (err) {
            console.warn(`[Billing Cron] Could not cancel N1CO sub for ${sub.tenantId}:`, err)
          }
        }

        // Create new N1CO subscription with the downgraded plan
        const planKey = newPlan as keyof typeof N1CO_PLAN_IDS
        const n1coSub = await createN1coSubscription({
          planId:          N1CO_PLAN_IDS[planKey] ?? '',
          locationCode:    LOCATION_CODE,
          paymentMethodId: sub.n1coPaymentMethodId,
          customerId:      sub.tenantId,
          customerName:    tenant.name,
          customerEmail:   tenant.contactEmail ?? '',
        })

        const newPeriodEnd = addDays(now, 30)

        await db.update(subscriptions)
          .set({
            plan:               newPlan,
            n1coSubscriptionId: n1coSub.subscriptionId,
            currentPeriodStart: now,
            currentPeriodEnd:   newPeriodEnd,
            pendingPlan:        null,
            lastPaymentAt:      now,
            lastPaymentAmount:  String(getPlanPrice(newPlan)),
            updatedAt:          now,
          })
          .where(eq(subscriptions.tenantId, sub.tenantId))

        await db.update(tenants)
          .set({ plan: newPlan, updatedAt: now })
          .where(eq(tenants.id, sub.tenantId))

        // Apply plan limits (deactivate excess records)
        if (newPlan === 'BASIC') {
          await db.update(tenants)
            .set({ heroSubtitle: null, theme: 'light', emailBodyTemplate: null, updatedAt: now })
            .where(eq(tenants.id, sub.tenantId))
        }
        await enforceDowngradeLimits(sub.tenantId, newPlan)

        downgrades++
        console.log(`[Billing Cron] Downgrade applied: tenant ${sub.tenantId} → ${newPlan}`)
      } catch (err) {
        console.error(`[Billing Cron] Failed to apply pending downgrade for ${sub.tenantId}:`, err)
      }
    }

    return NextResponse.json({ ok: true, suspended, downgrades })
  } catch (error) {
    console.error('[Billing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
