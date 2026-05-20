"use client";

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp, Users, DollarSign, Star, Award, ChevronUp, ChevronDown,
  BarChart2, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  format, subDays, startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay,
} from "date-fns";

import {
  getStaffPerformanceData,
  StaffPerformanceRow,
  StaffPerformanceResult,
  BranchOption,
} from "@/app/actions/analytics";
import {
  getClientRetentionData,
  RetentionResult,
} from "@/app/actions/analyticsRetention";
import { ClientRetentionTab } from "./ClientRetentionTab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMinutes(mins: number): string {
  if (mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SortKey = keyof Pick<
  StaffPerformanceRow,
  "name" | "attended" | "cancelled" | "cancellationRate" | "noShows" | "revenue" | "avgRating" | "productiveMinutes"
>;

type TabKey = "staffPerformance" | "clientRetention";

// ─── Date presets ─────────────────────────────────────────────────────────────

type PresetKey = "7d" | "30d" | "thisMonth" | "prevMonth" | "3m";

function getPresetDates(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  switch (key) {
    case "7d":
      return { from: format(startOfDay(subDays(now, 6)), "yyyy-MM-dd"), to: format(endOfDay(now), "yyyy-MM-dd") };
    case "30d":
      return { from: format(startOfDay(subDays(now, 29)), "yyyy-MM-dd"), to: format(endOfDay(now), "yyyy-MM-dd") };
    case "thisMonth":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    case "prevMonth": {
      const prev = subMonths(now, 1);
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd") };
    }
    case "3m":
      return { from: format(startOfDay(subDays(now, 89)), "yyyy-MM-dd"), to: format(endOfDay(now), "yyyy-MM-dd") };
  }
}

// ─── Staff Performance sub-components ────────────────────────────────────────

function SummaryCards({ summary, rows, t }: {
  summary: StaffPerformanceResult["summary"];
  rows: StaffPerformanceRow[];
  t: ReturnType<typeof useTranslations<"Dashboard.analytics.staffPerformance">>;
}) {
  const cards = [
    {
      label: t("attended"),
      value: summary.totalAttended.toString(),
      sub: t("specialists", { count: rows.length }),
      icon: Users, color: "text-purple-600", bg: "bg-purple-500/10",
    },
    {
      label: t("periodRevenue"),
      value: fmtCurrency(summary.totalRevenue),
      sub: summary.totalAttended > 0 ? t("avgPerBooking", { amount: fmtCurrency(summary.totalRevenue / summary.totalAttended) }) : "—",
      icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10",
    },
    {
      label: t("cancellationRate"),
      value: `${summary.avgCancellationRate}%`,
      sub: t("avgTeamCancel"),
      icon: TrendingUp,
      color: summary.avgCancellationRate > 20 ? "text-red-500" : "text-amber-500",
      bg: summary.avgCancellationRate > 20 ? "bg-red-500/10" : "bg-amber-500/10",
    },
    {
      label: t("avgRating"),
      value: summary.avgRating !== null ? `${summary.avgRating} ★` : "—",
      sub: t("teamPeriod"),
      icon: Star, color: "text-amber-500", bg: "bg-amber-500/10",
    },
    {
      label: t("topBookings"),
      value: summary.topByBookings?.name ?? "—",
      sub: summary.topByBookings ? `${summary.topByBookings.count} citas` : "—",
      icon: Award, color: "text-purple-600", bg: "bg-purple-500/10",
    },
    {
      label: t("bestRating"),
      value: summary.topByRating?.name ?? "—",
      sub: summary.topByRating ? `${summary.topByRating.rating.toFixed(1)} ★` : t("noRating"),
      icon: Star, color: "text-amber-500", bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate">{c.value}</p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">{c.label}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-tight truncate">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function StaffBarChart({ rows, t }: {
  rows: StaffPerformanceRow[];
  t: ReturnType<typeof useTranslations<"Dashboard.analytics.staffPerformance">>;
}) {
  const top = [...rows].sort((a, b) => b.attended - a.attended).slice(0, 10);
  const maxA = Math.max(...top.map(r => r.attended), 1);
  const maxR = Math.max(...top.map(r => r.revenue), 1);

  if (top.length === 0) {
    return <div className="flex items-center justify-center h-24 text-sm text-slate-400 dark:text-zinc-500">{t("noData")}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[
        { title: t("chartCitas"), items: top.map(r => ({ name: r.name, val: r.attended, max: maxA, label: String(r.attended), color: "bg-purple-600" })) },
        { title: t("chartIngresos"), items: top.map(r => ({ name: r.name, val: r.revenue, max: maxR, label: fmtCurrency(r.revenue), color: "bg-emerald-500" })) },
      ].map(chart => (
        <div key={chart.title}>
          <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">{chart.title}</h4>
          <div className="space-y-2.5">
            {chart.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-600 dark:text-zinc-300 w-28 truncate shrink-0">{item.name}</span>
                <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${(item.val / item.max) * 100}%` }} />
                </div>
                <span className={`text-xs font-bold w-20 text-right shrink-0 tabular-nums ${item.color === "bg-purple-600" ? "text-purple-600 dark:text-purple-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffTable({ rows, t }: {
  rows: StaffPerformanceRow[];
  t: ReturnType<typeof useTranslations<"Dashboard.analytics.staffPerformance">>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("attended");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as number | string | null;
    const bv = b[sortKey] as number | string | null;
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-10 text-center text-sm text-slate-400 dark:text-zinc-500">
        {t("noData")}
      </div>
    );
  }

  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: "name", label: t("colName") },
    { key: "attended", label: t("colAttended"), right: true },
    { key: "cancelled", label: t("colCancelled"), right: true },
    { key: "cancellationRate", label: t("colCancelRate"), right: true },
    { key: "noShows", label: t("colNoShows"), right: true },
    { key: "revenue", label: t("colRevenue"), right: true },
    { key: "avgRating", label: t("colRating"), right: true },
    { key: "productiveMinutes", label: t("colHours"), right: true },
  ];

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />;

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5">
              {cols.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className={`px-5 py-3 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors select-none whitespace-nowrap ${col.right ? "text-right" : "text-left"}`}>
                  <span className={`inline-flex items-center gap-1 ${col.right ? "justify-end" : ""}`}>
                    {col.label}<SortIcon k={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sorted.map(row => (
              <tr key={row.staffId} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{row.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{row.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">{row.branchName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-purple-600 dark:text-purple-400">{row.attended}</td>
                <td className="px-5 py-3.5 text-right font-semibold">
                  <span className={row.cancelled > 0 ? "text-red-500" : "text-slate-300 dark:text-zinc-700"}>{row.cancelled}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                    row.cancellationRate > 20 ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                    : row.cancellationRate > 10 ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400"
                  }`}>{row.cancellationRate}%</span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold">
                  <span className={row.noShows > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-300 dark:text-zinc-700"}>{row.noShows}</span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCurrency(row.revenue)}</td>
                <td className="px-5 py-3.5 text-right">
                  {row.avgRating !== null
                    ? <span className="inline-flex items-center gap-1 font-semibold text-amber-500"><Star className="w-3 h-3 fill-amber-400" />{row.avgRating.toFixed(1)}</span>
                    : <span className="text-slate-300 dark:text-zinc-700">—</span>}
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-slate-600 dark:text-zinc-300 tabular-nums">{fmtMinutes(row.productiveMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main AnalyticsClient ─────────────────────────────────────────────────────

interface AnalyticsClientProps {
  initialData: StaffPerformanceResult | null;
  defaultFrom: string;
  defaultTo: string;
  locale: string;
}

export function AnalyticsClient({ initialData, defaultFrom, defaultTo }: AnalyticsClientProps) {
  const t = useTranslations("Dashboard.analytics");
  const tStaff = useTranslations("Dashboard.analytics.staffPerformance");
  const tFilters = useTranslations("Dashboard.analytics.filters");

  // ── State ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("staffPerformance");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey | "custom">("30d");

  const [staffData, setStaffData] = useState<StaffPerformanceResult | null>(initialData);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionResult | null>(null);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionDirty, setRetentionDirty] = useState(false); // needs re-fetch
  const [churnDays, setChurnDays] = useState(60);

  const [isStaffPending, startStaffTransition] = useTransition();
  const [isRetentionPending, startRetentionTransition] = useTransition();

  const branches: BranchOption[] = staffData?.branches ?? retentionData?.branches ?? [];

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchStaff = useCallback((from: string, to: string, branch: string | null) => {
    startStaffTransition(async () => {
      setStaffError(null);
      const r = await getStaffPerformanceData(from, to, branch);
      if (r.ok) setStaffData(r.data); else setStaffError(r.error);
    });
  }, []);

  const fetchRetention = useCallback((from: string, to: string, branch: string | null, churn: number) => {
    startRetentionTransition(async () => {
      setRetentionError(null);
      const r = await getClientRetentionData(from, to, branch, churn);
      if (r.ok) { setRetentionData(r.data); setRetentionDirty(false); }
      else setRetentionError(r.error);
    });
  }, []);

  // ── Filter handlers ───────────────────────────────────────────────────────────

  const applyFilters = useCallback((from: string, to: string, branch: string | null) => {
    fetchStaff(from, to, branch);
    // Mark retention as dirty; it will re-fetch when tab is visited
    setRetentionDirty(true);
    if (activeTab === "clientRetention") fetchRetention(from, to, branch, churnDays);
  }, [activeTab, churnDays, fetchStaff, fetchRetention]);

  const handlePreset = (key: PresetKey) => {
    const { from, to } = getPresetDates(key);
    setActivePreset(key);
    setDateFrom(from);
    setDateTo(to);
    applyFilters(from, to, branchId);
  };

  const handleDateChange = (from: string, to: string) => {
    setActivePreset("custom");
    setDateFrom(from);
    setDateTo(to);
    if (from && to) applyFilters(from, to, branchId);
  };

  const handleBranchChange = (bid: string | null) => {
    setBranchId(bid);
    applyFilters(dateFrom, dateTo, bid);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "clientRetention" && (retentionData === null || retentionDirty)) {
      fetchRetention(dateFrom, dateTo, branchId, churnDays);
    }
  };

  const handleChurnDaysChange = (days: number) => {
    setChurnDays(days);
    fetchRetention(dateFrom, dateTo, branchId, days);
  };

  const isPending = activeTab === "staffPerformance" ? isStaffPending : isRetentionPending;
  const hasError = activeTab === "staffPerformance" ? staffError : retentionError;

  const PRESETS: { key: PresetKey; label: string }[] = [
    { key: "7d", label: tFilters("last7d") },
    { key: "30d", label: tFilters("last30d") },
    { key: "thisMonth", label: tFilters("thisMonth") },
    { key: "prevMonth", label: tFilters("prevMonth") },
    { key: "3m", label: tFilters("last3m") },
  ];

  return (
    <div className="space-y-5 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            {t("title")}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">{t("subtitle")}</p>
        </div>
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("loading")}</span>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
        {(["staffPerformance", "clientRetention"] as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 sm:flex-none text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-150 whitespace-nowrap ${
              activeTab === tab
                ? "bg-white dark:bg-zinc-900 text-purple-600 shadow-sm"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            {t(`tabs.${tab}` as any)}
          </button>
        ))}
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Presets + date inputs row */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => handlePreset(p.key)} disabled={isPending}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activePreset === p.key
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}>
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <input type="date" value={dateFrom} max={dateTo}
                onChange={e => handleDateChange(e.target.value, dateTo)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors" />
              <span className="text-slate-400 dark:text-zinc-500 text-xs">—</span>
              <input type="date" value={dateTo} min={dateFrom}
                onChange={e => handleDateChange(dateFrom, e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors" />
            </div>
          </div>
          {/* Branch filter */}
          {branches.length > 1 && (
            <div className="flex items-center gap-2">
              <select value={branchId ?? ""} onChange={e => handleBranchChange(e.target.value || null)} disabled={isPending}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors">
                <option value="">{tFilters("allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {hasError && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/20 rounded-2xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{hasError}</p>
          <button onClick={() => activeTab === "staffPerformance" ? fetchStaff(dateFrom, dateTo, branchId) : fetchRetention(dateFrom, dateTo, branchId, churnDays)}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
            <RefreshCw className="w-3 h-3" />{t("retry")}
          </button>
        </div>
      )}

      {/* ── Tab content ── */}

      {/* Staff Performance */}
      {activeTab === "staffPerformance" && staffData && !staffError && (
        <div className={`space-y-5 transition-opacity duration-200 ${isStaffPending ? "opacity-50 pointer-events-none" : ""}`}>
          <SummaryCards summary={staffData.summary} rows={staffData.rows} t={tStaff} />

          {staffData.rows.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tStaff("chartTitle")}</h3>
              </div>
              <StaffBarChart rows={staffData.rows} t={tStaff} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tStaff("tableTitle")}</h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500 hidden sm:block">{tFilters("sortHint")}</span>
            </div>
            <StaffTable rows={staffData.rows} t={tStaff} />
          </div>

          <p className="text-[11px] text-slate-400 dark:text-zinc-600 text-center">{tStaff("footnote")}</p>
        </div>
      )}

      {/* Client Retention */}
      {activeTab === "clientRetention" && retentionData && !retentionError && (
        <ClientRetentionTab
          data={retentionData}
          isLoading={isRetentionPending}
          churnDays={churnDays}
          onChurnDaysChange={handleChurnDaysChange}
        />
      )}

      {/* Loading placeholder (first load) */}
      {((activeTab === "staffPerformance" && !staffData && !staffError) ||
        (activeTab === "clientRetention" && !retentionData && !retentionError)) && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">{t("loading")}</p>
        </div>
      )}
    </div>
  );
}
