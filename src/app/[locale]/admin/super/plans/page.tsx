import { getSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { subscriptionPlans } from '@/db/schema'
import { asc } from 'drizzle-orm'
import PlansClient from './PlansClient'

export const dynamic = 'force-dynamic'

export default async function SuperPlansPage({ params }: { params: { locale: string } }) {
  const session = await getSession()
  const locale = params.locale || 'es'

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect(`/${locale}/admin`)
  }

  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder))

  return <PlansClient plans={plans} />
}
