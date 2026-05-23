'use server';

import { db } from '@/db';
import { bookings, reviews, tenants } from '@/db/schema';
import { eq, and, gte, lte, ne } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { canUseFeature } from '@/core/plans';

// ── Exported types ─────────────────────────────────────────────────────────────

export interface NpsTrendPoint  { period: string; score: number; total: number }
export interface RatingTrendPoint { period: string; avg: number; total: number }

export interface QualityAlert {
  staffId: string;
  staffName: string;
  negativeCount: number;
  avgRating: number;
  worstService: string | null;
  lastNegativeDate: Date | null;
}

export interface RetentionByRating {
  ratingGroup: '5' | '4' | '3orLess';
  total: number;
  returned: number;
  rate: number;
}

export interface SatisfactionResult {
  // Summary cards
  npsScore: number | null;
  npsTotal: number;
  promoters: number;
  passives: number;
  detractors: number;
  promotersPct: number;
  passivesPct: number;
  detractorsPct: number;
  avgRating: number | null;
  totalRatingReviews: number;
  responseRate: number | null;
  totalSent: number;
  negativeCount: number;
  // Charts
  npsTrend: NpsTrendPoint[];
  ratingTrend: RatingTrendPoint[];
  // Tables
  qualityAlerts: QualityAlert[];
  retentionByRating: RetentionByRating[];
}

// ── Helper: ISO-week start (Monday) key ───────────────────────────────────────

function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ── Main action ────────────────────────────────────────────────────────────────

