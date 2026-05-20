import { redirect } from 'next/navigation';

/**
 * The advanced analytics feature now lives inside the Dashboard
 * as a second tab ("Analítica avanzada"). This route redirects
 * any direct link to the dashboard.
 */
export default async function AnalyticsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/admin`);
}
