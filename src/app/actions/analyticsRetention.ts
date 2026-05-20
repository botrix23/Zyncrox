'use server';

import { db } from '@/db';
import { bookings, branches, reviews, tenants } from '@/db/schema';
import { eq, and, gte, lte, ne, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { canUseFeature } from '@/core/plans';
import {
  addDays, differenceInDays, getDay, getHours,
  startOfWeek, format,
} from 'date-fns';

// ── Exported types ─────────────────────────────────────────────────────────────

export interface ChurnRiskClient {
  email: string;
  name: string;
  lastVisit: Date;
  daysSince: number;
  totalBookings: number;
  lastService: string;
}

export interface PopularService {
  serviceId: string;
  name: string;
  bookingCount: number;
  revenue: number;
  avgRating: number | null;
}

export interface RetentionResult {
  // Retention rates
  retention30d: number;
  retention60d: number;
  retention90d: number;
  totalRangeCustomers: number;

  // Visit behavior
  avgFrequencyDays: number | null;
  ltv: number | null;

  // New vs returning (for donut + cards)
  newCount: number;
  recurringCount: number;

  // Tables
  churnRiskClients: ChurnRiskClient[];
  popularServices: PopularService[];

  // Charts
  heatmap: number[][];           // [dayIndex 0-6 Mon-Sun][slotIndex 0-2 morning/afternoon/evening]
  weeklyTrend: { label: string; count: number }[];

  // For filter dropdown
  branches: { id: string; name: string }[];
}

// ── Main action ────────────────────────────────────────────────────────────────

export async function getClientRetentionData(
  dateFrom: string,
  dateTo: string,
  branchIdFilter: string | null,
  churnDays: number = 60,
): Promise<{ ok: true; data: RetentionResult } | { ok: false; error: string }> {
  const session = await getSession();

  let tenantId: string | null = null;
  let tenantPlan: string | null = null;

  if (session?.role === 'SUPER_ADMIN' && session.impersonatedTenantId) {
    tenantId = session.impersonatedTenantId;
    const t = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { plan: true } });
    tenantPlan = t?.plan ?? null;
  } else if (session?.tenantId) {
    tenantId = session.tenantId;
    const t = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { plan: true } });
    tenantPlan = t?.plan ?? null;
  }

  if (!tenantId) return { ok: false, error: 'No autorizado' };
  if (!canUseFeature(tenantPlan, 'advancedAnalytics')) {
    return { ok: false, error: 'Tu plan no incluye analítica avanzada' };
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);
  const now = new Date();
  const extendedEnd = addDays(to, 90);
  const churnThreshold = addDays(now, -churnDays);

  const branchFilter = branchIdFilter ? eq(bookings.branchId, branchIdFilter) : undefined;

  // ── Parallel DB queries ────────────────────────────────────────────────────

  const [
    allBranches,
    rangeBookings,
    extendedBookings,
    allFinalizedBookings,
    allBookingsMeta,
  ] = await Promise.all([
    db.query.branches.findMany({
      where: eq(branches.tenantId, tenantId),
      columns: { id: true, name: true },
    }),

    // In-range bookings with service — for heatmap, weekly trend, popular services, new/recurring
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, from),
        lte(bookings.startTime, to),
        branchFilter,
      ),
      with: { service: { columns: { name: true, price: true } } },
      columns: { id: true, customerEmail: true, customerName: true, startTime: true, status: true, serviceId: true },
    }),

    // Extended window: from → to+90d (non-cancelled) — for retention calculation
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, from),
        lte(bookings.startTime, extendedEnd),
        ne(bookings.status, 'CANCELLED'),
        branchFilter,
      ),
      columns: { customerEmail: true, startTime: true },
    }),

    // All FINALIZED bookings — for LTV, visit frequency, churn last-date
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.status, 'FINALIZADA'),
        branchFilter,
      ),
      with: { service: { columns: { price: true, name: true } } },
      columns: { customerEmail: true, customerName: true, customerPhone: true, startTime: true },
    }),

    // All bookings (all statuses) — for first-visit detection and total booking count per customer
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        branchFilter,
      ),
      columns: { customerEmail: true, startTime: true },
    }),
  ]);

  // Reviews for finalized range bookings (for popular services ratings)
  const finalizedInRangeIds = rangeBookings.filter(b => b.status === 'FINALIZADA').map(b => b.id);
  const rangeReviews = finalizedInRangeIds.length > 0
    ? await db.query.reviews.findMany({
        where: and(
          eq(reviews.tenantId, tenantId),
          inArray(reviews.bookingId, finalizedInRangeIds),
        ),
        columns: { bookingId: true, rating: true },
      })
    : [];

  // ── Retention rates ────────────────────────────────────────────────────────

  // Last in-range booking date per customer
  const lastInRangeByCustomer = new Map<string, Date>();
  for (const b of rangeBookings) {
    if (!b.customerEmail) continue;
    const existing = lastInRangeByCustomer.get(b.customerEmail);
    if (!existing || b.startTime > existing) {
      lastInRangeByCustomer.set(b.customerEmail, b.startTime);
    }
  }
  const totalRangeCustomers = lastInRangeByCustomer.size;

  // All extended dates by customer (for finding first return)
  const extendedByCustomer = new Map<string, Date[]>();
  for (const b of extendedBookings) {
    if (!b.customerEmail) continue;
    const list = extendedByCustomer.get(b.customerEmail) ?? [];
    list.push(b.startTime);
    extendedByCustomer.set(b.customerEmail, list);
  }

  let retained30 = 0, retained60 = 0, retained90 = 0;
  for (const [email, lastInRange] of lastInRangeByCustomer) {
    const afterDates = (extendedByCustomer.get(email) ?? [])
      .filter(d => d > lastInRange)
      .sort((a, b) => a.getTime() - b.getTime());
    if (afterDates.length === 0) continue;
    const diff = differenceInDays(afterDates[0], lastInRange);
    if (diff <= 30) retained30++;
    if (diff <= 60) retained60++;
    if (diff <= 90) retained90++;
  }

  const retention30d = totalRangeCustomers > 0 ? Math.round((retained30 / totalRangeCustomers) * 100) : 0;
  const retention60d = totalRangeCustomers > 0 ? Math.round((retained60 / totalRangeCustomers) * 100) : 0;
  const retention90d = totalRangeCustomers > 0 ? Math.round((retained90 / totalRangeCustomers) * 100) : 0;

  // ── LTV and visit frequency ────────────────────────────────────────────────

  const spendByCustomer = new Map<string, number>();
  const visitDatesByCustomer = new Map<string, Date[]>();

  for (const b of allFinalizedBookings) {
    if (!b.customerEmail) continue;
    const price = parseFloat((b as any).service?.price ?? '0');
    spendByCustomer.set(b.customerEmail, (spendByCustomer.get(b.customerEmail) ?? 0) + price);
    const dates = visitDatesByCustomer.get(b.customerEmail) ?? [];
    dates.push(b.startTime);
    visitDatesByCustomer.set(b.customerEmail, dates);
  }

  const ltv = spendByCustomer.size > 0
    ? Math.round(
        Array.from(spendByCustomer.values()).reduce((a, b) => a + b, 0) / spendByCustomer.size * 100
      ) / 100
    : null;

  let totalGap = 0, customersWithFreq = 0;
  for (const dates of visitDatesByCustomer.values()) {
    if (dates.length < 2) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());
    let gapSum = 0;
    for (let i = 1; i < dates.length; i++) gapSum += differenceInDays(dates[i], dates[i - 1]);
    totalGap += gapSum / (dates.length - 1);
    customersWithFreq++;
  }
  const avgFrequencyDays = customersWithFreq > 0 ? Math.round(totalGap / customersWithFreq) : null;

  // ── New vs recurring ──────────────────────────────────────────────────────

  const firstVisitByCustomer = new Map<string, Date>();
  for (const b of allBookingsMeta) {
    if (!b.customerEmail) continue;
    const existing = firstVisitByCustomer.get(b.customerEmail);
    if (!existing || b.startTime < existing) {
      firstVisitByCustomer.set(b.customerEmail, b.startTime);
    }
  }

  let newCount = 0, recurringCount = 0;
  for (const email of lastInRangeByCustomer.keys()) {
    const firstVisit = firstVisitByCustomer.get(email);
    if (!firstVisit) continue;
    if (firstVisit >= from && firstVisit <= to) newCount++;
    else recurringCount++;
  }

  // ── Churn risk ─────────────────────────────────────────────────────────────

  const lastFinalizedByCustomer = new Map<string, { date: Date; name: string; serviceName: string }>();
  for (const b of allFinalizedBookings) {
    if (!b.customerEmail) continue;
    const existing = lastFinalizedByCustomer.get(b.customerEmail);
    if (!existing || b.startTime > existing.date) {
      lastFinalizedByCustomer.set(b.customerEmail, {
        date: b.startTime,
        name: b.customerName ?? '—',
        serviceName: (b as any).service?.name ?? '—',
      });
    }
  }

  const totalBookingsByCustomer = new Map<string, number>();
  for (const b of allBookingsMeta) {
    if (!b.customerEmail) continue;
    totalBookingsByCustomer.set(b.customerEmail, (totalBookingsByCustomer.get(b.customerEmail) ?? 0) + 1);
  }

  const churnRiskClients: ChurnRiskClient[] = [];
  for (const [email, info] of lastFinalizedByCustomer) {
    if (info.date >= churnThreshold) continue;
    if ((totalBookingsByCustomer.get(email) ?? 0) < 2) continue;
    churnRiskClients.push({
      email,
      name: info.name,
      lastVisit: info.date,
      daysSince: differenceInDays(now, info.date),
      totalBookings: totalBookingsByCustomer.get(email) ?? 1,
      lastService: info.serviceName,
    });
  }
  churnRiskClients.sort((a, b) => b.daysSince - a.daysSince);

  // ── Popular services ───────────────────────────────────────────────────────

  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const b of rangeBookings) {
    if (!b.serviceId || !(b as any).service) continue;
    const e = serviceMap.get(b.serviceId) ?? { name: (b as any).service.name, count: 0, revenue: 0 };
    e.count++;
    if (b.status === 'FINALIZADA') e.revenue += parseFloat((b as any).service.price ?? '0');
    serviceMap.set(b.serviceId, e);
  }

  const bookingServiceMap = new Map<string, string>();
  for (const b of rangeBookings) bookingServiceMap.set(b.id, b.serviceId);

  const ratingsByService = new Map<string, { sum: number; count: number }>();
  for (const r of rangeReviews) {
    const sid = bookingServiceMap.get(r.bookingId);
    if (!sid) continue;
    const e = ratingsByService.get(sid) ?? { sum: 0, count: 0 };
    e.sum += parseFloat(r.rating as string);
    e.count++;
    ratingsByService.set(sid, e);
  }

  const popularServices: PopularService[] = Array.from(serviceMap.entries())
    .map(([sid, data]) => {
      const rat = ratingsByService.get(sid);
      return {
        serviceId: sid,
        name: data.name,
        bookingCount: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
        avgRating: rat && rat.count > 0
          ? Math.round((rat.sum / rat.count) * 10) / 10
          : null,
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount);

  // ── Demand heatmap ─────────────────────────────────────────────────────────
  // [dayIndex 0-6 = Mon-Sun][slotIndex 0-2 = morning/afternoon/evening]

  const heatmap: number[][] = Array.from({ length: 7 }, () => [0, 0, 0]);
  for (const b of rangeBookings) {
    const jsDay = getDay(b.startTime); // 0=Sun in JS
    const dayIdx = (jsDay + 6) % 7;   // 0=Mon in our system
    const hour = getHours(b.startTime);
    const slotIdx = hour >= 8 && hour < 12 ? 0 : hour >= 12 && hour < 17 ? 1 : hour >= 17 && hour < 21 ? 2 : -1;
    if (slotIdx !== -1) heatmap[dayIdx][slotIdx]++;
  }

  // ── Weekly trend ───────────────────────────────────────────────────────────

  const weekMap = new Map<string, { label: string; count: number }>();
  for (const b of rangeBookings) {
    const ws = startOfWeek(b.startTime, { weekStartsOn: 1 });
    const sortKey = format(ws, 'yyyy-MM-dd');
    const label = format(ws, 'dd/MM');
    const e = weekMap.get(sortKey) ?? { label, count: 0 };
    e.count++;
    weekMap.set(sortKey, e);
  }
  const weeklyTrend = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ label: v.label, count: v.count }));

  return {
    ok: true,
    data: {
      retention30d,
      retention60d,
      retention90d,
      totalRangeCustomers,
      avgFrequencyDays,
      ltv,
      newCount,
      recurringCount,
      churnRiskClients: churnRiskClients.slice(0, 50),
      popularServices,
      heatmap,
      weeklyTrend,
      branches: allBranches,
    },
  };
}
