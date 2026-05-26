"use client";

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Star, Users, Gift, Clock, TrendingUp, Award, Loader2 } from "lucide-react";
import type { LoyaltyAnalyticsResult, LoyaltyTopClient, LoyaltyTopReward, LoyaltyMonthlyPoint } from "@/app/actions/analyticsLoyalty";

// ─── Mini line chart (SVG, no external deps) ─────────────────────────────────

function MiniLineChart({ data }: { data: LoyaltyMonthlyPoint[] }) {
  const locale = useLocale();
  if (!data.length) return null;
  const W = 600;
  const H = 160;
  const PAD = { t: 16, r: 16, b: 28, l: 48 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...data.flatMap(d => [d.earned, d.redeemed]), 1);

  const xPos = (i: number) => PAD.l + (i / (data.length - 1 || 1)) * chartW;
  const yPos = (v: number) => PAD.t + chartH - (v / maxVal) * chartH;

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(" ");

  const earnedPath = toPath(data.map(d => d.earned));
  const redeemedPath = toPath(data.map(d => d.redeemed));

  const fmtMonth = (m: string) => {
    const d = new Date(m + "-01");
    return format(d, "MMM", { locale: locale === "en" ? enUS : es });
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line
          key={f}
          x1={PAD.l} y1={PAD.t + chartH * (1 - f)}
          x2={W - PAD.r} y2={PAD.t + chartH * (1 - f)}
          stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/10"
        />
      ))}
      {/* Earned area fill */}
      <path
        d={`${earnedPath} L${xPos(data.length - 1)},${PAD.t + chartH} L${PAD.l},${PAD.t + chartH} Z`}
        className="fill-purple-500/10"
      />
      {/* Redeemed area fill */}
      <path
        d={`${redeemedPath} L${xPos(data.length - 1)},${PAD.t + chartH} L${PAD.l},${PAD.t + chartH} Z`}
        className="fill-emerald-500/10"
      />
      {/* Earned line */}
      <path d={earnedPath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Redeemed line */}
      <path d={redeemedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(d.earned)} r="3.5" fill="#7c3aed" />
          <circle cx={xPos(i)} cy={yPos(d.redeemed)} r="3.5" fill="#10b981" />
        </g>
      ))}
      {/* X axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={xPos(i)} y={H - 4}
          textAnchor="middle" fontSize="10"
          className="fill-slate-400 dark:fill-zinc-500"
        >
          {fmtMonth(d.month)}
        </text>
      ))}
      {/* Y axis labels */}
      {[0, maxVal].map((v, i) => (
        <text
          key={i}
          x={PAD.l - 6}
          y={i === 0 ? PAD.t + chartH + 4 : PAD.t + 4}
          textAnchor="end" fontSize="9"
          className="fill-slate-400 dark:fill-zinc-500"
        >
          {v.toLocaleString()}
        </text>
      ))}
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: LoyaltyAnalyticsResult;
  isLoading: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoyaltyTab({ data, isLoading }: Props) {
  const locale = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const isEs = locale !== "en";

  const fmtDate = (d: Date | null) =>
    d ? format(new Date(d), "d MMM yyyy", { locale: dateFnsLocale }) : "—";

  const cards = [
    {
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
      label: isEs ? "Clientes con puntos activos" : "Clients with active points",
      value: data.activeClientsCount.toLocaleString(),
    },
    {
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      label: isEs ? "Puntos emitidos este mes" : "Points issued this month",
      value: data.pointsIssuedThisMonth.toLocaleString(),
    },
    {
      icon: Gift,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      label: isEs ? "Canjes este mes" : "Redeems this month",
      value: data.redeemsThisMonth.toLocaleString(),
    },
    {
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-500/10",
      label: isEs ? "Clientes con puntos por vencer (30 días)" : "Clients with expiring points (30 days)",
      value: data.expiringClientsCount > 0
        ? `${data.expiringClientsCount} · ${data.expiringPointsTotal.toLocaleString()} pts`
        : "0",
    },
  ];

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 leading-tight">{c.label}</p>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEs ? "Puntos emitidos vs canjeados (últimos 6 meses)" : "Points issued vs redeemed (last 6 months)"}
          </h3>
        </div>
        <div className="flex items-center gap-4 mb-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-purple-500 inline-block" />
            <span className="text-slate-500 dark:text-zinc-400">{isEs ? "Emitidos" : "Issued"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-emerald-500 inline-block" />
            <span className="text-slate-500 dark:text-zinc-400">{isEs ? "Canjeados" : "Redeemed"}</span>
          </span>
        </div>
        {data.monthlyChart.some(d => d.earned > 0 || d.redeemed > 0) ? (
          <MiniLineChart data={data.monthlyChart} />
        ) : (
          <p className="text-sm text-slate-400 dark:text-zinc-500 py-10 text-center">
            {isEs ? "Sin datos de puntos todavía." : "No points data yet."}
          </p>
        )}
      </div>

      {/* Top clients table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <Award className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEs ? "Top clientes por puntos" : "Top clients by points"}
          </h3>
        </div>

        {data.topClients.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500 p-6 text-center">
            {isEs ? "Sin clientes con puntos todavía." : "No clients with points yet."}
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-white/5">
              {data.topClients.map((c, i) => (
                <div key={c.clientEmail} className="p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 w-5">#{i + 1}</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{c.clientName}</p>
                    <span className="ml-auto text-sm font-black text-purple-600">{c.balance.toLocaleString()} pts</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 pl-7">
                    {isEs ? "Ganados en periodo" : "Earned in period"}: <strong>{c.earnedInPeriod.toLocaleString()}</strong>
                    {" · "}{isEs ? "Canjes" : "Redeems"}: <strong>{c.redeemCount}</strong>
                    {c.lastRedeem && ` · ${fmtDate(c.lastRedeem)}`}
                  </p>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEs ? "Cliente" : "Client"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{isEs ? "Balance" : "Balance"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{isEs ? "Ganados (periodo)" : "Earned (period)"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{isEs ? "Canjes" : "Redeems"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEs ? "Último canje" : "Last redeem"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                  {data.topClients.map((c, i) => (
                    <tr key={c.clientEmail} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-xs font-black text-slate-400">#{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.clientName}</p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500">{c.clientEmail}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-black text-purple-600">{c.balance.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 ml-1">pts</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-zinc-300">{c.earnedInPeriod.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-zinc-300">{c.redeemCount}</td>
                      <td className="px-5 py-3 text-xs text-slate-400 dark:text-zinc-500">{fmtDate(c.lastRedeem)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Top rewards table */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <Gift className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEs ? "Recompensas más canjeadas" : "Most redeemed rewards"}
          </h3>
        </div>

        {data.topRewards.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500 p-6 text-center">
            {isEs ? "Sin canjes todavía." : "No redeems yet."}
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-white/5">
              {data.topRewards.map((r, i) => (
                <div key={r.rewardId} className="p-4 flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.rewardName}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {r.redeemCount} {isEs ? "canjes" : "redeems"} · {r.totalPointsUsed.toLocaleString()} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEs ? "Recompensa" : "Reward"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{isEs ? "Veces canjeada" : "Times redeemed"}</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{isEs ? "Puntos totales usados" : "Total points used"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                  {data.topRewards.map((r, i) => (
                    <tr key={r.rewardId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-xs font-black text-slate-400">#{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-900 dark:text-white">{r.rewardName}</td>
                      <td className="px-5 py-3 text-right text-sm font-black text-emerald-600">{r.redeemCount}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-zinc-300">{r.totalPointsUsed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
