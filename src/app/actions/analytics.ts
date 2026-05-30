'use server';

import { db } from '@/db';
import { bookings, staff, branches, reviews } from '@/db/schema';
import { eq, and, gte, lte, lt, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { canUseFeature } from '@/core/plans';
import { tenants } from '@/db/schema';

export interface StaffPerformanceRow {
  staffId: string;
  name: string;
  branchName: string;
  attended: number;
  cancelled: number;
  cancellationRate: number;
  noShows: number;
  revenue: number;
  avgRating: number | null;
  productiveMinutes: number;
}

export interface StaffPerformanceSummary {
  totalAttended: number;
  totalRevenue: number;
  avgCancellationRate: number;
  avgRating: number | null;
  topByBookings: { name: string; count: number } | null;
  topByRating: { name: string; rating: number } | null;
}

export interface BranchOption {
  id: string;
  name: string;
}

export interface StaffPerformanceResult {
  rows: StaffPerformanceRow[];
  summary: StaffPerformanceSummary;
  branches: BranchOption[];
}

export async function getStaffPerformanceData(
  dateFrom: string,
  dateTo: string,
  branchIdFilter: string | null
): Promise<{ ok: true; data: StaffPerformanceResult } | { ok: false; error: string }> {
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

  // ── 1. Fetch all branches for this tenant ─────────────────────────────
  const allBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenantId),
    columns: { id: true, name: true },
  });

  // ── 2. Fetch all staff (optionally filtered by branch) ────────────────
  const staffList = await db.query.staff.findMany({
    where: and(
      eq(staff.tenantId, tenantId),
      branchIdFilter ? eq(staff.branchId, branchIdFilter) : undefined
    ),
    with: { branch: { columns: { id: true, name: true } } },
    columns: { id: true, name: true, branchId: true },
  });

  if (staffList.length === 0) {
    return {
      ok: true,
      data: {
        rows: [],
        summary: {
          totalAttended: 0,
          totalRevenue: 0,
          avgCancellationRate: 0,
          avgRating: null,
          topByBookings: null,
          topByRating: null,
        },
        branches: allBranches,
      },
    };
  }

  const staffIds = staffList.map(s => s.id);

  // ── 3. Fetch all bookings in range for these staff members ─────────────
  const bookingList = await db.query.bookings.findMany({
    where: and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.startTime, from),
      lte(bookings.startTime, to),
      inArray(bookings.staffId as any, staffIds)
    ),
    with: { service: { columns: { price: true, durationMinutes: true } } },
    columns: {
      id: true,
      staffId: true,
      status: true,
      startTime: true,
    },
  });

  // ── 4. Fetch reviews for finalized bookings in range ──────────────────
  const finalizedIds = bookingList
    .filter(b => b.status === 'FINALIZADA')
    .map(b => b.id);

  const reviewList = finalizedIds.length > 0
    ? await db.query.reviews.findMany({
        where: and(
          eq(reviews.tenantId, tenantId),
          inArray(reviews.bookingId, finalizedIds)
        ),
        columns: { staffId: true, rating: true },
      })
    : [];

  // ── 5. Group by staffId ───────────────────────────────────────────────
  type Acc = {
    attended: number;
    cancelled: number;
    noShows: number;
    revenue: number;
    productiveMinutes: number;
    ratingSum: number;
    ratingCount: number;
  };

  const map = new Map<string, Acc>();
  for (const s of staffList) {
    map.set(s.id, {
      attended: 0, cancelled: 0, noShows: 0,
      revenue: 0, productiveMinutes: 0,
      ratingSum: 0, ratingCount: 0,
    });
  }

  for (const b of bookingList) {
    if (!b.staffId) continue;
    const entry = map.get(b.staffId);
    if (!entry) continue;

    if (b.status === 'FINALIZADA') {
      entry.attended++;
      entry.revenue += parseFloat((b as any).service?.price ?? '0');
      entry.productiveMinutes += (b as any).service?.durationMinutes ?? 0;
    } else if (b.status === 'CANCELLED') {
      entry.cancelled++;
    } else if (b.status === 'CONFIRMED' && b.startTime < now) {
      // No-show: was confirmed but the date passed without being finalized
      entry.noShows++;
    } else if ((b.status === 'CONFIRMED' || b.status === 'PENDING') && b.startTime >= now) {
      // Cita futura agendada: contar como proyección (ingresos y minutos esperados)
      entry.attended++;
      entry.revenue += parseFloat((b as any).service?.price ?? '0');
      entry.productiveMinutes += (b as any).service?.durationMinutes ?? 0;
    }
  }

  for (const r of reviewList) {
    const entry = map.get(r.staffId);
    if (!entry) continue;
    entry.ratingSum += parseFloat(r.rating as string);
    entry.ratingCount++;
  }

  // ── 6. Build result rows ──────────────────────────────────────────────
  const rows: StaffPerformanceRow[] = staffList.map(s => {
    const e = map.get(s.id)!;
    const total = e.attended + e.cancelled + e.noShows;
    const cancellationRate = total > 0
      ? Math.round((e.cancelled / total) * 100)
      : 0;
    const avgRating = e.ratingCount > 0
      ? Math.round((e.ratingSum / e.ratingCount) * 10) / 10
      : null;

    return {
      staffId: s.id,
      name: s.name,
      branchName: (s as any).branch?.name ?? '—',
      attended: e.attended,
      cancelled: e.cancelled,
      cancellationRate,
      noShows: e.noShows,
      revenue: Math.round(e.revenue * 100) / 100,
      avgRating,
      productiveMinutes: e.productiveMinutes,
    };
  });

  // ── 7. Summary ────────────────────────────────────────────────────────
  const totalAttended = rows.reduce((acc, r) => acc + r.attended, 0);
  const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0);

  const ratedRows = rows.filter(r => r.avgRating !== null);
  const avgRating =
    ratedRows.length > 0
      ? Math.round((ratedRows.reduce((acc, r) => acc + r.avgRating!, 0) / ratedRows.length) * 10) / 10
      : null;

  const totalCancellationRates = rows
    .filter(r => r.attended + r.cancelled + r.noShows > 0)
    .map(r => r.cancellationRate);
  const avgCancellationRate =
    totalCancellationRates.length > 0
      ? Math.round(totalCancellationRates.reduce((a, b) => a + b, 0) / totalCancellationRates.length)
      : 0;

  const topByBookings = rows.length > 0
    ? rows.reduce((best, r) => (r.attended > best.attended ? r : best))
    : null;

  const topByRating =
    ratedRows.length > 0
      ? ratedRows.reduce((best, r) => (r.avgRating! > best.avgRating! ? r : best))
      : null;

  return {
    ok: true,
    data: {
      rows,
      summary: {
        totalAttended,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgCancellationRate,
        avgRating,
        topByBookings: topByBookings ? { name: topByBookings.name, count: topByBookings.attended } : null,
        topByRating: topByRating ? { name: topByRating.name, rating: topByRating.avgRating! } : null,
      },
      branches: allBranches,
    },
  };
}
