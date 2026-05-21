"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  RefreshCw, Star, TrendingUp, Users, DollarSign, Repeat2,
  UserPlus, ChevronUp, ChevronDown, AlertTriangle,
} from "lucide-react";
import { RetentionResult, ChurnRiskClient, PopularService } from "@/app/actions/analyticsRetention";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────

function DonutChart({ newCount, recurringCount, newLabel, recurringLabel }: {
  newCount: number;
  recurringCount: number;
  newLabel: string;
  recurringLabel: string;
}) {
  const total = newCount + recurringCount;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className="w-28 h-28 rounded-full border-8 border-slate-100 dark:border-white/10 flex items-center justify-center">
        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
      </div>
    );
  }

  const newFrac = newCount / total;
  const recurFrac = recurringCount / total;
  const newLen = newFrac * circumference;
  const recurLen = recurFrac * circumference;
  const seg2Rotation = -90 + newFrac * 360;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="currentColor" strokeWidth="14"
          className="text-slate-100 dark:text-white/5" />
        {/* New clients segment (purple-600) */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#7c3aed" strokeWidth="14"
          strokeDasharray={`${newLen} ${circumference - newLen}`}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }} />
        {/* Recurring segment (purple-300) */}
        {recurLen > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="#c4b5fd" strokeWidth="14"
            strokeDasharray={`${recurLen} ${circumference - recurLen}`}
            style={{ transform: `rotate(${seg2Rotation}deg)`, transformOrigin: "50px 50px" }} />
        )}
        {/* Center label */}
        <text x="50" y="46" textAnchor="middle" fill="currentColor"
          fontSize="13" fontWeight="bold" className="fill-slate-900 dark:fill-white">
          {total}
        </text>
        <text x="50" y="58" textAnchor="middle" fontSize="7" className="fill-slate-400 dark:fill-zinc-500">
          total
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-purple-600 shrink-0" />
          <span className="text-xs text-slate-600 dark:text-zinc-300 flex-1">{newLabel}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{newCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-purple-300 dark:bg-purple-400 shrink-0" />
          <span className="text-xs text-slate-600 dark:text-zinc-300 flex-1">{recurringLabel}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{recurringCount}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Line Chart (SVG) ─────────────────────────────────────────────────────────

function LineChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-slate-400 dark:text-zinc-500">
        —
      </div>
    );
  }

  const W = 560;
  const H = 180;
  const PAD = { top: 14, right: 16, bottom: 32, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * cW,
    y: PAD.top + (1 - d.count / maxVal) * cH,
    label: d.label,
    count: d.count,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = [
    `${pts[0].x},${PAD.top + cH}`,
    ...pts.map(p => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${PAD.top + cH}`,
  ].join(" ");

  // Grid lines (4)
  const gridYs = [0.25, 0.5, 0.75, 1].map(f => PAD.top + (1 - f) * cH);

  // Label every Nth point to avoid crowding
  const step = Math.ceil(data.length / 8);
  const labelPts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 160 }}>
      {/* Grid lines */}
      {gridYs.map((y, i) => (
        <line key={i} x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
          stroke="currentColor" strokeWidth="0.7" className="text-slate-200 dark:text-white/10" strokeDasharray="4 4" />
      ))}
      {/* Y-axis labels */}
      <text x={PAD.left - 5} y={PAD.top + 4} textAnchor="end" fontSize="9"
        className="fill-slate-400 dark:fill-zinc-500">{maxVal}</text>
      <text x={PAD.left - 5} y={PAD.top + cH + 3} textAnchor="end" fontSize="9"
        className="fill-slate-400 dark:fill-zinc-500">0</text>
      {/* Area fill */}
      <polygon points={area} className="fill-purple-500/10" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#7c3aed"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#7c3aed" />
      ))}
      {/* X-axis labels */}
      {labelPts.map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9"
          className="fill-slate-400 dark:fill-zinc-500">{p.label}</text>
      ))}
    </svg>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({ data, t }: { data: number[][]; t: ReturnType<typeof useTranslations> }) {
  const days = [t("day0"), t("day1"), t("day2"), t("day3"), t("day4"), t("day5"), t("day6")];
  const slots = [t("morning"), t("afternoon"), t("evening")];
  const maxVal = Math.max(...data.flat(), 1);

  function cellClass(val: number): string {
    const ratio = val / maxVal;
    if (val === 0) return "bg-slate-50 dark:bg-white/[0.03] text-slate-300 dark:text-zinc-700";
    if (ratio < 0.2) return "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400";
    if (ratio < 0.4) return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300";
    if (ratio < 0.65) return "bg-purple-300 dark:bg-purple-700/60 text-purple-900 dark:text-white";
    if (ratio < 0.85) return "bg-purple-500 text-white";
    return "bg-purple-700 text-white";
  }

  const hasData = data.flat().some(v => v > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400 dark:text-zinc-500">
        {t("noHeatmapData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[320px] text-xs border-collapse">
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-left text-slate-400 dark:text-zinc-500 font-medium w-10" />
            {slots.map(s => (
              <th key={s} className="pb-2 px-1 text-center text-slate-500 dark:text-zinc-400 font-semibold whitespace-nowrap">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, dayIdx) => (
            <tr key={dayIdx}>
              <td className="py-1 pr-3 font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                {days[dayIdx]}
              </td>
              {row.map((count, slotIdx) => (
                <td key={slotIdx} className="py-1 px-1">
                  <div className={`flex items-center justify-center rounded-lg font-bold h-9 w-full text-[13px] transition-colors ${cellClass(count)}`}>
                    {count > 0 ? count : "—"}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Color scale legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">Bajo</span>
        {["bg-purple-50", "bg-purple-100", "bg-purple-300", "bg-purple-500", "bg-purple-700"].map((c, i) => (
          <span key={i} className={`w-4 h-4 rounded ${c}`} />
        ))}
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">Alto</span>
      </div>
    </div>
  );
}

// ─── Churn Table ──────────────────────────────────────────────────────────────

type ChurnSortKey = "daysSince" | "totalBookings" | "lastVisit" | "name";

function ChurnTable({ clients, t }: {
  clients: ChurnRiskClient[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [sortKey, setSortKey] = useState<ChurnSortKey>("daysSince");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: ChurnSortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...clients].sort((a, b) => {
    let av: string | number = a[sortKey] instanceof Date ? (a[sortKey] as Date).getTime() : a[sortKey] as number | string;
    let bv: string | number = b[sortKey] instanceof Date ? (b[sortKey] as Date).getTime() : b[sortKey] as number | string;
    if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  if (clients.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-8 text-center text-sm text-slate-400 dark:text-zinc-500">
        {t("noChurnRisk")}
      </div>
    );
  }

  const SortIcon = ({ k }: { k: ChurnSortKey }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />;

  const thCls = "px-4 py-3 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors select-none whitespace-nowrap";

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5">
              <th className={`${thCls} text-left`} onClick={() => handleSort("name")}>
                <span className="inline-flex items-center gap-1">{t("colName")}<SortIcon k="name" /></span>
              </th>
              <th className={`${thCls} text-left`}>{t("colEmail")}</th>
              <th className={`${thCls} text-right`} onClick={() => handleSort("lastVisit")}>
                <span className="inline-flex items-center gap-1 justify-end">{t("colLastVisit")}<SortIcon k="lastVisit" /></span>
              </th>
              <th className={`${thCls} text-right`} onClick={() => handleSort("daysSince")}>
                <span className="inline-flex items-center gap-1 justify-end">{t("colDaysSince")}<SortIcon k="daysSince" /></span>
              </th>
              <th className={`${thCls} text-right`} onClick={() => handleSort("totalBookings")}>
                <span className="inline-flex items-center gap-1 justify-end">{t("colTotalBookings")}<SortIcon k="totalBookings" /></span>
              </th>
              <th className={`${thCls} text-left`}>{t("colLastService")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sorted.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-semibold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                  {c.name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-zinc-400 max-w-[180px] truncate">
                  {c.email || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                  {format(c.lastVisit, "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                    c.daysSince > 120 ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                    : c.daysSince > 90 ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400"
                  }`}>
                    {c.daysSince}d
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-sm text-purple-600 dark:text-purple-400 tabular-nums">
                  {c.totalBookings}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-zinc-400 max-w-[160px] truncate">
                  {c.lastService}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Popular Services Table ───────────────────────────────────────────────────

function ServicesTable({ services, t }: {
  services: PopularService[];
  t: ReturnType<typeof useTranslations>;
}) {
  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-8 text-center text-sm text-slate-400 dark:text-zinc-500">
        {t("noServices")}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5">
              {[t("colService"), t("colBookedCount"), t("colRevenue"), t("colAvgRating")].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {services.map((s, i) => (
              <tr key={s.serviceId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 dark:bg-zinc-600 text-slate-800 dark:text-white" : i === 2 ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400"
                    }`}>{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                  {s.bookingCount}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmtCurrency(s.revenue)}
                </td>
                <td className="px-4 py-3 text-right">
                  {s.avgRating !== null ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {s.avgRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-zinc-700 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClientRetentionTabProps {
  data: RetentionResult;
  isLoading: boolean;
  churnDays: number;
  onChurnDaysChange: (days: number) => void;
}

export function ClientRetentionTab({ data, isLoading, churnDays, onChurnDaysChange }: ClientRetentionTabProps) {
  const t = useTranslations("Dashboard.analytics.clientRetention");

  // ── Summary cards ──────────────────────────────────────────────────────────
  const cards = [
    {
      label: t("retention30d"),
      value: `${data.retention30d}%`,
      sub: t("retentionSub", { pct: data.retention30d }),
      icon: Repeat2,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      label: t("retention60d"),
      value: `${data.retention60d}%`,
      sub: t("retentionSub", { pct: data.retention60d }),
      icon: Repeat2,
      color: "text-indigo-600",
      bg: "bg-indigo-500/10",
    },
    {
      label: t("retention90d"),
      value: `${data.retention90d}%`,
      sub: t("retentionSub", { pct: data.retention90d }),
      icon: Repeat2,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: t("visitFrequency"),
      value: data.avgFrequencyDays !== null ? `${data.avgFrequencyDays}d` : "—",
      sub: data.avgFrequencyDays !== null ? t("freqSub", { days: data.avgFrequencyDays }) : "—",
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: t("ltv"),
      value: data.ltv !== null ? `$${data.ltv.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—",
      sub: t("ltvSub"),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: t("newClients"),
      value: data.newCount.toString(),
      sub: t("newClientsSub"),
      icon: UserPlus,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      label: t("recurringClients"),
      value: data.recurringCount.toString(),
      sub: t("recurringClientsSub"),
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>

      {/* ── Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">{c.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-snug line-clamp-2">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts row: Donut + Line ── */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Donut */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center gap-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white self-start">{t("donutTitle")}</h4>
          <DonutChart
            newCount={data.newCount}
            recurringCount={data.recurringCount}
            newLabel={t("newLabel")}
            recurringLabel={t("recurringLabel")}
          />
        </div>

        {/* Line chart */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t("lineTitle")}</h4>
          {data.weeklyTrend.length >= 2 ? (
            <LineChart data={data.weeklyTrend} />
          ) : (
            <div className="flex items-center justify-center h-20 text-sm text-slate-400 dark:text-zinc-500">
              {t("noLineData")}
            </div>
          )}
        </div>
      </div>

      {/* ── Heatmap ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t("heatmapTitle")}</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t("heatmapSubtitle")}</p>
        </div>
        <Heatmap data={data.heatmap} t={t} />
      </div>

      {/* ── Popular services ── */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t("servicesTitle")}</h4>
        <ServicesTable services={data.popularServices} t={t} />
      </div>

      {/* ── Churn risk ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              {t("churnTitle")}
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {t("churnSubtitle", { days: churnDays })}
            </p>
          </div>
          {/* Churn threshold selector */}
          <div className="sm:ml-auto flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 shrink-0">
            <span className="text-xs text-slate-500 dark:text-zinc-400">{t("churnDaysLabel")}:</span>
            <select
              value={churnDays}
              onChange={e => onChurnDaysChange(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none"
            >
              {[30, 45, 60, 90, 120, 180].map(d => (
                <option key={d} value={d}>{d} {t("churnDaysSuffix")}</option>
              ))}
            </select>
          </div>
        </div>
        <ChurnTable clients={data.churnRiskClients} t={t} />
      </div>
    </div>
  );
}
