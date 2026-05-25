'use client';

import { useState, useTransition } from 'react';
import {
  TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Clock, RotateCcw, Search, Filter,
  CreditCard, Receipt, Loader2, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getPlatformTransactionsAction } from '@/app/actions/superAdmin';

type Transaction = Awaited<ReturnType<typeof getPlatformTransactionsAction>>[number];

// ─── Revenue summary card ─────────────────────────────────────────────────────
function RevenueCard({
  label, value, sub, accent, icon: Icon, isPercent = false, positive,
}: {
  label: string; value: number | string; sub: string; accent: string;
  icon: React.ComponentType<{ className?: string }>;
  isPercent?: boolean; positive?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
      <div className={`inline-flex p-2.5 rounded-xl mb-4 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-1 tracking-tight ${
        isPercent
          ? (typeof positive === 'boolean' ? (positive ? 'text-emerald-500' : 'text-rose-500') : 'text-zinc-900 dark:text-white')
          : 'text-zinc-900 dark:text-white'
      }`}>
        {isPercent
          ? `${(value as number) >= 0 ? '+' : ''}${value}%`
          : typeof value === 'number'
            ? `$${value.toFixed(2)}`
            : value}
      </p>
      {sub && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const map: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    SUCCEEDED: { label: t('statusSucceeded'), cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
    FAILED:    { label: t('statusFailed'),    cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',         icon: XCircle },
    PENDING:   { label: t('statusPending'),   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',       icon: Clock },
    REFUNDED:  { label: t('statusRefunded'),  cls: 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400', icon: RotateCcw },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ─── Plan badge ───────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    BASIC: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10',
    PROFESSIONAL: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    ENTERPRISE: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${map[plan] ?? map.BASIC}`}>
      {plan}
    </span>
  );
}

// ─── Revenue bar chart (SVG) ──────────────────────────────────────────────────
function RevenueBarChart({ data, locale }: {
  data: { month: string; monthEs: string; total: number }[];
  locale: string;
}) {
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
        const label = locale === 'en' ? d.month : d.monthEs;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              fill={isLast ? '#7c3aed' : '#4c1d95'} rx={4} />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill="#71717a" fontSize="10">
                ${d.total.toFixed(0)}
              </text>
            )}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fill="#52525b" fontSize="10">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TransactionsTab({
  initialTransactions,
  mrr,
  revenueThisMonth,
  revenuePrevMonth,
  growth,
  revenueByMonth,
  locale,
}: {
  initialTransactions: Transaction[];
  mrr: number;
  revenueThisMonth: number;
  revenuePrevMonth: number;
  growth: number;
  revenueByMonth: { month: string; monthEs: string; total: number }[];
  locale: string;
}) {
  const t = useTranslations('SuperAdmin.paymentsPage');
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function applyFilters() {
    startTransition(async () => {
      const result = await getPlatformTransactionsAction({
        status: statusFilter,
        plan: planFilter,
        tenantSearch: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setTransactions(result);
    });
  }

  function clearFilters() {
    setStatusFilter('ALL');
    setPlanFilter('ALL');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    startTransition(async () => {
      const result = await getPlatformTransactionsAction({});
      setTransactions(result);
    });
  }

  const hasFilters = statusFilter !== 'ALL' || planFilter !== 'ALL' || search || dateFrom || dateTo;

  const card = 'bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl';

  return (
    <div className="space-y-6">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RevenueCard
          label={t('txMrr')} value={mrr} sub={t('txMrrSub')}
          accent="bg-purple-600/20 text-purple-500" icon={TrendingUp}
        />
        <RevenueCard
          label={t('txThisMonth')} value={revenueThisMonth} sub={t('txThisMonthSub')}
          accent="bg-emerald-600/20 text-emerald-500" icon={DollarSign}
        />
        <RevenueCard
          label={t('txPrevMonth')} value={revenuePrevMonth} sub={t('txPrevMonthSub')}
          accent="bg-blue-600/20 text-blue-500" icon={CreditCard}
        />
        <RevenueCard
          label={t('txGrowth')} value={growth} sub={t('txGrowthSub')}
          accent={growth >= 0 ? 'bg-emerald-600/20 text-emerald-500' : 'bg-rose-600/20 text-rose-500'}
          icon={growth >= 0 ? ArrowUpRight : ArrowDownRight}
          isPercent positive={growth >= 0}
        />
      </div>

      {/* ── Revenue chart ───────────────────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <p className="text-sm font-bold text-zinc-900 dark:text-white mb-4">{t('chartTitle')}</p>
        <RevenueBarChart data={revenueByMonth} locale={locale} />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className={`${card} p-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">{t('filterAll')} {t('filterStatus')}</option>
            <option value="SUCCEEDED">{t('statusSucceeded')}</option>
            <option value="FAILED">{t('statusFailed')}</option>
            <option value="PENDING">{t('statusPending')}</option>
            <option value="REFUNDED">{t('statusRefunded')}</option>
          </select>

          {/* Plan */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">{t('filterAll')} {t('colPlan')}</option>
            <option value="BASIC">Basic</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          {/* Company search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('filterCompany')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filter actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
            Filtrar
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 text-sm font-semibold transition"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Transactions table ───────────────────────────────────────────────── */}
      <div className={`${card} overflow-hidden`}>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Receipt className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t('noTransactions')}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">{t('noTransactionsHint')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/80 dark:bg-white/[0.02]">
                    <th className="text-left px-5 py-3 font-semibold">{t('colDate')}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t('colCompany')}</th>
                    <th className="text-center px-4 py-3 font-semibold">{t('colPlan')}</th>
                    <th className="text-center px-4 py-3 font-semibold">{t('colPeriod')}</th>
                    <th className="text-right px-4 py-3 font-semibold">{t('colAmount')}</th>
                    <th className="text-center px-4 py-3 font-semibold">{t('colStatus')}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t('colReference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors last:border-0">
                      <td className="px-5 py-3">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(tx.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(tx.createdAt).toLocaleTimeString(locale === 'en' ? 'en-US' : 'es', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[160px]">{tx.tenantName}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PlanBadge plan={tx.plan} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          {tx.period === 'MONTHLY' ? t('periodMonthly') : t('periodAnnual')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          ${parseFloat(String(tx.amount)).toFixed(2)}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1">{tx.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={tx.status} t={t} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-[120px] block">
                          {tx.n1coTransactionId ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-white/5">
              {transactions.map(tx => (
                <div key={tx.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{tx.tenantName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(tx.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white shrink-0">
                      ${parseFloat(String(tx.amount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PlanBadge plan={tx.plan} />
                    <StatusBadge status={tx.status} t={t} />
                    <span className="text-xs text-zinc-400">
                      · {tx.period === 'MONTHLY' ? t('periodMonthly') : t('periodAnnual')}
                    </span>
                  </div>
                  {tx.n1coTransactionId && (
                    <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">{tx.n1coTransactionId}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
