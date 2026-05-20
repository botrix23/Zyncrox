'use server';

import { db } from '@/db';
import { bookings, branches, reviews, staff, tenants } from '@/db/schema';
import { eq, and, gte, lte, ne, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { canUseFeature } from '@/core/plans';
import {
  addDays, differenceInCalendarDays, getDay,
  startOfWeek, format, eachDayOfInterval,
} from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BranchPerformanceRow {
  branchId: string;
  branchName: string;
  attended: number;
  cancelled: number;
  cancellationRate: number;
  revenue: number;
  newClients: number;
  recurringClients: number;
  occupancyRate: number | null;  // null if no business hours defined
  avgRating: number | null;
  staffCount: number;
  avgServiceDurationMinutes: number | null;
}

export interface BranchPerformanceSummary {
  totalAttended: number;
  totalRevenue: number;
  avgCancellationRate: number;
  avgOccupancy: number | null;
  topByRevenue: { id: string; name: string; revenue: number } | null;
  topByOccupancy: { id: string; name: string; rate: number } | null;
}

export interface BranchPerformanceResult {
  rows: BranchPerformanceRow[];
  summary: BranchPerformanceSummary;
  weeklyTrend: { label: string; branches: Record<string, number> }[];
  branchNames: Record<string, string>;  // id → name
}

// ── Business hours helpers ─────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DaySchedule {
  isOpen: boolean;
  slots: { open: string; close: string }[];
}

interface BusinessHours {
  regular: Record<string, DaySchedule>;
  special?: Record<string, { isOpen: boolean; slots: { open: string; close: string }[] }>;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function getDayOpenMinutes(schedule: DaySchedule | undefined): number {
  if (!schedule || !schedule.isOpen) return 0;
  return schedule.slots.reduce((sum, slot) => {
    const open = parseTimeToMinutes(slot.open);
    const close = parseTimeToMinutes(slot.close);
    return sum + Math.max(0, close - open);
  }, 0);
}

/**
 * Total theoretical appointment slots for a branch over a date range.
 * slots = Σ (openMinutes/day * staffCount) / avgServiceDurationMinutes
 */
function computeTheoreticalSlots(
  businessHoursJson: string | null,
  staffCount: number,
  avgServiceDurationMinutes: number,
  from: Date,
  to: Date,
): number | null {
  if (!businessHoursJson || staffCount === 0 || avgServiceDurationMinutes === 0) return null;

  let bh: BusinessHours;
  try {
    bh = JSON.parse(businessHoursJson) as BusinessHours;
  } catch {
    return null;
  }

  if (!bh.regular) return null;

  const days = eachDayOfInterval({ start: from, end: to });
  let totalSlots = 0;

  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const jsDay = getDay(day); // 0=Sun
    const dayName = DAY_NAMES[jsDay];

    // Special day override
    let schedule: DaySchedule | undefined;
    if (bh.special && bh.special[dateKey]) {
      schedule = bh.special[dateKey];
    } else {
      schedule = bh.regular[dayName];
    }

    const openMinutes = getDayOpenMinutes(schedule);
    if (openMinutes > 0) {
      totalSlots += (openMinutes / avgServiceDurationMinutes) * staffCount;
    }
  }

  return totalSlots;
}

// ── Main action ────────────────────────────────────────────────────────────────

