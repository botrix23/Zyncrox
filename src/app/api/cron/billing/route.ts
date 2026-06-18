/**
 * Billing Cron — runs daily via Vercel Cron or external scheduler.
 *
 * NOTE: With N1CO subscription links, recurring charges are handled entirely
 * by N1CO and reported back via webhooks (/api/webhooks/n1co).
 * This cron enforces local state transitions:
 *   1. PAST_DUE (grace expired)      → suspend tenant
 *   2. CANCELLED (period ended)      → suspend tenant
 *   3. pendingPlan (period ended)    → apply scheduled downgrade (DB only)
 *
 * Downgrades do NOT create new N1CO subscriptions — the customer was already
 * on a lower plan link and N1CO manages the recurring charge independently.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { and, eq, isNotNull, lte, ne } from 'drizzle-orm'
import { enforceDowngradeLimits } from '@/lib/billing'
import { getPlanPrice } from '@/core/plans'

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

    // 3. Scheduled downgrades whose period has ended → apply now (DB only)
    // N1CO charges are managed by the customer's existing subscription link —
    // no new N1CO subscription needs to be created.
    const pendingDowngrades = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'ACTIVE'),
        isNotNull(subscriptions.pendingPlan),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    })

    for (const sub of pendingDowngrades) {
      const newPlan = sub.pendingPlan!
      console.log(`[Billing Cron] Applying pending downgrade: tenant ${sub.tenantId} ${sub.plan} → ${newPlan}`)

      try {
        const newPeriodEnd = addDays(now, 30)

        await db.update(subscriptions)
          .set({
            plan:               newPlan,
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

        // Enforce plan limits (deactivate excess records)
        await enforceDowngradeLimits(sub.tenantId, newPlan)

        downgrades++
        console.log(`[Billing Cron] Downgrade applied: tenant ${sub.tenantId} → ${newPlan}`)
      } catch (err) {
        console.error(`[Billing Cron] Failed to apply pending downgrade for ${sub.tenantId}:`, err)
      }
    }

    // 4. Re-enforce plan limits on all active tenants (idempotent).
    // Catches cases where code-level limits changed without a plan change event.
    const allActiveTenants = await db
      .select({ id: tenants.id, plan: tenants.plan })
      .from(tenants)
      .where(ne(tenants.status, 'SUSPENDED'))

    let reEnforced = 0
    for (const tenant of allActiveTenants) {
      try {
        await enforceDowngradeLimits(tenant.id, tenant.plan)
        reEnforced++
      } catch (err) {
        console.warn(`[Billing Cron] enforceDowngradeLimits failed for ${tenant.id}:`, err)
      }
    }
    console.log(`[Billing Cron] Re-enforced limits for ${reEnforced} tenants`)

    return NextResponse.json({ ok: true, suspended, downgrades, reEnforced })
  } catch (error) {
    console.error('[Billing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
