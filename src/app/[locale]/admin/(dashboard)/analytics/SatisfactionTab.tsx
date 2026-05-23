"use client";

import { Star, TrendingUp, MessageSquare, AlertTriangle, Users, ThumbsUp, Minus, ThumbsDown, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SatisfactionResult } from "@/app/actions/analyticsSatisfaction";

// ── Helpers ───────────────────────────────────────────────────────────────────

function npsColor(score: number | null): string {
  if (score === null) return "text-slate-300 dark:text-zinc-600";
  if (score > 70)  return "text-emerald-600 dark:text-emerald-400";
  if (score > 30)  return "text-green-500 dark:text-green-400";
  if (score > 0)   return "text-amber-500 dark:text-amber-400";
  return "text-rose-500 dark:text-rose-400";
}

function npsBg(score: number | null): string {
  if (score === null) return "bg-slate-100 dark:bg-white/5";
  if (score > 70)  return "bg-emerald-50 dark:bg-emerald-900/20";
  if (score > 30)  return "bg-green-50 dark:bg-green-900/20";
  if (score > 0)   return "bg-amber-50 dark:bg-amber-900/20";
  return "bg-rose-50 dark:bg-rose-900/20";
}

function npsLabel(score: number | null, t: any): string {
  if (score === null) return t("npsNoData");
  if (score > 70)  return t("npsExcellent");
  if (score > 30)  return t("npsGood");
  if (score > 0)   return t("npsImprovable");
  return t("npsCritical");
}