export async function getBranchPerformanceData(
  dateFrom: string,
  dateTo: string,
): Promise<{ ok: true; data: BranchPerformanceResult } | { ok: false; error: string }> {
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

  // ── Parallel DB queries ──────────────────────────────────────────────────────

  const [allBranches, allStaff, rangeBookings, allBookingsMeta] = await Promise.all([
    db.query.branches.findMany({
      where: eq(branches.tenantId, tenantId),
      columns: { id: true, name: true, businessHours: true, isActive: true },
    }),

    // Active staff — to count per branch
    db.query.staff.findMany({
      where: and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)),
      columns: { id: true, branchId: true },
    }),

    // In-range bookings with service info
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, from),
        lte(bookings.startTime, to),
      ),
      with: { service: { columns: { durationMinutes: true, price: true } } },
      columns: {
        id: true, branchId: true, customerEmail: true,
        status: true, startTime: true, serviceId: true,
      },
    }),

    // All bookings (all time) — for new/recurring detection
    db.query.bookings.findMany({
      where: eq(bookings.tenantId, tenantId),
      columns: { customerEmail: true, branchId: true, startTime: true },
    }),
  ]);

  // Reviews for finalized range bookings
  const finalizedInRangeIds = rangeBookings
    .filter(b => b.status === 'FINALIZADA')
    .map(b => b.id);

  const rangeReviews = finalizedInRangeIds.length > 0
    ? await db.query.reviews.findMany({
        where: and(
          eq(reviews.tenantId, tenantId),
          inArray(reviews.bookingId, finalizedInRangeIds),
        ),
        columns: { bookingId: true, rating: true },
      })
    : [];

  // ── Index building ──────────────────────────────────────────────────────────

  // Map booking id → branchId for reviews lookup
  const bookingBranchMap = new Map<string, string>();
  for (const b of rangeBookings) {
    bookingBranchMap.set(b.id, b.branchId);
  }

  // Ratings by branch
  const ratingsByBranch = new Map<string, { sum: number; count: number }>();
  for (const r of rangeReviews) {
    const bid = bookingBranchMap.get(r.bookingId);
    if (!bid) continue;
    const e = ratingsByBranch.get(bid) ?? { sum: 0, count: 0 };
    e.sum += parseFloat(r.rating as string);
    e.count++;
    ratingsByBranch.set(bid, e);
  }

  // Staff count per branch
  const staffCountByBranch = new Map<string, number>();
  for (const s of allStaff) {
    staffCountByBranch.set(s.branchId, (staffCountByBranch.get(s.branchId) ?? 0) + 1);
  }

  // First visit globally (for new/recurring)
  const firstVisitByCustomer = new Map<string, Date>();
  for (const b of allBookingsMeta) {
    if (!b.customerEmail) continue;
    const existing = firstVisitByCustomer.get(b.customerEmail);
    if (!existing || b.startTime < existing) {
      firstVisitByCustomer.set(b.customerEmail, b.startTime);
    }
  }

  // ── Per-branch aggregation ──────────────────────────────────────────────────

  const branchMap = new Map<string, {
    attended: number;
    cancelled: number;
    total: number;
    revenue: number;
    newClients: Set<string>;
    recurringClients: Set<string>;
    serviceMinutes: number[];
  }>();

  // Initialize all branches
  for (const br of allBranches) {
    branchMap.set(br.id, {
      attended: 0, cancelled: 0, total: 0, revenue: 0,
      newClients: new Set(), recurringClients: new Set(),
      serviceMinutes: [],
    });
  }

  for (const b of rangeBookings) {
    const entry = branchMap.get(b.branchId);
    if (!entry) continue;

    entry.total++;
    if (b.status === 'FINALIZADA') {
      entry.attended++;
      const price = parseFloat((b as any).service?.price ?? '0');
      entry.revenue += price;
      const dur = (b as any).service?.durationMinutes;
      if (dur) entry.serviceMinutes.push(dur);

      // New vs recurring
      if (b.customerEmail) {
        const firstVisit = firstVisitByCustomer.get(b.customerEmail);
        if (firstVisit && firstVisit >= from && firstVisit <= to) {
          entry.newClients.add(b.customerEmail);
        } else if (firstVisit) {
          entry.recurringClients.add(b.customerEmail);
        }
      }
    }
    if (b.status === 'CANCELLED') {
      entry.cancelled++;
    }
  }

  // ── Build result rows ───────────────────────────────────────────────────────

  const rows: BranchPerformanceRow[] = allBranches.map(br => {
    const e = branchMap.get(br.id) ?? {
      attended: 0, cancelled: 0, total: 0, revenue: 0,
      newClients: new Set(), recurringClients: new Set(),
      serviceMinutes: [],
    };

    const cancellationRate = e.total > 0 ? Math.round((e.cancelled / e.total) * 100) : 0;
    const avgServiceDuration = e.serviceMinutes.length > 0
      ? Math.round(e.serviceMinutes.reduce((a, b) => a + b, 0) / e.serviceMinutes.length)
      : null;
    const staffCount = staffCountByBranch.get(br.id) ?? 0;

    // Occupancy
    let occupancyRate: number | null = null;
    if (avgServiceDuration && avgServiceDuration > 0) {
      const theoretical = computeTheoreticalSlots(
        br.businessHours, staffCount, avgServiceDuration, from, to,
      );
      if (theoretical && theoretical > 0) {
        occupancyRate = Math.min(100, Math.round((e.attended / theoretical) * 100));
      }
    }

    const ratData = ratingsByBranch.get(br.id);
    const avgRating = ratData && ratData.count > 0
      ? Math.round((ratData.sum / ratData.count) * 10) / 10
      : null;

    return {
      branchId: br.id,
      branchName: br.name,
      attended: e.attended,
      cancelled: e.cancelled,
      cancellationRate,
      revenue: Math.round(e.revenue * 100) / 100,
      newClients: e.newClients.size,
      recurringClients: e.recurringClients.size,
      occupancyRate,
      avgRating,
      staffCount,
      avgServiceDurationMinutes: avgServiceDuration,
    };
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  const totalAttended = rows.reduce((s, r) => s + r.attended, 0);
  const totalRevenue = Math.round(rows.reduce((s, r) => s + r.revenue, 0) * 100) / 100;

  const rowsWithBookings = rows.filter(r => r.attended + r.cancelled > 0);
  const avgCancellationRate = rowsWithBookings.length > 0
    ? Math.round(rowsWithBookings.reduce((s, r) => s + r.cancellationRate, 0) / rowsWithBookings.length)
    : 0;

  const rowsWithOccupancy = rows.filter(r => r.occupancyRate !== null);
  const avgOccupancy = rowsWithOccupancy.length > 0
    ? Math.round(rowsWithOccupancy.reduce((s, r) => s + (r.occupancyRate ?? 0), 0) / rowsWithOccupancy.length)
    : null;

  const topByRevenue = rows.reduce<BranchPerformanceRow | null>(
    (best, r) => (!best || r.revenue > best.revenue) ? r : best, null,
  );
  const topByOccupancy = rowsWithOccupancy.reduce<BranchPerformanceRow | null>(
    (best, r) => (!best || (r.occupancyRate ?? 0) > (best.occupancyRate ?? 0)) ? r : best, null,
  );

  // ── Weekly trend per branch ──────────────────────────────────────────────────

  // Map<weekSortKey, Map<branchId, count>>
  const weekMap = new Map<string, { label: string; perBranch: Map<string, number> }>();

  for (const b of rangeBookings) {
    if (b.status === 'CANCELLED') continue;
    const ws = startOfWeek(b.startTime, { weekStartsOn: 1 });
    const sortKey = format(ws, 'yyyy-MM-dd');
    const label = format(ws, 'dd/MM');
    if (!weekMap.has(sortKey)) weekMap.set(sortKey, { label, perBranch: new Map() });
    const wEntry = weekMap.get(sortKey)!;
    wEntry.perBranch.set(b.branchId, (wEntry.perBranch.get(b.branchId) ?? 0) + 1);
  }

  const weeklyTrend = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({
      label: v.label,
      branches: Object.fromEntries(v.perBranch.entries()),
    }));

  const branchNames: Record<string, string> = {};
  for (const br of allBranches) branchNames[br.id] = br.name;

  return {
    ok: true,
    data: {
      rows,
      summary: {
        totalAttended,
        totalRevenue,
        avgCancellationRate,
        avgOccupancy,
        topByRevenue: topByRevenue
          ? { id: topByRevenue.branchId, name: topByRevenue.branchName, revenue: topByRevenue.revenue }
          : null,
        topByOccupancy: topByOccupancy
          ? { id: topByOccupancy.branchId, name: topByOccupancy.branchName, rate: topByOccupancy.occupancyRate! }
          : null,
      },
      weeklyTrend,
      branchNames,
    },
  };
}
