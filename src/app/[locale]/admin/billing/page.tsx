import { getSession, getEffectiveTenantId } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { tenants, subscriptions, platformConfig, subscriptionPlans } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import BillingClient from './BillingClient'
import { parsePlanPrices } from '@/core/plans'

export const dynamic = 'force-dynamic'

export default async function BillingPage({ params }: { params: { locale: string } }) {
  const session = await getSession()
  const locale = params.locale || 'es'

  if (!session || session.role === 'STAFF' || session.role === 'RECEPTIONIST') {
    redirect(`/${locale}/admin`)
  }

  const tenantId = getEffectiveTenantId(session)
  if (!tenantId) redirect(`/${locale}/admin`)

  const [tenant, subscription, cfg, dbPlans] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { plan: true, status: true, name: true },
    }),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    }),
    db.select().from(platformConfig).limit(1).then(r => r[0] ?? null),
    db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.sortOrder)),
  ])

  const planPrices = parsePlanPrices(cfg)

  return (
    <BillingClient
      tenantId={tenantId}
      plan={tenant?.plan ?? 'BASIC'}
      tenantStatus={tenant?.status ?? 'ACTIVE'}
      locale={locale}
      planPrices={planPrices}
      dbPlans={dbPlans}
      isOwner={session?.isOwner ?? session?.role === 'SUPER_ADMIN'}
      subscription={subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        cardLast4: subscription.cardLast4 ?? null,
        cardBrand: subscription.cardBrand ?? null,
        cardExpMonth: subscription.cardExpMonth ?? null,
        cardExpYear: subscription.cardExpYear ?? null,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
        gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
        lastPaymentAt: subscription.lastPaymentAt?.toISOString() ?? null,
        lastPaymentAmount: subscription.lastPaymentAmount ?? null,
        pendingPlan: subscription.pendingPlan ?? null,
      } : null}
    />
  )
}
