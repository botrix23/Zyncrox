import { getSession, getEffectiveTenantId } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { tenants, subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import BillingClient from './BillingClient'

export default async function BillingPage({ params }: { params: { locale: string } }) {
  const session = await getSession()
  const locale = params.locale || 'es'

  if (!session || session.role === 'STAFF') {
    redirect(`/${locale}/admin`)
  }

  const tenantId = getEffectiveTenantId(session)
  if (!tenantId) redirect(`/${locale}/admin`)

  const [tenant, subscription] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { plan: true, status: true, name: true },
    }),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    }),
  ])

  return (
    <BillingClient
      tenantId={tenantId}
      plan={tenant?.plan ?? 'BASIC'}
      tenantStatus={tenant?.status ?? 'ACTIVE'}
      locale={locale}
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
      } : null}
    />
  )
}
