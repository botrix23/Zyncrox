"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin, DollarSign, TrendingUp, Users, Star,
  ChevronUp, ChevronDown, Award, BarChart2,
} from "lucide-react";
import { BranchPerformanceRow, BranchPerformanceResult } from "@/app/actions/analyticsBranch";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Branch color palette (up to 8 branches)
const BRANCH_COLORS = [
  { line: "#9333ea", area: "rgba(147,51,234,0.15)", bg: "bg-purple-500" },
  { line: "#3b82f6", area: "rgba(59,130,246,0.15)", bg: "bg-blue-500" },
  { line: "#10b981", area: "rgba(16,185,129,0.15)", bg: "bg-emerald-500" },
  { line: "#f59e0b", area: "rgba(245,158,11,0.15)", bg: "bg-amber-500" },
  { line: "#ef4444", area: "rgba(239,68,68,0.15)", bg: "bg-red-500" },
  { line: "#8b5cf6", area: "rgba(139,92,246,0.15)", bg: "bg-violet-500" },
  { line: "#06b6d4", area: "rgba(6,182,212,0.15)", bg: "bg-cyan-500" },
  { line: "#ec4899", area: "rgba(236,72,153,0.15)", bg: "bg-pink-500" },
];

// ── Summary Cards ─────────────────────────────────────────────────────────────

