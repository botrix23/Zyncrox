import { getSession } from "@/lib/auth-session";
import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { redirect } from "next/navigation";
import PaymentsTabsClient from "./PaymentsTabsClient";
import { parsePlanPrices } from "@/core/plans";
import {
  getPlatformTransactionsAction,
  getPlatformRevenueStatsAction,
} from "@/app/actions/superAdmin";

export const dynamic = 'force-dynamic';

export default async function SuperPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.role !== "SUPER_ADMIN") {
    redirect(`/${locale}/admin/login`);
  }

  const [config, initialTransactions, revenueStats] = await Promise.all([
    db.select().from(platformConfig).limit(1).then((rows) => rows[0] ?? null),
    getPlatformTransactionsAction({}),
    getPlatformRevenueStatsAction(),
  ]);

  const planPrices = parsePlanPrices(config);

  return (
    <PaymentsTabsClient
      config={
        config ?? {
          wompiAppId: null,
          wompiApiSecret: null,
          wompiIsProduction: false,
        }
      }
      planPrices={planPrices}
      initialTransactions={initialTransactions}
      mrr={revenueStats.mrr}
      revenueThisMonth={revenueStats.revenueThisMonth}
      revenuePrevMonth={revenueStats.revenuePrevMonth}
      growth={revenueStats.growth}
      revenueByMonth={revenueStats.revenueByMonth}
      locale={locale}
    />
  );
}
