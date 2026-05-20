import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { tenants, branches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canUseFeature } from '@/core/plans';
import { AnalyticsUpgradeWall } from './AnalyticsUpgradeWall';
import { AnalyticsClient } from './AnalyticsClient';
import { getStaffPerformanceData } from '@/app/actions/analytics';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export default async function AnalyticsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const session = await getSession();

  // Auth guard
  if (!session) redirect(`/${locale}/admin/login`);
  if (session.role === 'STAFF') redirect(`/${locale}/admin/bookings`);
  if (session.role === 'SUPER_ADMIN' && !session.impersonatedTenantId) {
    redirect(`/${locale}/admin/super`);
  }

  // Resolve tenantId + plan
  const tenantId =
    session.role === 'SUPER_ADMIN'
      ? session.impersonatedTenantId!
      : session.tenantId!;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { plan: true },
  });
  const tenantPlan = tenant?.plan ?? null;

  // Feature gate → show upgrade wall for Basic/Professional
  if (!canUseFeature(tenantPlan, 'advancedAnalytics')) {
    return <AnalyticsUpgradeWall />;
  }

  // Default range: last 30 days
  const now = new Date();
  const defaultFrom = format(startOfDay(subDays(now, 29)), 'yyyy-MM-dd');
  const defaultTo = format(endOfDay(now), 'yyyy-MM-dd');

  // Initial data load
  const result = await getStaffPerformanceData(defaultFrom, defaultTo, null);
  const initialData = result.ok ? result.data : null;

  return (
    <AnalyticsClient
      initialData={initialData}
      defaultFrom={defaultFrom}
      defaultTo={defaultTo}
      locale={locale}
    />
  );
}
