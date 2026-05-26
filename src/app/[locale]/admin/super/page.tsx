import { getSuperAdminDashboardDataAction } from '@/app/actions/superAdmin';
import {
  Building2, Users, Calendar, TrendingUp, ShieldAlert,
  CheckCircle, Clock, XCircle, AlertTriangle, Activity,
  FileText, ArrowRight, Wifi, WifiOff, RefreshCw,
  DollarSign, CreditCard, BarChart3, Target,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es as dateEs, enUS } from 'date-fns/locale';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig = {
  ACTIVE:    { label: 'Activa',     icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  TRIAL:     { label: 'Trial',      icon: Clock,        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  SUSPENDED: { label: 'Suspendida', icon: XCircle,      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
};

const planColor: Record<string, string> = {
  BASIC:        'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5',
  PROFESSIONAL: 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10',
  ENTERPRISE:   'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10',
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Business',
};

const auditActionConfig: Record<string, { color: string; label: string }> = {
  LOGIN_SUCCESS:         { color: 'text-emerald-500', label: 'Login exitoso' },
  LOGIN_FAILED:          { color: 'text-rose-500',    label: 'Login fallido' },
  LOGOUT:                { color: 'text-zinc-400',    label: 'Logout' },
  TENANT_REGISTERED:     { color: 'text-blue-500',    label: 'Empresa registrada' },
  TENANT_STATUS_CHANGED: { color: 'text-amber-500',   label: 'Estado cambiado' },
  TENANT_DELETED:        { color: 'text-rose-600',    label: 'Empresa eliminada' },
  IMPERSONATION_STARTED: { color: 'text-purple-500',  label: 'Impersonación iniciada' },
  IMPERSONATION_ENDED:   { color: 'text-zinc-400',    label: 'Impersonación terminada' },
  SETTINGS_UPDATED:      { color: 'text-blue-400',    label: 'Configuración actualizada' },
  BOOKING_CREATED:       { color: 'text-teal-500',    label: 'Reserva creada' },
  SERVICE_CREATED:       { color: 'text-indigo-500',  label: 'Servicio creado' },
  SERVICE_UPDATED:       { color: 'text-indigo-400',  label: 'Servicio actualizado' },
  SERVICE_DELETED:       { color: 'text-rose-400',    label: 'Servicio eliminado' },
  STAFF_CREATED:         { color: 'text-cyan-500',    label: 'Staff creado' },
  STAFF_UPDATED:         { color: 'text-cyan-400',    label: 'Staff actualizado' },
  STAFF_DELETED:         { color: 'text-rose-400',    label: 'Staff eliminado' },
  CRON_REMINDERS_RUN:    { color: 'text-violet-500',  label: 'Cron recordatorios' },
};

// ─── Card base class ──────────────────────────────────────────────────────────
const card = 'bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl';

// ─── Mini bar chart (SVG, server-rendered) ────────────────────────────────────
function BookingsBarChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const chartH = 62;
  const barW = 40;
  const gap = 14;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 28}`} className="w-full overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max((d.total / max) * chartH, d.total > 0 ? 4 : 2);
        const x = i * (barW + gap);
        const y = chartH - barH;
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={isLast ? '#7c3aed' : '#4c1d95'} rx={4} />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill="#71717a" fontSize="10">{d.total}</text>
            )}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fill="#52525b" fontSize="10">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: any; accent: string;
}) {
  return (
    <div className={`${card} p-5 hover:border-zinc-300 dark:hover:border-white/10 transition-all`}>
      <div className={`inline-flex p-2.5 rounded-xl mb-4 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black mt-1 tracking-tight text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, href, linkLabel }: {
  icon: any; title: string; subtitle?: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-4">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-500 shrink-0" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 ml-6">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-400 font-semibold shrink-0 whitespace-nowrap">
          {linkLabel ?? 'Ver todo'} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SuperAdminDashboard({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'es';
  const [data, t] = await Promise.all([
    getSuperAdminDashboardDataAction(),
    getTranslations({ locale, namespace: 'SuperAdmin' }),
  ]);
  const dateLocale = locale === 'en' ? enUS : dateEs;

  const {
    totalTenants, activeTenants, trialTenants, suspendedTenants,
    newTenantsThisMonth, totalUsers, totalBookingsThisMonth, totalBookingsThisYear,
    tenantActivity, top5Active, churnRisk, bookingsByMonth,
    recentLogs, lastCronRun, wompiConfigured, expiringIn7Days,
    mrr, revenueThisMonth, lastPayment, trialConversion,
  } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ShieldAlert className="w-6 h-6 text-purple-500" />
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">{t('title')}</h1>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t('subtitle')}</p>
      </div>

      {/* ── 1. Resumen de la plataforma ────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Activity} title={t('platform.title')} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('platform.registeredCompanies')} value={totalTenants}
            sub={t('platform.registeredCompaniesSub', { active: activeTenants, trial: trialTenants, suspended: suspendedTenants })}
            icon={Building2} accent="bg-purple-600/20 text-purple-500" />
          <StatCard label={t('platform.newThisMonth')} value={newTenantsThisMonth}
            sub={t('platform.newThisMonthSub')}
            icon={TrendingUp} accent="bg-emerald-600/20 text-emerald-500" />
          <StatCard label={t('platform.totalUsers')} value={totalUsers}
            sub={t('platform.totalUsersSub')}
            icon={Users} accent="bg-blue-600/20 text-blue-500" />
          <StatCard label={t('platform.bookingsThisMonth')} value={totalBookingsThisMonth}
            sub={t('platform.bookingsThisMonthSub')}
            icon={Calendar} accent="bg-amber-600/20 text-amber-500" />
        </div>
      </section>

      {/* ── 2. Citas globales ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} p-5`}>
          <SectionHeader icon={TrendingUp} title={t('chart.title')} subtitle={t('chart.subtitle')} />
          <BookingsBarChart data={bookingsByMonth} />
        </div>
        <div className="space-y-4">
          <div className={`${card} p-6 flex flex-col justify-center`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-1">{t('chart.yearTotal')}</p>
            <p className="text-5xl font-black text-purple-500 tracking-tight">{totalBookingsThisYear}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('chart.yearTotalSub')}</p>
          </div>
          {expiringIn7Days.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{t('chart.expiringTitle')}</p>
              </div>
              <div className="space-y-1.5">
                {expiringIn7Days.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 truncate mr-2">{t.name}</span>
                    <span className={`font-bold shrink-0 ${t.daysLeft! <= 2 ? 'text-rose-500' : 'text-amber-500'}`}>{t.daysLeft}d</span>
                  </div>
                ))}
                {expiringIn7Days.length > 4 && <p className="text-xs text-zinc-600 dark:text-zinc-400">{t('chart.expiringMore', { count: expiringIn7Days.length - 4 })}</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Actividad por empresa ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table — desktop + mobile cards */}
        <div className={`lg:col-span-2 ${card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/5">
            <SectionHeader
              icon={Building2} title={t('activity.title')}
              subtitle={t('activity.subtitle')}
              href={`/${locale}/admin/super/tenants`} linkLabel={t('activity.manageCompanies')}
            />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200 dark:border-white/5 text-xs">
                  <th className="text-left px-5 py-3 font-semibold">{t('activity.company')}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t('activity.status')}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t('activity.bookingsMonth')}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t('activity.staff')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('activity.lastAccess')}</th>
                </tr>
              </thead>
              <tbody>
                {tenantActivity.map(tenant => {
                  const cfg = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.SUSPENDED;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={tenant.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-sm truncate max-w-[160px] text-zinc-900 dark:text-white">{tenant.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{tenant.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />{t(`tenantStatus.${tenant.status}` as any) || cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${tenant.bookingsThisMonth > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                          {tenant.bookingsThisMonth}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-700 dark:text-zinc-400">{tenant.staffCount}</td>
                      <td className="px-4 py-3">
                        {tenant.lastAccessAt
                          ? <span className="text-xs text-zinc-600 dark:text-zinc-400">{formatDistanceToNow(new Date(tenant.lastAccessAt), { locale: dateLocale, addSuffix: true })}</span>
                          : <span className="text-xs text-zinc-500 dark:text-zinc-500">{t('activity.noRecord')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: vertical cards */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-white/5">
            {tenantActivity.map(tenant => {
              const cfg = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.SUSPENDED;
              const StatusIcon = cfg.icon;
              return (
                <div key={tenant.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{tenant.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{tenant.slug}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />{t(`tenantStatus.${tenant.status}` as any) || cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-0.5">{t('activity.bookingsMonth')}</p>
                      <p className={`font-bold text-sm ${tenant.bookingsThisMonth > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                        {tenant.bookingsThisMonth}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-0.5">{t('activity.staff')}</p>
                      <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{tenant.staffCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-0.5">{t('activity.lastAccess')}</p>
                      <p className="text-zinc-700 dark:text-zinc-400 text-xs leading-tight">
                        {tenant.lastAccessAt
                          ? formatDistanceToNow(new Date(tenant.lastAccessAt), { locale: dateLocale, addSuffix: true })
                          : <span className="text-zinc-500">{t('activity.noRecord')}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 + Churn */}
        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <SectionHeader icon={TrendingUp} title={t('top5.title')} subtitle={t('top5.subtitle')} />
            <div className="space-y-3">
              {top5Active.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs font-black text-zinc-400 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-zinc-900 dark:text-white">{t.name}</p>
                    <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-1 mt-1">
                      <div
                        className="bg-purple-500 h-1 rounded-full transition-all"
                        style={{ width: `${top5Active[0].bookingsThisMonth > 0 ? (t.bookingsThisMonth / top5Active[0].bookingsThisMonth) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-purple-500 shrink-0">{t.bookingsThisMonth}</span>
                </div>
              ))}
              {top5Active.every(tenant => tenant.bookingsThisMonth === 0) && (
                <p className="text-xs text-zinc-500 text-center py-2">{t('activity.noCitasMonth')}</p>
              )}
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-5">
            <SectionHeader icon={AlertTriangle} title={t('churn.title')} subtitle={t('churn.subtitle')} />
            {churnRisk.length === 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('churn.allActive')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {churnRisk.map(tenant => {
                  const cfg = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.SUSPENDED;
                  return (
                    <div key={tenant.id} className="flex items-center justify-between gap-2">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{tenant.name}</p>
                      <span className={`text-xs font-bold shrink-0 ${cfg.color.split(' ')[0]}`}>{t(`tenantStatus.${tenant.status}` as any) || cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Ingresos / suscripciones ───────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={DollarSign} title={t('revenue.title')}
          subtitle={wompiConfigured ? t('revenue.wompiConfigured') : t('revenue.wompiNotConfigured')}
          href={`/${locale}/admin/super/payments`} linkLabel={t('revenue.viewTransactions')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR */}
          <div className={`${card} p-5`}>
            <div className="inline-flex p-2.5 rounded-xl mb-4 bg-purple-600/20 text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold">{t('revenue.mrr')}</p>
            <p className="text-3xl font-black text-purple-500 mt-1">${mrr.toFixed(2)}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('revenue.mrrSub')}</p>
          </div>
          {/* Revenue this month */}
          <div className={`${card} p-5`}>
            <div className="inline-flex p-2.5 rounded-xl mb-4 bg-emerald-600/20 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold">{t('revenue.revenueThisMonth')}</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">${revenueThisMonth.toFixed(2)}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('revenue.revenueThisMonthSub')}</p>
          </div>
          {/* Active subscriptions */}
          <div className={`${card} p-5`}>
            <div className="inline-flex p-2.5 rounded-xl mb-4 bg-blue-600/20 text-blue-500">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold">{t('revenue.activeSubscriptions')}</p>
            <p className="text-3xl font-black text-blue-500 mt-1">{activeTenants}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('revenue.activeSubscriptionsSub', { total: totalTenants })}</p>
          </div>
          {/* Last payment */}
          <div className={`${card} p-5`}>
            <div className="inline-flex p-2.5 rounded-xl mb-4 bg-amber-600/20 text-amber-500">
              <BarChart3 className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold">{t('revenue.lastPayment')}</p>
            {lastPayment ? (
              <>
                <p className="text-lg font-black text-zinc-900 dark:text-white mt-1 truncate">{lastPayment.tenantName}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  ${lastPayment.amount.toFixed(2)} · {PLAN_DISPLAY_NAMES[lastPayment.plan] ?? lastPayment.plan} · {format(lastPayment.createdAt, locale === 'en' ? 'MMM d' : 'd MMM', { locale: dateLocale })}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-zinc-400 mt-1">—</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{t('revenue.lastPaymentNone')}</p>
              </>
            )}
          </div>
        </div>

        {/* Trial / Expiring row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('revenue.onTrial')}</p>
            <p className="text-3xl font-black text-amber-500">{trialTenants}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('revenue.onTrialSub')}</p>
          </div>
          <div className={`${expiringIn7Days.length > 0 ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20' : `bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5`} border rounded-2xl p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('revenue.expiringIn7')}</p>
            <p className={`text-3xl font-black ${expiringIn7Days.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
              {expiringIn7Days.length}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('revenue.expiringIn7Sub')}</p>
          </div>
        </div>
      </section>

      {/* ── 5. Conversión de trials ────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Target} title={t('trialConversion.title')} subtitle={t('trialConversion.subtitle')} />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Trials started */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('trialConversion.trialsStarted')}</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{trialConversion.trialsStarted}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('trialConversion.trialsStartedSub')}</p>
          </div>
          {/* Converted */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('trialConversion.converted')}</p>
            <p className="text-3xl font-black text-emerald-500">{trialConversion.trialsConverted}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('trialConversion.convertedSub')}</p>
          </div>
          {/* Conversion rate */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('trialConversion.conversionRate')}</p>
            <p className={`text-3xl font-black ${trialConversion.conversionRate >= 50 ? 'text-emerald-500' : trialConversion.conversionRate >= 25 ? 'text-amber-500' : 'text-rose-500'}`}>
              {trialConversion.conversionRate}%
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('trialConversion.conversionRateSub')}</p>
          </div>
          {/* Avg days */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('trialConversion.avgDays')}</p>
            <p className="text-3xl font-black text-blue-500">
              {trialConversion.avgDaysToConvert > 0 ? trialConversion.avgDaysToConvert : '—'}
              {trialConversion.avgDaysToConvert > 0 && <span className="text-base font-semibold text-zinc-500 ml-1">d</span>}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('trialConversion.avgDaysSub')}</p>
          </div>
          {/* Abandoned */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-2">{t('trialConversion.abandoned')}</p>
            <p className={`text-3xl font-black ${trialConversion.trialsAbandoned > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
              {trialConversion.trialsAbandoned}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('trialConversion.abandonedSub')}</p>
          </div>
        </div>

        {/* Mini funnel bar — visual */}
        {trialConversion.trialsStarted > 0 && (
          <div className={`${card} p-5 mt-4`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-widest mb-4">Embudo</p>
            <div className="space-y-3">
              {[
                { label: t('trialConversion.trialsStarted'), value: trialConversion.trialsStarted, color: 'bg-zinc-400 dark:bg-zinc-500', pct: 100 },
                { label: t('trialConversion.converted'), value: trialConversion.trialsConverted, color: 'bg-emerald-500', pct: trialConversion.trialsStarted > 0 ? Math.round((trialConversion.trialsConverted / trialConversion.trialsStarted) * 100) : 0 },
                { label: t('trialConversion.abandoned'), value: trialConversion.trialsAbandoned, color: 'bg-rose-500', pct: trialConversion.trialsStarted > 0 ? Math.round((trialConversion.trialsAbandoned / trialConversion.trialsStarted) * 100) : 0 },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 w-32 shrink-0">{row.label}</span>
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-10 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 5 & 6. Auditoría + Estado del sistema ─────────────────────────── */}
      {/*
        ALTURA: el grid item de logs tiene overflow-hidden.
        Según CSS Grid spec, un elemento con overflow != visible usa 0 como
        "automatic minimum size", por lo que el sidebar determina la altura
        de la fila y los logs hacen scroll internamente.
      */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Auditoría — order-2 en mobile para que quede al final */}
        <div className="lg:col-span-2 order-2 lg:order-1 overflow-hidden flex flex-col">
          <div className={`${card} overflow-hidden flex flex-col h-full`}>
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/5 shrink-0">
              <SectionHeader
                icon={FileText} title={t('audit.title')}
                subtitle={t('audit.subtitle')}
                href={`/${locale}/admin/super/logs`} linkLabel={t('audit.viewAll')}
              />
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-white/5 overflow-y-auto flex-1 min-h-0">
              {recentLogs.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-zinc-500">{t('audit.noEvents')}</p>
              ) : recentLogs.map(log => {
                const cfg = auditActionConfig[log.action] || { color: 'text-zinc-400', label: log.action };
                const actionLabel = auditActionConfig[log.action]
                  ? t(`audit.actions.${log.action}` as any)
                  : cfg.label;
                const details = log.details as Record<string, unknown> | null;
                const tenantName = details?.tenantName as string | undefined;
                const adminEmail = details?.superAdminEmail as string | undefined;
                return (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.color.replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${cfg.color}`}>{actionLabel}</span>
                        {tenantName && <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">· {tenantName}</span>}
                        {adminEmail && !tenantName && <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">· {adminEmail}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { locale: dateLocale, addSuffix: true }) : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Estado del sistema — order-1 en mobile (aparece primero) */}
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          <div className={`${card} p-5`}>
            <SectionHeader icon={Activity} title={t('system.title')} />
            <div className="space-y-3">
              {/* Wompi */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {wompiConfigured
                    ? <Wifi className="w-4 h-4 text-emerald-500" />
                    : <WifiOff className="w-4 h-4 text-zinc-400" />}
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('system.wompi')}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${wompiConfigured ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10' : 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-white/5'}`}>
                  {wompiConfigured ? t('system.wompiConfigured') : t('system.wompiNotConfigured')}
                </span>
              </div>

              <div className="border-t border-zinc-100 dark:border-white/5" />

              {/* Cron */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-violet-500" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('system.cron')}</span>
                </div>
                {lastCronRun ? (
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      {(lastCronRun.details?.success !== false)
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                      <span className={`text-xs font-bold ${(lastCronRun.details?.success !== false) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {(lastCronRun.details?.success !== false) ? t('system.cronSuccess') : t('system.cronFailed')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {format(lastCronRun.at, locale === 'en' ? "MMM dd, yyyy 'at' hh:mm a" : "dd MMM yyyy 'a las' HH:mm", { locale: dateLocale })}
                    </p>
                    {typeof lastCronRun.details?.sent === 'number' && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('system.cronSent', { sent: String(lastCronRun.details.sent), failed: String(lastCronRun.details.failed ?? 0) })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="ml-6 text-xs text-zinc-500 dark:text-zinc-400">{t('system.cronNoRecord')}</p>
                )}
              </div>

              <div className="border-t border-zinc-100 dark:border-white/5" />

              {/* Quick links */}
              <div className="space-y-0.5">
                {[
                  { href: `/${locale}/admin/super/tenants`,  label: t('system.manageCompanies') },
                  { href: `/${locale}/admin/super/payments`, label: t('system.wompiConfig') },
                  { href: `/${locale}/admin/super/logs`,     label: t('system.auditLogs') },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors py-1.5">
                    <span>{label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Distribución de planes */}
          <div className={`${card} p-5`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold mb-3">{t('plans.title')}</p>
            {(['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] as const).map(plan => {
              const cnt = data.tenantActivity.filter(ten => ten.plan === plan).length;
              const pct = totalTenants > 0 ? Math.round((cnt / totalTenants) * 100) : 0;
              return (
                <div key={plan} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${planColor[plan]}`}>{PLAN_DISPLAY_NAMES[plan] ?? plan}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{cnt} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${plan === 'ENTERPRISE' ? 'bg-amber-500' : plan === 'PROFESSIONAL' ? 'bg-purple-500' : 'bg-zinc-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