export async function getSatisfactionData(
  dateFrom: string,
  dateTo: string,
): Promise<{ ok: true; data: SatisfactionResult } | { ok: false; error: string }> {
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

  try {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Determine bucket granularity: weekly if range < 90 days, monthly otherwise
    const rangeDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    const useWeekly = rangeDays < 90;
    const getPeriodKey = useWeekly ? weekKey : monthKey;

    // Extended window for retention: reviews range + 30 days
    const extendedTo = new Date(to.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [reviewRows, sentResult, futureBookings] = await Promise.all([

      // All reviews in date range with booking (email + service) and staff
      db.query.reviews.findMany({
        where: and(
          eq(reviews.tenantId, tenantId),
          gte(reviews.createdAt, from),
          lte(reviews.createdAt, to),
        ),
        with: {
          booking: {
            columns: { customerEmail: true, customerName: true },
            with: { service: { columns: { name: true } } },
          },
          staff: { columns: { id: true, name: true } },
        },
      }),

      // Surveys sent in the period (using startTime as the booking date proxy)
      db.query.bookings.findMany({
        where: and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.surveyEmailSent, true),
          gte(bookings.startTime, from),
          lte(bookings.startTime, to),
        ),
        columns: { id: true },
      }),

      // Bookings after the period (for retention-by-rating, up to to+30d)
      db.query.bookings.findMany({
        where: and(
          eq(bookings.tenantId, tenantId),
          gte(bookings.startTime, from),
          lte(bookings.startTime, extendedTo),
          ne(bookings.status, 'CANCELLED'),
        ),
        columns: { customerEmail: true, startTime: true, status: true },
      }),
    ]);

    const totalSent = sentResult.length;
    const totalRatingReviews = reviewRows.length;

    // ── NPS calculation ───────────────────────────────────────────────────────
    const npsAnswers: number[] = [];
    reviewRows.forEach(r => {
      (r.responses || []).forEach((resp: any) => {
        if (resp.questionType === 'NPS' && typeof resp.answer === 'number') {
          npsAnswers.push(resp.answer);
        }
      });
    });

    const npsTotal = npsAnswers.length;
    const promoters = npsAnswers.filter(a => a >= 9).length;
    const passives  = npsAnswers.filter(a => a >= 7 && a <= 8).length;
    const detractors = npsAnswers.filter(a => a <= 6).length;

    const promotersPct  = npsTotal > 0 ? Math.round((promoters  / npsTotal) * 100) : 0;
    const passivesPct   = npsTotal > 0 ? Math.round((passives   / npsTotal) * 100) : 0;
    const detractorsPct = npsTotal > 0 ? Math.round((detractors / npsTotal) * 100) : 0;
    const npsScore      = npsTotal > 0 ? promotersPct - detractorsPct : null;

    // ── Rating stats ──────────────────────────────────────────────────────────
    const ratingSum = reviewRows.reduce((s, r) => s + Number(r.rating), 0);
    const avgRating = totalRatingReviews > 0
      ? Math.round((ratingSum / totalRatingReviews) * 10) / 10
      : null;
    const negativeCount = reviewRows.filter(r => Number(r.rating) <= 3).length;
    const responseRate  = totalSent > 0
      ? Math.round((totalRatingReviews / totalSent) * 100)
      : null;

    // ── NPS trend ─────────────────────────────────────────────────────────────
    const npsPeriodMap = new Map<string, number[]>();
    reviewRows.forEach(r => {
      (r.responses || []).forEach((resp: any) => {
        if (resp.questionType === 'NPS' && typeof resp.answer === 'number') {
          const key = getPeriodKey(r.createdAt);
          const arr = npsPeriodMap.get(key) ?? [];
          arr.push(resp.answer);
          npsPeriodMap.set(key, arr);
        }
      });
    });
    const npsTrend: NpsTrendPoint[] = Array.from(npsPeriodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, answers]) => {
        const p = answers.filter(a => a >= 9).length;
        const d = answers.filter(a => a <= 6).length;
        const score = Math.round(((p - d) / answers.length) * 100);
        return { period, score, total: answers.length };
      });

    // ── Rating trend ──────────────────────────────────────────────────────────
    const ratingPeriodMap = new Map<string, { sum: number; count: number }>();
    reviewRows.forEach(r => {
      const key = getPeriodKey(r.createdAt);
      const prev = ratingPeriodMap.get(key) ?? { sum: 0, count: 0 };
      ratingPeriodMap.set(key, { sum: prev.sum + Number(r.rating), count: prev.count + 1 });
    });
    const ratingTrend: RatingTrendPoint[] = Array.from(ratingPeriodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, { sum, count }]) => ({
        period,
        avg: Math.round((sum / count) * 10) / 10,
        total: count,
      }));

    // ── Quality alerts (staff with negative reviews ≤3★) ─────────────────────
    type StaffEntry = {
      name: string;
      negatives: { date: Date; serviceName: string | null }[];
      allRatings: number[];
    };
    const staffMap = new Map<string, StaffEntry>();

    reviewRows.forEach(r => {
      const rating = Number(r.rating);
      const staffId = r.staffId;
      const name = r.staff?.name ?? 'Unknown';
      const serviceName = (r.booking as any)?.service?.name ?? null;

      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, { name, negatives: [], allRatings: [] });
      }
      const entry = staffMap.get(staffId)!;
      entry.allRatings.push(rating);
      if (rating <= 3) {
        entry.negatives.push({ date: r.createdAt, serviceName });
      }
    });

    const qualityAlerts: QualityAlert[] = Array.from(staffMap.entries())
      .filter(([, e]) => e.negatives.length > 0)
      .map(([staffId, e]) => {
        // Worst service: most negative reviews
        const svcCount = new Map<string, number>();
        e.negatives.forEach(n => {
          if (n.serviceName) svcCount.set(n.serviceName, (svcCount.get(n.serviceName) ?? 0) + 1);
        });
        const worstService = svcCount.size > 0
          ? [...svcCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : null;
        const lastNegativeDate = e.negatives
          .map(n => n.date)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
        const avgRating = e.allRatings.length > 0
          ? Math.round((e.allRatings.reduce((s, r) => s + r, 0) / e.allRatings.length) * 10) / 10
          : 0;
        return { staffId, staffName: e.name, negativeCount: e.negatives.length, avgRating, worstService, lastNegativeDate };
      })
      .sort((a, b) => b.negativeCount - a.negativeCount);

    // ── Satisfaction-retention correlation ────────────────────────────────────
    // For each review in the period, check if that client made another booking
    // within 30 days after the review date. Group by star rating bucket.
    const retentionByRating: RetentionByRating[] = [
      { ratingGroup: '5',       total: 0, returned: 0, rate: 0 },
      { ratingGroup: '4',       total: 0, returned: 0, rate: 0 },
      { ratingGroup: '3orLess', total: 0, returned: 0, rate: 0 },
    ];

    reviewRows.forEach(r => {
      const email = (r.booking as any)?.customerEmail as string | null;
      if (!email) return;

      const rating   = Number(r.rating);
      const reviewDt = r.createdAt;
      const window30  = new Date(reviewDt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const returned = futureBookings.some(b =>
        b.customerEmail === email &&
        b.startTime > reviewDt &&
        b.startTime <= window30,
      );

      const rounded = Math.round(rating);
      const group =
        rounded >= 5 ? retentionByRating[0] :
        rounded === 4 ? retentionByRating[1] : retentionByRating[2];

      group.total++;
      if (returned) group.returned++;
    });

    retentionByRating.forEach(g => {
      g.rate = g.total > 0 ? Math.round((g.returned / g.total) * 100) : 0;
    });

    return {
      ok: true,
      data: {
        npsScore, npsTotal, promoters, passives, detractors,
        promotersPct, passivesPct, detractorsPct,
        avgRating, totalRatingReviews,
        responseRate, totalSent, negativeCount,
        npsTrend, ratingTrend,
        qualityAlerts, retentionByRating,
      },
    };
  } catch (err) {
    console.error('Error fetching satisfaction data:', err);
    return { ok: false, error: 'Error al cargar datos de satisfacción' };
  }
}
