"use client";

import { useState, useTransition, useCallback } from "react";
import {
  TrendingUp, Users, DollarSign, Star, Award, ChevronUp, ChevronDown,
  BarChart2, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { getStaffPerformanceData, StaffPerformanceRow, StaffPerformanceResult, BranchOption } from "@/app/actions/analytics";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subMonths as sub } from "date-fns";
import { es } from "date-fns/locale";

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

function fmtRating(r: number | null): string {
  if (r === null) return "—";
  return r.toFixed(1);
}

type SortKey = keyof Pick<
  StaffPerformanceRow,
  "name" | "attended" | "cancelled" | "cancellationRate" | "noShows" | "revenue" | "avgRating" | "productiveMinutes"
>;

const PRESETS = [
  { label: "Últ. 7 días", key: "7d" as const },
  { label: "Últ. 30 días", key: "30d" as const },
  { label: "Este mes", key: "thisMonth" as const },
  { label: "Mes anterior", key: "prevMonth" as const },
  { label: "Últ. 3 meses", key: "3m" as const },
];

function getPresetDates(key: string): { from: string; to: string } {
  const now = new Date();
  switch (key) {
    case "7d":
      return {
        from: format(startOfDay(subDays(now, 6)), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "30d":
      return {
        from: format(startOfDay(subDays(now, 29)), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "thisMonth":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "prevMonth": {
      const prev = subMonths(now, 1);
      return {
        from: format(startOfMonth(prev), "yyyy-MM-dd"),
        to: format(endOfMonth(prev), "yyyy-MM-dd"),
      };
    }
    case "3m":
      return {
        from: format(startOfDay(subDays(now, 89)), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      };
    default:
      return {
        from: format(startOfDay(subDays(now, 29)), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      };
  }
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary, rows }: { summary: StaffPerformanceResult["summary"]; rows: StaffPerformanceRow[] }) {
  const cards = [
    {
      label: "Citas atendidas",
      value: summary.totalAttended.toString(),
      sub: `${rows.length} especialista${rows.length !== 1 ? "s" : ""}`,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      label: "Ingresos del periodo",
      value: fmtCurrency(summary.totalRevenue),
      sub: summary.totalAttended > 0 ? `${fmtCurrency(summary.totalRevenue / summary.totalAttended)} promedio/cita` : "—",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Tasa de cancelación",
      value: `${summary.avgCancellationRate}%`,
      sub: "promedio del equipo",
      icon: TrendingUp,
      color: summary.avgCancellationRate > 20 ? "text-red-500" : "text-amber-500",
      bg: summary.avgCancellationRate > 20 ? "bg-red-500/10" : "bg-amber-500/10",
    },
    {
      label: "Calificación promedio",
      value: summary.avgRating !== null ? `${summary.avgRating} ★` : "—",
      sub: "del equipo en el periodo",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Top citas",
      value: summary.topByBookings?.name ?? "—",
      sub: summary.topByBookings ? `${summary.topByBookings.count} citas atendidas` : "Sin datos",
      icon: Award,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      label: "Mejor calificación",
      value: summary.topByRating?.name ?? "—",
      sub: summary.topByRating ? `${summary.topByRating.rating.toFixed(1)} ★ promedio` : "Sin reseñas",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <p className={`text-lg font-bold truncate ${c.label === "Top citas" || c.label === "Mejor calificación" ? "text-slate-900 dark:text-white text-base" : "text-slate-900 dark:text-white"}`}>
            {c.value}
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">{c.label}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 leading-tight truncate">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Bar Charts ───────────────────────────────────────────────────────────────

function StaffBarChart({ rows }: { rows: StaffPerformanceRow[] }) {
  const top = [...rows].sort((a, b) => b.attended - a.attended).slice(0, 10);
  const maxAttended = Math.max(...top.map(r => r.attended), 1);
  const maxRevenue = Math.max(...top.map(r => r.revenue), 1);

  if (top.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-zinc-500">
        Sin datos para el periodo seleccionado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Citas atendidas */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
          Citas atendidas por especialista
        </h4>
        <div className="space-y-2.5">
          {top.map((r, i) => (
            <div key={r.staffId} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-4 text-right shrink-0">
                {i + 1}
              </span>
              <span className="text-xs text-slate-600 dark:text-zinc-300 w-28 truncate shrink-0">
                {r.name}
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-700"
                  style={{ width: `${(r.attended / maxAttended) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 w-8 text-right shrink-0">
                {r.attended}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ingresos */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
          Ingresos generados por especialista
        </h4>
        <div className="space-y-2.5">
          {top.map((r, i) => (
            <div key={r.staffId} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-4 text-right shrink-0">
                {i + 1}
              </span>
              <span className="text-xs text-slate-600 dark:text-zinc-300 w-28 truncate shrink-0">
                {r.name}
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-20 text-right shrink-0 tabular-nums">
                {fmtCurrency(r.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Table ───────────────────────────────────────────────────────────

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Especialista" },
  { key: "attended", label: "Atendidas", align: "right" },
  { key: "cancelled", label: "Canceladas", align: "right" },
  { key: "cancellationRate", label: "% Cancelación", align: "right" },
  { key: "noShows", label: "No-shows", align: "right" },
  { key: "revenue", label: "Ingresos", align: "right" },
  { key: "avgRating", label: "Rating", align: "right" },
  { key: "productiveMinutes", label: "Hrs productivas", align: "right" },
];

function StaffTable({ rows }: { rows: StaffPerformanceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("attended");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as number | string | null;
    const bv = b[sortKey] as number | string | null;

    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === "asc"
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-10 text-center">
        <p className="text-sm text-slate-400 dark:text-zinc-500">
          Sin datos de staff para el periodo y filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-5 py-3 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors select-none ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "desc"
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-20" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sorted.map((row, i) => (
              <tr
                key={row.staffId}
                className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
              >
                {/* Name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                        {row.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {row.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                        {row.branchName}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Attended */}
                <td className="px-5 py-3.5 text-right">
                  <span className="font-bold text-purple-600 dark:text-purple-400">{row.attended}</span>
                </td>

                {/* Cancelled */}
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-semibold ${row.cancelled > 0 ? "text-red-500" : "text-slate-300 dark:text-zinc-700"}`}>
                    {row.cancelled}
                  </span>
                </td>

                {/* Cancellation rate */}
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                      row.cancellationRate > 20
                        ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                        : row.cancellationRate > 10
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400"
                    }`}
                  >
                    {row.cancellationRate}%
                  </span>
                </td>

                {/* No-shows */}
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-semibold ${row.noShows > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-300 dark:text-zinc-700"}`}>
                    {row.noShows}
                  </span>
                </td>

                {/* Revenue */}
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {fmtCurrency(row.revenue)}
                  </span>
                </td>

                {/* Avg rating */}
                <td className="px-5 py-3.5 text-right">
                  {row.avgRating !== null ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {row.avgRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-zinc-700 text-sm">—</span>
                  )}
                </td>

                {/* Productive hours */}
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm text-slate-600 dark:text-zinc-300 tabular-nums">
                    {fmtMinutes(row.productiveMinutes)}
                  </span>
                </td>
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

export function AnalyticsClient({ initialData, defaultFrom, defaultTo, locale }: AnalyticsClientProps) {
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>("30d");
  const [data, setData] = useState<StaffPerformanceResult | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branches: BranchOption[] = data?.branches ?? [];

  const fetchData = useCallback(
    (from: string, to: string, branch: string | null) => {
      startTransition(async () => {
        setError(null);
        const result = await getStaffPerformanceData(from, to, branch);
        if (result.ok) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      });
    },
    []
  );

  const handlePreset = (key: string) => {
    const { from, to } = getPresetDates(key);
    setActivePreset(key);
    setDateFrom(from);
    setDateTo(to);
    fetchData(from, to, branchId);
  };

  const handleDateChange = (from: string, to: string) => {
    setActivePreset("custom");
    setDateFrom(from);
    setDateTo(to);
    if (from && to) fetchData(from, to, branchId);
  };

  const handleBranchChange = (bid: string | null) => {
    setBranchId(bid);
    fetchData(dateFrom, dateTo, bid);
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            Analítica avanzada
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Rendimiento del equipo, ingresos y satisfacción del cliente.
          </p>
        </div>

        {/* Refresh indicator */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Cargando datos…</span>
          </div>
        )}
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-wrap">

          {/* Date presets */}
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                disabled={isPending}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activePreset === p.key
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => handleDateChange(e.target.value, dateTo)}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="text-slate-400 dark:text-zinc-500">—</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => handleDateChange(dateFrom, e.target.value)}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Branch filter */}
          {branches.length > 1 && (
            <select
              value={branchId ?? ""}
              onChange={e => handleBranchChange(e.target.value || null)}
              disabled={isPending}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">Todas las sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/20 rounded-2xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchData(dateFrom, dateTo, branchId)}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      )}

      {/* ── Module: Staff Performance ── */}
      {data && !error && (
        <div className={`space-y-5 transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>

          {/* Summary cards */}
          <SummaryCards summary={data.summary} rows={data.rows} />

          {/* Charts */}
          {data.rows.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Comparativo visual
                </h3>
              </div>
              <StaffBarChart rows={data.rows} />
            </div>
          )}

          {/* Sortable table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rendimiento por especialista
              </h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500">
                Haz clic en cualquier columna para ordenar
              </span>
            </div>
            <StaffTable rows={data.rows} />
          </div>

          {/* Legend footnote */}
          <p className="text-[11px] text-slate-400 dark:text-zinc-600 text-center pb-2">
            No-shows: citas confirmadas cuya fecha ya pasó sin ser finalizadas ni canceladas. ·
            Ingresos calculados con precio del servicio en citas finalizadas. ·
            Rating: promedio de reseñas de clientes vinculadas a citas finalizadas del periodo.
          </p>
        </div>
      )}

      {/* ── Empty state (loading first time) ── */}
      {!data && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">Cargando datos de analítica…</p>
        </div>
      )}
    </div>
  );
}