// Simple SVG line chart (no external dep)
function LineChart({
  data,
  yMin, yMax,
  color = "#9333ea",
  height = 120,
}: {
  data: { period: string; value: number }[];
  yMin: number; yMax: number;
  color?: string;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[120px] text-xs text-slate-400 dark:text-zinc-500">
        — pocos datos —
      </div>
    );
  }

  const W = 600;
  const H = height;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const range = yMax - yMin || 1;
  const xStep = chartW / (data.length - 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / range) * chartH;

  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");
  const area = [
    `M${toX(0).toFixed(1)},${toY(data[0].value).toFixed(1)}`,
    ...data.slice(1).map((d, i) => `L${toX(i + 1).toFixed(1)},${toY(d.value).toFixed(1)}`),
    `L${toX(data.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
    `L${PAD.left.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`,
  ].join(" ");

  // Label every nth period
  const labelStep = data.length <= 6 ? 1 : data.length <= 12 ? 2 : 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {/* Zero line for NPS */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD.left} y1={toY(0).toFixed(1)}
          x2={W - PAD.right} y2={toY(0).toFixed(1)}
          stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"
        />
      )}
      {/* Area fill */}
      <path d={area} fill={color} fillOpacity="0.08" />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i).toFixed(1)} cy={toY(d.value).toFixed(1)} r="4" fill={color} stroke="white" strokeWidth="1.5" />
      ))}
      {/* X labels */}
      {data.map((d, i) => i % labelStep === 0 && (
        <text key={i} x={toX(i).toFixed(1)} y={H - 4} textAnchor="middle"
          fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          {d.period.length === 7 ? d.period.slice(5) : d.period.slice(5)}
        </text>
      ))}
      {/* Y axis labels */}
      {[yMin, Math.round((yMin + yMax) / 2), yMax].map((v, i) => (
        <text key={i} x={PAD.left - 4} y={toY(v) + 3} textAnchor="end"
          fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          {v}
        </text>
      ))}
    </svg>
  );
}

// Donut chart for NPS distribution
function NpsDonut({
  promotersPct, passivesPct, detractorsPct, npsScore,
  promoters, passives, detractors,
  t,
}: {
  promotersPct: number; passivesPct: number; detractorsPct: number;
  npsScore: number | null;
  promoters: number; passives: number; detractors: number;
  t: any;
}) {
  const R = 56;
  const STROKE = 14;
  const C = 2 * Math.PI * R;

  // Segments: promoters (green), passives (amber), detractors (red)
  const segs = [
    { pct: promotersPct, color: "#22c55e", label: t("promoters"), count: promoters, icon: ThumbsUp },
    { pct: passivesPct,  color: "#f59e0b", label: t("passives"),  count: passives,  icon: Minus },
    { pct: detractorsPct, color: "#ef4444", label: t("detractors"), count: detractors, icon: ThumbsDown },
  ];

  let offset = 0;
  const arcs = segs.map(s => {
    const dash = (s.pct / 100) * C;
    const gap  = C - dash;
    const arc  = { ...s, dash, gap, offset };
    offset += dash;
    return arc;
  });

  const noData = promoters + passives + detractors === 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {noData ? (
            <circle cx="80" cy="80" r={R} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
          ) : (
            arcs.map((a, i) => (
              <circle key={i} cx="80" cy="80" r={R} fill="none"
                stroke={a.color} strokeWidth={STROKE}
                strokeDasharray={`${a.dash} ${a.gap}`}
                strokeDashoffset={-a.offset}
                transform="rotate(-90 80 80)"
                strokeLinecap="butt"
              />
            ))
          )}
          <text x="80" y="74" textAnchor="middle" fontSize="22" fontWeight="bold" fill={noData ? "#94a3b8" : npsScore !== null && npsScore > 30 ? "#22c55e" : npsScore !== null && npsScore > 0 ? "#f59e0b" : "#ef4444"} fontFamily="sans-serif">
            {noData ? "—" : npsScore !== null ? npsScore : "—"}
          </text>
          <text x="80" y="92" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">NPS</text>
        </svg>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 flex-1">{s.label}</span>
            <span className="text-xs font-bold text-slate-400 tabular-nums">{s.count}</span>
            <div className="w-20 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
            <span className="text-xs font-black tabular-nums w-8 text-right" style={{ color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SatisfactionTab({
  data,
  isLoading,
  locale,
}: {
  data: SatisfactionResult;
  isLoading: boolean;
  locale: string;
}) {
  const t = useTranslations("Dashboard.analytics.satisfaction");

  const { npsScore, npsTotal, avgRating, totalRatingReviews, responseRate, totalSent, negativeCount,
    promoters, passives, detractors, promotersPct, passivesPct, detractorsPct,
    npsTrend, ratingTrend, qualityAlerts, retentionByRating } = data;

  const npsTrendData = npsTrend.map(p => ({ period: p.period, value: p.score }));
  const ratingTrendData = ratingTrend.map(p => ({ period: p.period, value: p.avg }));

  const npsYMin = npsTrend.length > 0 ? Math.min(-10, ...npsTrend.map(p => p.score)) : -100;
  const npsYMax = npsTrend.length > 0 ? Math.max(10,  ...npsTrend.map(p => p.score)) : 100;

  return (
    <div className={`space-y-5 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* NPS Global */}
        <div className={`border rounded-2xl p-5 shadow-sm ${npsBg(npsScore)} border-transparent`}>
          <p className="text-xs font-black tracking-widest text-slate-400 mb-2">{t("cardNps")}</p>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black leading-none ${npsColor(npsScore)}`}>
              {npsScore !== null ? npsScore : "—"}
            </span>
          </div>
          <p className={`text-xs font-bold mt-1 ${npsColor(npsScore)}`}>{npsLabel(npsScore, t)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("cardNpsSub", { n: npsTotal })}</p>
        </div>

        {/* Avg Rating */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-black tracking-widest text-slate-400 mb-2">{t("cardAvgRating")}</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              {avgRating ?? "—"}
            </span>
            {avgRating !== null && <Star className="w-5 h-5 text-yellow-400 fill-current mb-1" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">{t("cardAvgRatingSub", { n: totalRatingReviews })}</p>
        </div>

        {/* Response Rate */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-black tracking-widest text-slate-400 mb-2">{t("cardResponseRate")}</p>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black leading-none ${
              responseRate === null ? "text-slate-300 dark:text-zinc-600"
              : responseRate >= 50 ? "text-emerald-500"
              : responseRate >= 25 ? "text-amber-500"
              : "text-rose-500"
            }`}>
              {responseRate !== null ? `${responseRate}%` : "—"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t("cardResponseRateSub", { received: totalRatingReviews, sent: totalSent })}</p>
        </div>

        {/* Negative Reviews */}
        <div className={`border rounded-2xl p-5 shadow-sm ${negativeCount > 0 ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/20" : "bg-white dark:bg-zinc-900/60 border-slate-100 dark:border-white/5"}`}>
          <p className="text-xs font-black tracking-widest text-slate-400 mb-2">{t("cardNegative")}</p>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black leading-none ${negativeCount > 0 ? "text-rose-500" : "text-slate-900 dark:text-white"}`}>
              {negativeCount}
            </span>
          </div>
          <p className={`text-xs font-bold mt-1 ${negativeCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
            {t("cardNegativeSub")}
          </p>
        </div>
      </div>

      {/* ── Charts row 1: NPS Trend + NPS Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* NPS Trend line */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("npsTrendTitle")}</h3>
          </div>
          {npsTrendData.length < 2 ? (
            <div className="flex items-center justify-center h-[120px] text-sm text-slate-400 dark:text-zinc-500 italic">{t("noData")}</div>
          ) : (
            <LineChart data={npsTrendData} yMin={npsYMin} yMax={npsYMax} color="#9333ea" height={120} />
          )}
        </div>

        {/* NPS Distribution donut */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("npsDistTitle")}</h3>
          </div>
          <NpsDonut
            promotersPct={promotersPct} passivesPct={passivesPct} detractorsPct={detractorsPct}
            npsScore={npsScore}
            promoters={promoters} passives={passives} detractors={detractors}
            t={t}
          />
        </div>
      </div>

      {/* ── Chart row 2: Rating Trend ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("ratingTrendTitle")}</h3>
        </div>
        {ratingTrendData.length < 2 ? (
          <div className="flex items-center justify-center h-[100px] text-sm text-slate-400 dark:text-zinc-500 italic">{t("noData")}</div>
        ) : (
          <LineChart data={ratingTrendData} yMin={1} yMax={5} color="#f59e0b" height={100} />
        )}
      </div>

      {/* ── Quality Alerts table ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("alertsTitle")}</h3>
        </div>

        {qualityAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 italic">{t("alertsNoData")}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {qualityAlerts.map(a => (
                <div key={a.staffId} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{a.staffName}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                      {a.negativeCount} ≤3★
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span>{t("alertsAvg")}: <span className="font-bold text-slate-600 dark:text-zinc-300">{a.avgRating.toFixed(1)}</span></span>
                    {a.worstService && <span>· {a.worstService}</span>}
                  </div>
                  {a.lastNegativeDate && (
                    <p className="text-xs text-slate-400">{t("alertsLastDate")}: {new Date(a.lastNegativeDate).toLocaleDateString(locale)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5">
                    {[t("alertsColStaff"), t("alertsColNegative"), t("alertsColAvgRating"), t("alertsColWorstService"), t("alertsColLastDate")].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {qualityAlerts.map(a => (
                    <tr key={a.staffId} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-rose-500">{a.staffName.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.staffName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">
                          {a.negativeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400" />{a.avgRating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-slate-500 dark:text-zinc-400">
                        {a.worstService ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-400">
                        {a.lastNegativeDate ? new Date(a.lastNegativeDate).toLocaleDateString(locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Satisfaction-Retention correlation ── */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("retentionTitle")}</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500 hidden sm:block">{t("retentionHint")}</span>
        </div>

        <div className="space-y-4">
          {retentionByRating.map(g => {
            const label = g.ratingGroup === '5' ? "5 ★" : g.ratingGroup === '4' ? "4 ★" : "≤ 3 ★";
            const barColor = g.ratingGroup === '5' ? "bg-emerald-500" : g.ratingGroup === '4' ? "bg-amber-400" : "bg-rose-400";
            const textColor = g.ratingGroup === '5' ? "text-emerald-600 dark:text-emerald-400" : g.ratingGroup === '4' ? "text-amber-600 dark:text-amber-400" : "text-rose-500";
            return (
              <div key={g.ratingGroup} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-zinc-200">{label}</span>
                  <span className="text-slate-400">{g.total > 0 ? t("retentionClients", { n: g.total }) : t("retentionNoClients")}</span>
                  <span className={`font-black text-base ${textColor}`}>
                    {g.total > 0 ? `${g.rate}%` : "—"}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: g.total > 0 ? `${g.rate}%` : "0%" }}
                  />
                </div>
                {g.total > 0 && (
                  <p className="text-xs text-slate-400">{t("retentionReturned", { returned: g.returned, total: g.total })}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 dark:text-zinc-600 mt-5 pt-4 border-t border-slate-50 dark:border-white/5">
          {t("retentionFootnote")}
        </p>
      </div>
    </div>
  );
}
