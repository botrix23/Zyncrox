'use server';

import { db } from '@/db';
import { clientLoyalty, loyaltyPointsTransactions, loyaltyRewards, tenants } from '@/db/schema';
import { eq, and, gte, lte, gt, sql, desc, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { startOfMonth, endOfMonth, addDays, subMonths, format, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface LoyaltyTopClient {
  clientEmail: string;
  clientName: string;
  balance: number;
  earnedInPeriod: number;
  redeemCount: number;
  lastRedeem: Date | null;
}

export interface LoyaltyTopReward {
  rewardId: string;
  rewardName: string;
  redeemCount: number;
  totalPointsUsed: number;
}

export interface LoyaltyMonthlyPoint {
  month: string; // e.g. "2026-01"
  earned: number;
  redeemed: number;
}

export interface LoyaltyAnalyticsResult {
  activeClientsCount: number;
  pointsIssuedThisMonth: number;
  redeemsThisMonth: number;
  expiringClientsCount: number;
  expiringPointsTotal: number;
  topClients: LoyaltyTopClient[];
  topRewards: LoyaltyTopReward[];
  monthlyChart: LoyaltyMonthlyPoint[];
}

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };

export async function getLoyaltyAnalyticsData(from: string, to: string): Promise<Ok<LoyaltyAnalyticsResult> | Err> {
  try {
    const session = await getSession();
    const tenantId = session?.role === 'SUPER_ADMIN' && session?.impersonatedTenantId
      ? session.impersonatedTenantId
      : session?.tenantId;
    if (!tenantId) return { ok: false, error: 'Unauthorized' };

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { plan: true, pointsEnabled: true, pointsExpireEnabled: true, pointsExpireMonths: true, timezone: true },
    });
    if (!tenant || tenant.plan !== 'ENTERPRISE' || !tenant.pointsEnabled) {
      return { ok: false, error: 'Not available for this plan' };
    }

    const tz = tenant.timezone ?? 'America/El_Salvador';
    const now = new Date();
    const nowInTz = toZonedTime(now, tz);
    const fromDate = fromZonedTime(startOfDay(toZonedTime(new Date(from), tz)), tz);
    const toDate = fromZonedTime(endOfDay(toZonedTime(new Date(to), tz)), tz);
    const monthStart = fromZonedTime(startOfMonth(nowInTz), tz);
    const monthEnd = fromZonedTime(endOfMonth(nowInTz), tz);

    // 1. Active clients with points
    const activeClientsRows = await db.select({ count: sql<number>`count(*)` })
      .from(clientLoyalty)
      .where(and(eq(clientLoyalty.tenantId, tenantId), gt(clientLoyalty.loyaltyPointsBalance, 0)));
    const activeClientsCount = Number(activeClientsRows[0]?.count ?? 0);

    // 2. Points issued this month (EARNED)
    const earnedThisMonth = await db.select({ total: sql<number>`coalesce(sum(points), 0)` })
      .from(loyaltyPointsTransactions)
      .where(and(
        eq(loyaltyPointsTransactions.tenantId, tenantId),
        eq(loyaltyPointsTransactions.type, 'EARNED'),
        gte(loyaltyPointsTransactions.createdAt, monthStart),
        lte(loyaltyPointsTransactions.createdAt, monthEnd),
      ));
    const pointsIssuedThisMonth = Number(earnedThisMonth[0]?.total ?? 0);

    // 3. Redeems this month (REDEEMED transactions count)
    const redeemedThisMonth = await db.select({ count: sql<number>`count(*)` })
      .from(loyaltyPointsTransactions)
      .where(and(
        eq(loyaltyPointsTransactions.tenantId, tenantId),
        eq(loyaltyPointsTransactions.type, 'REDEEMED'),
        gte(loyaltyPointsTransactions.createdAt, monthStart),
        lte(loyaltyPointsTransactions.createdAt, monthEnd),
      ));
    const redeemsThisMonth = Number(redeemedThisMonth[0]?.count ?? 0);

    // 4. Points expiring in 30 days
    let expiringClientsCount = 0;
    let expiringPointsTotal = 0;
    if (tenant.pointsExpireEnabled && tenant.pointsExpireMonths) {
      const expiryThreshold = addDays(now, 30);
      const activityCutoff = subMonths(expiryThreshold, tenant.pointsExpireMonths);
      const expiringRows = await db.select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(loyalty_points_balance), 0)`,
      })
        .from(clientLoyalty)
        .where(and(
          eq(clientLoyalty.tenantId, tenantId),
          gt(clientLoyalty.loyaltyPointsBalance, 0),
          lte(clientLoyalty.loyaltyPointsLastActivity, activityCutoff),
        ));
      expiringClientsCount = Number(expiringRows[0]?.count ?? 0);
      expiringPointsTotal = Number(expiringRows[0]?.total ?? 0);
    }

    // 5. Top clients by balance (max 20)
    const topClientsRaw = await db.select({
      clientEmail: clientLoyalty.clientEmail,
      clientName: clientLoyalty.clientName,
      balance: clientLoyalty.loyaltyPointsBalance,
    })
      .from(clientLoyalty)
      .where(and(eq(clientLoyalty.tenantId, tenantId), gt(clientLoyalty.loyaltyPointsBalance, 0)))
      .orderBy(desc(clientLoyalty.loyaltyPointsBalance))
      .limit(20);

    // For each top client get period earned and redeem count
    const topClients: LoyaltyTopClient[] = await Promise.all(topClientsRaw.map(async (c) => {
      const [earnedRow, redeemRow, lastRedeemRow] = await Promise.all([
        db.select({ total: sql<number>`coalesce(sum(points), 0)` })
          .from(loyaltyPointsTransactions)
          .where(and(
            eq(loyaltyPointsTransactions.tenantId, tenantId),
            eq(loyaltyPointsTransactions.clientEmail, c.clientEmail),
            eq(loyaltyPointsTransactions.type, 'EARNED'),
            gte(loyaltyPointsTransactions.createdAt, fromDate),
            lte(loyaltyPointsTransactions.createdAt, toDate),
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(loyaltyPointsTransactions)
          .where(and(
            eq(loyaltyPointsTransactions.tenantId, tenantId),
            eq(loyaltyPointsTransactions.clientEmail, c.clientEmail),
            eq(loyaltyPointsTransactions.type, 'REDEEMED'),
          )),
        db.select({ createdAt: loyaltyPointsTransactions.createdAt })
          .from(loyaltyPointsTransactions)
          .where(and(
            eq(loyaltyPointsTransactions.tenantId, tenantId),
            eq(loyaltyPointsTransactions.clientEmail, c.clientEmail),
            eq(loyaltyPointsTransactions.type, 'REDEEMED'),
          ))
          .orderBy(desc(loyaltyPointsTransactions.createdAt))
          .limit(1),
      ]);
      return {
        clientEmail: c.clientEmail,
        clientName: c.clientName,
        balance: c.balance,
        earnedInPeriod: Number(earnedRow[0]?.total ?? 0),
        redeemCount: Number(redeemRow[0]?.count ?? 0),
        lastRedeem: lastRedeemRow[0]?.createdAt ?? null,
      };
    }));

    // 6. Top rewards by redeems
    const topRewardsRaw = await db.select({
      rewardId: loyaltyPointsTransactions.rewardId,
      count: sql<number>`count(*)`,
      totalPoints: sql<number>`coalesce(sum(abs(points)), 0)`,
    })
      .from(loyaltyPointsTransactions)
      .where(and(
        eq(loyaltyPointsTransactions.tenantId, tenantId),
        eq(loyaltyPointsTransactions.type, 'REDEEMED'),
      ))
      .groupBy(loyaltyPointsTransactions.rewardId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const rewardIds = topRewardsRaw.map(r => r.rewardId).filter(Boolean) as string[];
    const rewardNames: Record<string, string> = {};
    if (rewardIds.length > 0) {
      const rewardRows = await db.select({ id: loyaltyRewards.id, name: loyaltyRewards.name })
        .from(loyaltyRewards)
        .where(eq(loyaltyRewards.tenantId, tenantId));
      for (const r of rewardRows) rewardNames[r.id] = r.name;
    }

    const topRewards: LoyaltyTopReward[] = topRewardsRaw
      .filter(r => r.rewardId)
      .map(r => ({
        rewardId: r.rewardId!,
        rewardName: rewardNames[r.rewardId!] ?? '—',
        redeemCount: Number(r.count),
        totalPointsUsed: Number(r.totalPoints),
      }));

    // 7. Monthly chart: last 6 months earned vs redeemed
    const monthlyChart: LoyaltyMonthlyPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'yyyy-MM');

      const [earnedRow, redeemedRow] = await Promise.all([
        db.select({ total: sql<number>`coalesce(sum(points), 0)` })
          .from(loyaltyPointsTransactions)
          .where(and(
            eq(loyaltyPointsTransactions.tenantId, tenantId),
            eq(loyaltyPointsTransactions.type, 'EARNED'),
            gte(loyaltyPointsTransactions.createdAt, mStart),
            lte(loyaltyPointsTransactions.createdAt, mEnd),
          )),
        db.select({ total: sql<number>`coalesce(sum(abs(points)), 0)` })
          .from(loyaltyPointsTransactions)
          .where(and(
            eq(loyaltyPointsTransactions.tenantId, tenantId),
            eq(loyaltyPointsTransactions.type, 'REDEEMED'),
            gte(loyaltyPointsTransactions.createdAt, mStart),
            lte(loyaltyPointsTransactions.createdAt, mEnd),
          )),
      ]);

      monthlyChart.push({
        month: monthLabel,
        earned: Number(earnedRow[0]?.total ?? 0),
        redeemed: Number(redeemedRow[0]?.total ?? 0),
      });
    }

    return {
      ok: true,
      data: {
        activeClientsCount,
        pointsIssuedThisMonth,
        redeemsThisMonth,
        expiringClientsCount,
        expiringPointsTotal,
        topClients,
        topRewards,
        monthlyChart,
      },
    };
  } catch (e) {
    console.error('getLoyaltyAnalyticsData error', e);
    return { ok: false, error: 'Failed to load loyalty analytics' };
  }
}
