import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { chargeWithToken } from '@/lib/n1co'
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
  let charged = 0
  let failed = 0
  let suspended = 0

  try {
    const dueSubscriptions = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'ACTIVE'),
        isNull(subscriptions.cancelledAt),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    })

    for (const sub of dueSubscriptions) {
      if (!sub.cardToken) {
        await db.update(subscriptions)
          .set({
            status: 'PAST_DUE',
            gracePeriodEndsAt: addDays(now, 3),
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id))
        console.log(`[Billing Cron] No card token for tenant ${sub.tenantId} — marked PAST_DUE`)
        failed++
        continue
      }

      try {
        const amount = getPlanPrice(sub.plan)
        const charge = await chargeWithToken(sub.cardToken, amount, `Renovación ${sub.plan}`)

        if (charge.success) {
          await db.update(subscriptions)
            .set({
              currentPeriodStart: now,
              currentPeriodEnd: addDays(now, 30),
              lastPaymentAt: now,
              lastPaymentAmount: String(amount),
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id))
          charged++
        } else {
          await db.update(subscriptions)
            .set({
              status: 'PAST_DUE',
              gracePeriodEndsAt: addDays(now, 3),
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id))
          console.log(`[Billing Cron] Charge failed for tenant ${sub.tenantId}: ${charge.errorMessage}`)
          failed++
        }
      } catch (err) {
        await db.update(subscriptions)
          .set({
            status: 'PAST_DUE',
            gracePeriodEndsAt: addDays(now, 3),
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id))
        console.error(`[Billing Cron] Error charging tenant ${sub.tenantId}:`, err)
        failed++
      }
    }

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
    }

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
    }

    return NextResponse.json({ ok: true, charged, failed, suspended })
  } catch (error) {
    console.error('[Billing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
