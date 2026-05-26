import React from 'react';
import {
  Calendar, Users, AlertTriangle, Share2, ExternalLink,
  Star, Award, Building, TrendingUp, UserCheck,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { db } from '@/db';
import { bookings, absenceRequests, reviews, branches, tenants } from '@/db/schema';
import { eq, and, gte, lte, desc, ne, sql, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subWeeks, subDays, addHours, addDays,
  isSameDay, format
} from 'date-fns';
import { es as esLocale, enUS } from 'date-fns/locale';
import Link from 'next/link';
import { WeeklyBarChart } from '@/components/dashboard/WeeklyBarChart';
import { CopyLinkButton } from '@/components/dashboard/CopyLinkButton';
import { DashboardExport } from '@/components/dashboard/DashboardExport';
import { canUseFeature } from '@/core/plans';
import { DashboardTabsClient } from './DashboardTabsClient';
import { StatsUpgradeWall } from './StatsUpgradeWall';

export default async function AdminDashboard({ params: { locale } }: { params: { locale: string } }) {
  const session = await getSession();

  let tenantId: string | null = null;
  const isAdmin = session?.role !== 'STAFF';

  if (session?.role === 'STAFF') {
    redirect(`/${locale}/admin/bookings`);
  } else if (session?.role === 'SUPER_ADMIN') {
    if (session.impersonatedTenantId) tenantId = session.impersonatedTenantId;
    else redirect(`/${locale}/admin/super`);
  } else if (session?.tenantId) {
    tenantId = session.tenantId;
  } else {
    redirect('/admin/login');
  }

  const dateLocale = locale === 'es' ? esLocale : enUS;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days60Ago = subDays(now, 60);
  const twoHoursLater = addHours(now, 2);

  const [
    bookingsTodayRaw,
    bookingsThisWeekRaw,
    bookingsPrevWeekRaw,
    bookingsThisMonthRaw,
    allBookings60DaysRaw,
    newClientsData,
    absencesThisMonthRaw,
    reviewsThisMonthRaw,
    branchesData,
    tenantData,
    unassignedBookingsRaw,
  ] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, todayStart),
        lte(bookings.startTime, todayEnd)
      ),
      with: { service: true, staff: true, branch: true },
      orderBy: [bookings.startTime]
    }),
    db.select({ startTime: bookings.startTime }).from(bookings).where(
      and(eq(bookings.tenantId, tenantId), gte(bookings.startTime, weekStart), lte(bookings.startTime, weekEnd))
    ),
    db.select({ startTime: bookings.startTime }).from(bookings).where(
      and(eq(bookings.tenantId, tenantId), gte(bookings.startTime, prevWeekStart), lte(bookings.startTime, prevWeekEnd))
    ),
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, monthStart),
        lte(bookings.startTime, monthEnd)
      ),
      with: { service: true, staff: true, branch: true }
    }),
    db.select({ customerEmail: bookings.customerEmail }).from(bookings).where(
      and(eq(bookings.tenantId, tenantId), gte(bookings.startTime, days60Ago))
    ),
    db.select({
      customerEmail: bookings.customerEmail,
      firstDate: sql<string>`MIN(${bookings.startTime})`
    }).from(bookings)
      .where(eq(bookings.tenantId, tenantId))
      .groupBy(bookings.customerEmail),
    db.query.absenceRequests.findMany({
      where: and(
        eq(absenceRequests.tenantId, tenantId),
        gte(absenceRequests.startTime, monthStart),
        lte(absenceRequests.startTime, monthEnd),
        ne(absenceRequests.status, 'REJECTED')
      ),
      with: { staff: true }
    }),
    db.query.reviews.findMany({
      where: and(
        eq(reviews.tenantId, tenantId),
        gte(reviews.createdAt, monthStart),
        lte(reviews.createdAt, monthEnd)
      ),
      with: { booking: { with: { service: true } } },
      orderBy: [desc(reviews.createdAt)]
    }),
    db.query.branches.findMany({ where: eq(branches.tenantId, tenantId) }),
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        isNull(bookings.staffId),
        eq(bookings.status, 'PENDING_ASSIGNMENT')
      ),
      with: { service: true, branch: true },
      orderBy: [bookings.startTime],
    }),
  ]);

  // ── TODAY ──────────────────────────────────────────────────────────────────
  const todayTotal = bookingsTodayRaw.length;
  const todayConfirmed = bookingsTodayRaw.filter(b => b.status === 'CONFIRMED').length;
  const todayPending = bookingsTodayRaw.filter(b => b.status === 'PENDING').length;
  const todayCancelled = bookingsTodayRaw.filter(b => b.status === 'CANCELLED').length;
  const todayFinalizada = bookingsTodayRaw.filter(b => b.status === 'FINALIZADA').length;

  const todayUpcoming = bookingsTodayRaw
    .filter(b => b.startTime > now && b.status !== 'CANCELLED' && b.status !== 'FINALIZADA')
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      customer: b.customerName,
      service: b.service?.name ?? 'N/A',
      time: format(b.startTime, 'HH:mm'),
      staffName: b.staff?.name ?? '—',
      branchName: b.branch?.name ?? '—',
      status: b.status,
    }));

  const todayAlerts = bookingsTodayRaw
    .filter(b => b.status === 'PENDING' && b.startTime > now && b.startTime <= twoHoursLater)
    .map(b => ({
      id: b.id,
      customer: b.customerName,
      service: b.service?.name ?? 'N/A',
      time: format(b.startTime, 'HH:mm'),
      minutesLeft: Math.floor((b.startTime.getTime() - now.getTime()) / 60000),
    }));

  // ── WEEK ───────────────────────────────────────────────────────────────────
  const thisWeekByDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return bookingsThisWeekRaw.filter(b => isSameDay(b.startTime, day)).length;
  });
  const prevWeekByDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(prevWeekStart, i);
    return bookingsPrevWeekRaw.filter(b => isSameDay(b.startTime, day)).length;
  });
  const thisWeekTotal = bookingsThisWeekRaw.length;
  const prevWeekTotal = bookingsPrevWeekRaw.length;
  const weekChange = prevWeekTotal > 0
    ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
    : thisWeekTotal > 0 ? 100 : 0;

  // ── MONTH ──────────────────────────────────────────────────────────────────
  const monthTotal = bookingsThisMonthRaw.length;
  const monthConfirmed = bookingsThisMonthRaw.filter(b => b.status === 'CONFIRMED').length;
  const monthCancelled = bookingsThisMonthRaw.filter(b => b.status === 'CANCELLED').length;
  const monthFinalizada = bookingsThisMonthRaw.filter(b => b.status === 'FINALIZADA').length;
  const cancellationRate = monthTotal > 0 ? Math.round((monthCancelled / monthTotal) * 100) : 0;

  const activeClientsSet = new Set(
    allBookings60DaysRaw.map(b => b.customerEmail ?? '').filter(Boolean)
  );
  const activeClients60Days = activeClientsSet.size;

  const newClientsThisMonth = newClientsData.filter(row => {
    const raw = row.firstDate as unknown;
    const d = raw instanceof Date ? raw : new Date(raw as string);
    return !isNaN(d.getTime()) && d >= monthStart;
  }).length;

  // ── SERVICES ───────────────────────────────────────────────────────────────
  const svcMap = new Map<string, { name: string; total: number; cancelled: number }>();
  for (const b of bookingsThisMonthRaw) {
    const key = b.serviceId;
    const name = b.service?.name ?? 'N/A';
    if (!svcMap.has(key)) svcMap.set(key, { name, total: 0, cancelled: 0 });
    const e = svcMap.get(key)!;
    e.total++;
    if (b.status === 'CANCELLED') e.cancelled++;
  }
  const topServices = Array.from(svcMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      count: s.total,
      cancelRate: s.total > 0 ? Math.round((s.cancelled / s.total) * 100) : 0,
    }));
  const worstServiceCancellation = Array.from(svcMap.values())
    .filter(s => s.total >= 3)
    .map(s => ({ name: s.name, rate: s.total > 0 ? Math.round((s.cancelled / s.total) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)[0] ?? null;

  // ── STAFF ──────────────────────────────────────────────────────────────────
  type StaffEntry = { name: string; attended: number; cancelled: number; pending: number; absenceCount: number; absenceMinutes: number };
  const staffMap = new Map<string, StaffEntry>();

  for (const b of bookingsThisMonthRaw) {
    const key = b.staffId ?? '__unassigned__';
    const name = b.staff?.name ?? 'Sin asignar';
    if (!staffMap.has(key)) staffMap.set(key, { name, attended: 0, cancelled: 0, pending: 0, absenceCount: 0, absenceMinutes: 0 });
    const e = staffMap.get(key)!;
    if (b.status === 'FINALIZADA') e.attended++;
    else if (b.status === 'CANCELLED') e.cancelled++;
    else e.pending++;
  }
  for (const abs of absencesThisMonthRaw) {
    const key = abs.staffId;
    const name = abs.staff?.name ?? 'N/A';
    if (!staffMap.has(key)) staffMap.set(key, { name, attended: 0, cancelled: 0, pending: 0, absenceCount: 0, absenceMinutes: 0 });
    const e = staffMap.get(key)!;
    e.absenceCount++;
    e.absenceMinutes += Math.floor((abs.endTime.getTime() - abs.startTime.getTime()) / 60000);
  }
  const staffPerformance = Array.from(staffMap.values()).sort((a, b) => b.attended - a.attended);
  const topStaff = staffPerformance[0] ?? null;

  // ── BRANCHES ───────────────────────────────────────────────────────────────
  const showBranchSection = branchesData.length > 1;
  const branchMap = new Map<string, { name: string; bookings: number; absenceCount: number; absenceMinutes: number }>();
  for (const br of branchesData) branchMap.set(br.id, { name: br.name, bookings: 0, absenceCount: 0, absenceMinutes: 0 });
  for (const b of bookingsThisMonthRaw) {
    const e = branchMap.get(b.branchId);
    if (e) e.bookings++;
  }
  for (const abs of absencesThisMonthRaw) {
    const brId = abs.staff?.branchId;
    if (brId) {
      const e = branchMap.get(brId);
      if (e) {
        e.absenceCount++;
        e.absenceMinutes += Math.floor((abs.endTime.getTime() - abs.startTime.getTime()) / 60000);
      }
    }
  }
  const branchPerformance = Array.from(branchMap.values()).sort((a, b) => b.bookings - a.bookings);

  // ── REVIEWS ────────────────────────────────────────────────────────────────
  const totalRatingSum = reviewsThisMonthRaw.reduce((acc, r) => acc + parseFloat(r.rating), 0);
  const avgRating = reviewsThisMonthRaw.length > 0 ? totalRatingSum / reviewsThisMonthRaw.length : null;
  const lastReviews = reviewsThisMonthRaw.slice(0, 5).map(r => ({
    rating: parseFloat(r.rating),
    comment: r.comment ?? '',
    service: r.booking?.service?.name ?? 'N/A',
    date: format(r.createdAt, 'd MMM', { locale: dateLocale }),
  }));

  const portalUrl = `/${locale}/${tenantData?.slug ?? ''}`;
  const monthLabel = format(now, "MMMM yyyy", { locale: dateLocale });
  const todayLabel = format(now, "EEEE d 'de' MMMM", { locale: dateLocale });

  // Feature gates
  const tenantPlan = tenantData?.plan ?? null;
  const canUseAnalytics = canUseFeature(tenantPlan, 'advancedAnalytics');
  const canUseWeeklyMonthlyStats = canUseFeature(tenantPlan, 'weeklyMonthlyStats');

  // Default date range for analytics (last 30 days)
  const analyticsDefaultFrom = format(startOfDay(subDays(now, 29)), 'yyyy-MM-dd');
  const analyticsDefaultTo = format(endOfDay(now), 'yyyy-MM-dd');

  const unassignedBookings = unassignedBookingsRaw.map(b => ({
    id: b.id,
    customer: b.customerName,
    service: b.service?.name ?? 'N/A',
    branch: b.branch?.name ?? '—',
    date: format(b.startTime, "d MMM, HH:mm", { locale: dateLocale }),
  }));

  return (
    <DashboardTabsClient
      canUseAnalytics={canUseAnalytics}
      isAdmin={isAdmin}
      defaultFrom={analyticsDefaultFrom}
      defaultTo={analyticsDefaultTo}
      locale={locale}
      plan={tenantPlan ?? undefined}
      pointsEnabled={tenantData?.pointsEnabled ?? false}
    >
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight capitalize">
            Dashboard — <span className="text-purple-600">{monthLabel}</span>
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1 capitalize">
            {todayLabel} · Generado a las {format(now, 'HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CopyLinkButton url={portalUrl} />
          <DashboardExport />
        </div>
      </div>

      {/* ═══ CITAS SIN ASIGNAR ═══ */}
      {unassignedBookings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                Citas por asignar
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                {unassignedBookings.length} cita{unassignedBookings.length !== 1 ? 's' : ''} quedaron sin profesional al eliminar un miembro del equipo. Asígnalas o cancélalas manualmente.
              </p>
            </div>
            <Link
              href={`/${locale}/admin/bookings?status=PENDING_ASSIGNMENT`}
              className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 px-3 py-1.5 rounded-xl transition-colors"
            >
              Ver todas <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {unassignedBookings.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center flex-wrap gap-x-4 gap-y-1 bg-white dark:bg-zinc-900/50 rounded-xl px-4 py-2.5">
                <span className="font-semibold text-sm text-slate-900 dark:text-white w-36 truncate">{b.customer}</span>
                <span className="text-sm text-slate-600 dark:text-zinc-300 flex-1 truncate">{b.service}</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{b.date}</span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">{b.branch}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PORTAL LINK ═══ */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-600/10 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Tu enlace de reservas</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Compártelo con tus clientes para recibir citas directamente</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1.5 shrink-0">
          <span className="text-sm font-mono text-purple-600 dark:text-purple-400 px-2 truncate max-w-[220px]">
            {portalUrl}
          </span>
          <Link
            href={portalUrl}
            target="_blank"
            className="p-2 bg-white dark:bg-zinc-800 text-slate-500 hover:text-purple-600 rounded-lg border border-slate-200 dark:border-white/10 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ═══ SECCIÓN 1: RESUMEN DEL DÍA ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-600 shrink-0" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen del día</h2>
        </div>

        {/* Contadores de estado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total citas', value: todayTotal, color: 'from-purple-600 to-indigo-600', Icon: Calendar },
            { label: 'Confirmadas', value: todayConfirmed, color: 'from-emerald-500 to-teal-600', Icon: CheckCircle },
            { label: 'Pendientes', value: todayPending, color: 'from-amber-500 to-orange-500', Icon: Clock },
            { label: 'Canceladas', value: todayCancelled, color: 'from-red-500 to-rose-600', Icon: XCircle },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <s.Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Alertas: citas sin confirmar en próximas 2 horas */}
        {todayAlerts.length > 0 && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {todayAlerts.length} cita{todayAlerts.length !== 1 ? 's' : ''} pendiente{todayAlerts.length !== 1 ? 's' : ''} en las próximas 2 horas
              </h3>
            </div>
            <div className="space-y-2">
              {todayAlerts.map(a => (
                <div key={a.id} className="flex items-center flex-wrap gap-x-4 gap-y-1 bg-white dark:bg-zinc-900/50 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1 min-w-0 truncate">{a.customer}</span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">{a.service}</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{a.time}</span>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">en {a.minutesLeft} min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximas citas del día */}
        <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-3">
          Próximas citas del día
        </h3>
        {todayUpcoming.length > 0 ? (
          <div className="space-y-2">
            {/* Cabeceras columnas — solo escritorio */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 px-4 py-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Cliente</span><span>Servicio</span><span>Hora</span><span>Staff</span><span>Sucursal</span>
            </div>
            {todayUpcoming.map(b => (
              <div
                key={b.id}
                className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-5 md:items-center hover:border-purple-300 dark:hover:border-purple-800/50 transition-colors shadow-sm"
              >
                <div className="col-span-2 md:col-span-1 font-semibold text-sm text-slate-900 dark:text-white truncate">{b.customer}</div>
                <div className="text-sm text-slate-600 dark:text-zinc-300 truncate">{b.service}</div>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{b.time}</div>
                <div className="flex gap-1.5 items-center text-xs text-slate-500 dark:text-zinc-400">
                  <span className="text-slate-400 dark:text-zinc-600 md:hidden">Staff:</span>
                  <span className="truncate">{b.staffName}</span>
                </div>
                <div className="flex gap-1.5 items-center text-xs text-slate-500 dark:text-zinc-400">
                  <span className="text-slate-400 dark:text-zinc-600 md:hidden">Sucursal:</span>
                  <span className="truncate">{b.branchName}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-400 dark:text-zinc-500">No hay más citas programadas para hoy</p>
          </div>
        )}
      </section>

      {/* ═══ SECCIONES 2 y 3: SEMANA + MES (requiere weeklyMonthlyStats) ═══ */}
      {canUseWeeklyMonthlyStats ? (
        <>
          {/* ═══ SECCIÓN 2: RESUMEN DE LA SEMANA ═══ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-600 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen de la semana</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{thisWeekTotal}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">citas esta semana</p>
                </div>
                <div className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${
                  weekChange > 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : weekChange < 0
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}>
                  {weekChange > 0 ? '↑' : weekChange < 0 ? '↓' : '—'}&nbsp;{Math.abs(weekChange)}% vs semana anterior
                </div>
              </div>
              <WeeklyBarChart thisWeek={thisWeekByDay} prevWeek={prevWeekByDay} />
              <div className="flex items-center gap-5 mt-5 text-xs text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" />
                  Esta semana
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-purple-200 dark:bg-purple-900/40 inline-block" />
                  Semana anterior
                </span>
              </div>
            </div>
          </section>

          {/* ═══ SECCIÓN 3: MÉTRICAS DEL MES ═══ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                Métricas del mes · {monthLabel}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Total citas',      value: monthTotal,          sub: 'en el mes',                                                             alert: false },
                { label: 'Confirmadas',      value: monthConfirmed,      sub: monthTotal > 0 ? `${Math.round((monthConfirmed / monthTotal) * 100)}% del total` : '0%', alert: false },
                { label: 'Canceladas',       value: monthCancelled,      sub: `Tasa: ${cancellationRate}%`,                                            alert: cancellationRate > 20 },
                { label: 'Clientes nuevos',  value: newClientsThisMonth, sub: 'primera cita este mes',                                                 alert: false },
                { label: 'Clientes activos', value: activeClients60Days, sub: 'últ. 60 días',                                                          alert: false },
              ].map(m => (
                <div
                  key={m.label}
                  className={`bg-white dark:bg-zinc-900/50 border rounded-2xl p-4 shadow-sm ${
                    m.alert ? 'border-red-200 dark:border-red-900/40' : 'border-slate-100 dark:border-white/5'
                  }`}
                >
                  <p className={`text-2xl font-bold ${m.alert ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{m.value}</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mt-1">{m.label}</p>
                  <p className={`text-xs mt-0.5 ${m.alert ? 'text-red-400' : 'text-slate-400 dark:text-zinc-500'}`}>{m.sub}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <StatsUpgradeWall />
      )}

      {/* ═══ SECCIÓN 4: RENDIMIENTO DE SERVICIOS ═══ */}
      {topServices.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-purple-600 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Rendimiento de servicios</h2>
          </div>
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            {worstServiceCancellation && worstServiceCancellation.rate > 0 && (
              <div className="mb-5 flex items-center gap-2 flex-wrap bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-xl px-4 py-2.5">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-zinc-400">Mayor tasa de cancelación:</span>
                <span className="text-xs font-bold text-red-500">
                  &ldquo;{worstServiceCancellation.name}&rdquo; — {worstServiceCancellation.rate}%
                </span>
              </div>
            )}
            <div className="space-y-2">
              <div className="hidden md:flex justify-between px-4 py-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                <span>Servicio</span>
                <div className="flex gap-16 pr-2">
                  <span>Citas</span>
                  <span>Cancelación</span>
                </div>
              </div>
              {topServices.map((svc, i) => (
                <div key={svc.name + i} className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
                  <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' :
                    i === 1 ? 'bg-slate-300 dark:bg-zinc-600 text-slate-700 dark:text-white' :
                    i === 2 ? 'bg-orange-600/80 text-white' :
                    'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-400'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1 truncate">{svc.name}</span>
                  <div className="flex items-center gap-8 shrink-0 ml-auto">
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-sm w-8 text-right">{svc.count}</span>
                    <span className={`text-xs font-semibold w-16 text-right ${svc.cancelRate > 20 ? 'text-red-500' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {svc.cancelRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECCIÓN 5: RENDIMIENTO DE STAFF ═══ */}
      {staffPerformance.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Rendimiento de staff</h2>
          </div>

          {topStaff && (
            <div className="mb-4 flex items-center gap-3 flex-wrap bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 rounded-2xl px-4 py-3">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span className="text-sm text-slate-600 dark:text-zinc-300">Staff destacado del mes:</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{topStaff.name}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 ml-auto">{topStaff.attended} finalizadas</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="hidden md:grid md:grid-cols-5 gap-4 px-4 py-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Staff</span>
              <span className="text-center">Finalizadas</span>
              <span className="text-center">Canceladas</span>
              <span className="text-center">Ausencias</span>
              <span className="text-center">Horas ausente</span>
            </div>
            {staffPerformance.map((s, i) => (
              <div
                key={s.name + i}
                className={`bg-white dark:bg-zinc-900/50 border rounded-2xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-5 md:items-center shadow-sm transition-colors hover:border-purple-200 dark:hover:border-purple-800/30 ${
                  i === 0 ? 'border-amber-200 dark:border-amber-800/30' : 'border-slate-100 dark:border-white/5'
                }`}
              >
                <div className="col-span-2 md:col-span-1 flex items-center gap-2 min-w-0">
                  {i === 0 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                  <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{s.name}</span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Finalizadas</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.attended}</span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Canceladas</span>
                  <span className={`font-bold ${s.cancelled > 0 ? 'text-red-500' : 'text-slate-300 dark:text-zinc-600'}`}>{s.cancelled}</span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Ausencias</span>
                  <span className={`font-bold ${s.absenceCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-zinc-600'}`}>{s.absenceCount}</span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Horas ausente</span>
                  <span className="text-sm text-slate-600 dark:text-zinc-300">
                    {s.absenceMinutes > 0 ? `${(s.absenceMinutes / 60).toFixed(1)}h` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECCIÓN 6: RENDIMIENTO POR SUCURSAL ═══ */}
      {showBranchSection && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-purple-600 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Rendimiento por sucursal</h2>
          </div>

          {branchPerformance[0] && (
            <div className="mb-4 flex items-center gap-3 flex-wrap bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 rounded-2xl px-4 py-3">
              <Building className="w-4 h-4 text-purple-500 shrink-0" />
              <span className="text-sm text-slate-600 dark:text-zinc-300">Mayor actividad:</span>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-400">{branchPerformance[0].name}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 ml-auto">{branchPerformance[0].bookings} citas este mes</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="hidden md:grid md:grid-cols-4 gap-4 px-4 py-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Sucursal</span>
              <span className="text-center">Citas</span>
              <span className="text-center">Ausencias</span>
              <span className="text-center">Tiempo ausente</span>
            </div>
            {branchPerformance.map((br, i) => (
              <div
                key={br.name + i}
                className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4 md:items-center shadow-sm"
              >
                <div className="col-span-2 md:col-span-1 font-semibold text-sm text-slate-900 dark:text-white">{br.name}</div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Citas</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{br.bookings}</span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Ausencias</span>
                  <span className={`font-bold ${br.absenceCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-zinc-600'}`}>
                    {br.absenceCount}
                  </span>
                </div>
                <div className="flex justify-between md:justify-center items-center">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 md:hidden">Tiempo ausente</span>
                  <span className="text-sm text-slate-500 dark:text-zinc-400">
                    {br.absenceMinutes > 0 ? `${(br.absenceMinutes / 60).toFixed(1)}h` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECCIÓN 7: ENCUESTAS / SATISFACCIÓN ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-purple-600 shrink-0" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Encuestas / Satisfacción</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Resumen de calificaciones */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="text-center flex-1 flex flex-col items-center justify-center py-4">
              <p className="text-6xl font-black text-slate-900 dark:text-white tabular-nums">
                {avgRating !== null ? avgRating.toFixed(1) : '—'}
              </p>
              <div className="flex gap-0.5 mt-3 text-xl">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < Math.round(avgRating ?? 0) ? 'text-amber-400' : 'text-slate-200 dark:text-zinc-700'}>
                    ★
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">calificación promedio del mes</p>
            </div>
            <div className="mt-4 flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-600 dark:text-zinc-300">Encuestas respondidas</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {reviewsThisMonthRaw.length}
                <span className="text-slate-400 dark:text-zinc-500 font-normal"> / {monthFinalizada}</span>
              </span>
            </div>
          </div>

          {/* Últimas 5 respuestas */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-4">Últimas respuestas</h3>
            {lastReviews.length > 0 ? (
              <div className="space-y-4">
                {lastReviews.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 truncate">{r.service}</p>
                      {r.comment && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{r.comment}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0 capitalize">{r.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm text-slate-400 dark:text-zinc-500 text-center">Sin encuestas este mes</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
    </DashboardTabsClient>
  );
}