function BranchSummaryCards({ data }: { data: BranchPerformanceResult }) {
  const t = useTranslations("Dashboard.analytics.branchPerformance");
  const { summary, rows } = data;

  const cards = [
    {
      label: t("totalAttended"),
      value: summary.totalAttended.toString(),
      sub: t("branchCount", { count: rows.length }),
      icon: MapPin, color: "text-purple-600", bg: "bg-purple-500/10",
    },
    {
      label: t("totalRevenue"),
      value: fmtCurrency(summary.totalRevenue),
      sub: summary.totalAttended > 0
        ? t("avgPerBooking", { amount: fmtCurrency(summary.totalRevenue / summary.totalAttended) })
        : "—",
      icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10",
    },
    {
      label: t("avgCancelRate"),
      value: `${summary.avgCancellationRate}%`,
      sub: t("avgAllBranches"),
      icon: TrendingUp,
      color: summary.avgCancellationRate > 20 ? "text-red-500" : "text-amber-500",
      bg: summary.avgCancellationRate > 20 ? "bg-red-500/10" : "bg-amber-500/10",
    },
    {
      label: t("avgOccupancy"),
      value: summary.avgOccupancy !== null ? `${summary.avgOccupancy}%` : "—",
      sub: t("occupancyHint"),
      icon: BarChart2, color: "text-blue-600", bg: "bg-blue-500/10",
    },
    {
      label: t("topRevenue"),
      value: summary.topByRevenue?.name ?? "—",
      sub: summary.topByRevenue ? fmtCurrency(summary.topByRevenue.revenue) : "—",
      icon: Award, color: "text-emerald-600", bg: "bg-emerald-500/10",
    },
    {
      label: t("topOccupancy"),
      value: summary.topByOccupancy?.name ?? "—",
      sub: summary.topByOccupancy ? `${summary.topByOccupancy.rate}%` : "—",
      icon: Star, color: "text-blue-600", bg: "bg-blue-500/10",
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

// ── Grouped Bar Chart ─────────────────────────────────────────────────────────

function BranchGroupedBarChart({ rows }: { rows: BranchPerformanceRow[] }) {
  const t = useTranslations("Dashboard.analytics.branchPerformance");
  const top = rows.slice(0, 8);
  const maxA = Math.max(...top.map(r => r.attended), 1);
  const maxR = Math.max(...top.map(r => r.revenue), 1);

  if (top.length === 0) {
    return <div className="flex items-center justify-center h-24 text-sm text-slate-400 dark:text-zinc-500">{t("noData")}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {([
        {
          title: t("chartBookings"),
          items: top.map((r, i) => ({ name: r.branchName, val: r.attended, max: maxA, label: String(r.attended), color: BRANCH_COLORS[i % BRANCH_COLORS.length] })),
        },
        {
          title: t("chartRevenue"),
          items: top.map((r, i) => ({ name: r.branchName, val: r.revenue, max: maxR, label: fmtCurrency(r.revenue), color: BRANCH_COLORS[i % BRANCH_COLORS.length] })),
        },
      ]).map(chart => (
        <div key={chart.title}>
          <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">{chart.title}</h4>
          <div className="space-y-2.5">
            {chart.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-600 dark:text-zinc-300 w-28 truncate shrink-0">{item.name}</span>
                <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(item.val / item.max) * 100}%`, backgroundColor: item.color.line }}
                  />
                </div>
                <span className="text-xs font-bold w-20 text-right shrink-0 tabular-nums" style={{ color: item.color.line }}>
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

// ── Multi-line Weekly Trend Chart ─────────────────────────────────────────────

function BranchWeeklyTrendChart({
  weeklyTrend,
  branchNames,
  rows,
}: {
  weeklyTrend: BranchPerformanceResult["weeklyTrend"];
  branchNames: Record<string, string>;
  rows: BranchPerformanceRow[];
}) {
  const t = useTranslations("Dashboard.analytics.branchPerformance");

  if (weeklyTrend.length === 0) {
    return <div className="flex items-center justify-center h-24 text-sm text-slate-400 dark:text-zinc-500">{t("noData")}</div>;
  }

  // Only show branches that appear in the data
  const activeBranchIds = rows
    .filter(r => r.attended > 0 || r.cancelled > 0)
    .slice(0, 6)
    .map(r => r.branchId);

  if (activeBranchIds.length === 0) {
    return <div className="flex items-center justify-center h-24 text-sm text-slate-400 dark:text-zinc-500">{t("noData")}</div>;
  }

  const W = 560;
  const H = 120;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Max value across all branches and weeks
  const maxVal = Math.max(
    1,
    ...weeklyTrend.flatMap(w =>
      activeBranchIds.map(bid => w.branches[bid] ?? 0)
    ),
  );

  const n = weeklyTrend.length;
  const xPos = (i: number) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v: number) => padT + chartH - (v / maxVal) * chartH;

  // Label every nth point so they don't overlap
  const labelEvery = Math.ceil(n / 6);

  return (
    <div>
      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={frac}
            x1={padL} x2={W - padR}
            y1={padT + chartH * (1 - frac)} y2={padT + chartH * (1 - frac)}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
          />
        ))}

        {/* Lines per branch */}
        {activeBranchIds.map((bid, bi) => {
          const color = BRANCH_COLORS[bi % BRANCH_COLORS.length];
          const points = weeklyTrend.map((w, i) => `${xPos(i)},${yPos(w.branches[bid] ?? 0)}`).join(" ");
          // Area polygon
          const areaPoints = [
            `${xPos(0)},${padT + chartH}`,
            ...weeklyTrend.map((w, i) => `${xPos(i)},${yPos(w.branches[bid] ?? 0)}`),
            `${xPos(n - 1)},${padT + chartH}`,
          ].join(" ");

          return (
            <g key={bid}>
              <polygon points={areaPoints} fill={color.area} />
              <polyline
                points={points}
                fill="none"
                stroke={color.line}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Dots at data points */}
              {weeklyTrend.map((w, i) => (
                <circle
                  key={i}
                  cx={xPos(i)} cy={yPos(w.branches[bid] ?? 0)}
                  r="2.5"
                  fill={color.line}
                />
              ))}
            </g>
          );
        })}

        {/* X axis labels */}
        {weeklyTrend.map((w, i) => (
          i % labelEvery === 0 && (
            <text
              key={i}
              x={xPos(i)} y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              fillOpacity="0.4"
            >
              {w.label}
            </text>
          )
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {activeBranchIds.map((bid, bi) => (
          <div key={bid} className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: BRANCH_COLORS[bi % BRANCH_COLORS.length].line }} />
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[120px]">
              {branchNames[bid] ?? bid}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Branch Comparison Table ───────────────────────────────────────────────────

type SortKey = keyof Pick<
  BranchPerformanceRow,
  | "branchName" | "attended" | "cancelled" | "cancellationRate"
  | "revenue" | "newClients" | "recurringClients" | "occupancyRate" | "avgRating"
>;

function BranchTable({ rows }: { rows: BranchPerformanceRow[] }) {
  const t = useTranslations("Dashboard.analytics.branchPerformance");
  const tFilters = useTranslations("Dashboard.analytics.filters");
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
    { key: "branchName", label: t("colBranch") },
    { key: "attended", label: t("colAttended"), right: true },
    { key: "cancelled", label: t("colCancelled"), right: true },
    { key: "cancellationRate", label: t("colCancelRate"), right: true },
    { key: "revenue", label: t("colRevenue"), right: true },
    { key: "newClients", label: t("colNewClients"), right: true },
    { key: "recurringClients", label: t("colRecurring"), right: true },
    { key: "occupancyRate", label: t("colOccupancy"), right: true },
    { key: "avgRating", label: t("colRating"), right: true },
  ];

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />;

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-5 py-3 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors select-none whitespace-nowrap ${col.right ? "text-right" : "text-left"}`}
                >
                  <span className={`inline-flex items-center gap-1 ${col.right ? "justify-end" : ""}`}>
                    {col.label}<SortIcon k={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sorted.map((row, ri) => (
              <tr key={row.branchId} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                {/* Branch name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${BRANCH_COLORS[ri % BRANCH_COLORS.length].line}22` }}
                    >
                      <MapPin
                        className="w-3.5 h-3.5"
                        style={{ color: BRANCH_COLORS[ri % BRANCH_COLORS.length].line }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{row.branchName}</p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                        {row.staffCount} {row.staffCount === 1 ? "especialista" : "especialistas"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-purple-600 dark:text-purple-400">{row.attended}</td>
                <td className="px-5 py-3.5 text-right font-semibold">
                  <span className={row.cancelled > 0 ? "text-red-500" : "text-slate-300 dark:text-zinc-700"}>{row.cancelled}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                    row.cancellationRate > 20
                      ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                      : row.cancellationRate > 10
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400"
                  }`}>
                    {row.cancellationRate}%
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmtCurrency(row.revenue)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{row.newClients}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-semibold text-slate-600 dark:text-zinc-300">{row.recurringClients}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {row.occupancyRate !== null ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.occupancyRate}%`,
                            backgroundColor: row.occupancyRate >= 80 ? "#10b981" : row.occupancyRate >= 50 ? "#9333ea" : "#f59e0b",
                          }}
                        />
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${
                        row.occupancyRate >= 80 ? "text-emerald-600 dark:text-emerald-400"
                        : row.occupancyRate >= 50 ? "text-purple-600 dark:text-purple-400"
                        : "text-amber-600 dark:text-amber-400"
                      }`}>
                        {row.occupancyRate}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 dark:text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {row.avgRating !== null
                    ? <span className="inline-flex items-center gap-1 font-semibold text-amber-500"><Star className="w-3 h-3 fill-amber-400" />{row.avgRating.toFixed(1)}</span>
                    : <span className="text-slate-300 dark:text-zinc-700">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

interface BranchPerformanceTabProps {
  data: BranchPerformanceResult;
  isLoading: boolean;
}

export function BranchPerformanceTab({ data, isLoading }: BranchPerformanceTabProps) {
  const t = useTranslations("Dashboard.analytics.branchPerformance");
  const tFilters = useTranslations("Dashboard.analytics.filters");

  return (
    <div className={`space-y-5 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Summary cards */}
      <BranchSummaryCards data={data} />

      {/* Bar charts */}
      {data.rows.some(r => r.attended > 0) && (
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("chartTitle")}</h3>
          </div>
          <BranchGroupedBarChart rows={data.rows} />
        </div>
      )}

      {/* Weekly trend (multi-line) */}
      {data.weeklyTrend.length > 0 && (
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("trendTitle")}</h3>
          </div>
          <BranchWeeklyTrendChart
            weeklyTrend={data.weeklyTrend}
            branchNames={data.branchNames}
            rows={data.rows}
          />
        </div>
      )}

      {/* Comparison table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("tableTitle")}</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500 hidden sm:block">{tFilters("sortHint")}</span>
        </div>
        <BranchTable rows={data.rows} />
      </div>

      <p className="text-[11px] text-slate-400 dark:text-zinc-600 text-center">{t("footnote")}</p>
    </div>
  );
}
