"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, BarChart2, Lock } from "lucide-react";
import { AnalyticsClient } from "./analytics/AnalyticsClient";
import type { StaffPerformanceResult } from "@/app/actions/analytics";

// ─── Upgrade Wall ─────────────────────────────────────────────────────────────

function AnalyticsUpgradeWallInline({ locale }: { locale: string }) {
  const t = useTranslations("Dashboard.analytics.upgradeWall");

  return (
    <div className="relative rounded-2xl overflow-hidden mt-2" style={{ minHeight: 560 }}>
      {/* Blurred mockup — positioned absolute so it fills the background without
          constraining the height of the container */}
      <div
        className="absolute inset-0 blur-sm pointer-events-none select-none opacity-50 overflow-hidden rounded-2xl"
        aria-hidden
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {["284", "$12,430", "8%", "4.7 ★", "María G.", "Carlos P."].map((v, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                <p className="text-xl font-bold text-slate-900 dark:text-white">{v}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Métrica {i + 1}</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-6">
            <div className="flex items-end gap-3 h-28">
              {[60, 90, 45, 110, 75, 95, 50, 120, 80, 65].map((h, i) => (
                <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-slate-50 dark:bg-white/5">
              {["Especialista", "Citas", "Canceladas", "Ingresos", "Rating"].map(h => (
                <span key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {[["María G.", "68", "4", "$3,200", "4.9★"], ["Carlos P.", "55", "3", "$2,750", "4.8★"], ["Ana R.", "47", "6", "$2,100", "4.5★"]].map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 px-5 py-3 border-t border-slate-100 dark:border-white/5">
                {row.map((cell, j) => <span key={j} className="text-sm text-slate-700 dark:text-zinc-300">{cell}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient fade over blur */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 dark:from-zinc-950/40 via-slate-50/70 dark:via-zinc-950/70 to-slate-50 dark:to-zinc-950 rounded-2xl" aria-hidden />

      {/* Card — in normal flow so it can never be clipped */}
      <div className="relative z-10 flex items-center justify-center py-16 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-purple-500/10 flex flex-col items-center gap-5 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("title")}</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t("subtitle")}</p>
          </div>
          <div className="w-full grid grid-cols-2 gap-2.5 text-left">
            {(["bullet1", "bullet2", "bullet3", "bullet4"] as const).map(k => (
              <div key={k} className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                <BarChart2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">{t(k)}</span>
              </div>
            ))}
          </div>
          <a
            href={`/${locale}/admin/billing`}
            className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-150"
          >
            {t("cta")}
          </a>
          <p className="text-xs text-slate-400 dark:text-zinc-500">{t("note")}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DashboardTabsClientProps {
  children: React.ReactNode;        // Vista general content (server-rendered)
  canUseAnalytics: boolean;
  isAdmin: boolean;                 // false for STAFF
  defaultFrom: string;
  defaultTo: string;
  locale: string;
  plan?: string;
  pointsEnabled?: boolean;
}

export function DashboardTabsClient({
  children,
  canUseAnalytics,
  isAdmin,
  defaultFrom,
  defaultTo,
  locale,
  plan,
  pointsEnabled,
}: DashboardTabsClientProps) {
  const t = useTranslations("Dashboard");
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

  // STAFF only sees the overview tab — render without tab bar
  if (!isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
        {/* Vista general tab */}
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
          }`}
        >
          {t("tabs.overview")}
        </button>

        {/* Analítica avanzada tab — visible to all admin roles */}
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-white dark:bg-zinc-900 text-purple-600 shadow-sm"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
          }`}
        >
          <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${activeTab === "analytics" ? "text-purple-600" : "text-slate-400 dark:text-zinc-500"}`} />
          {t("tabs.analytics")}
          {/* Business badge */}
          {!canUseAnalytics ? (
            <span className="flex items-center gap-0.5 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0">
              <Lock className="w-2 h-2" />
              Business
            </span>
          ) : (
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0">
              ★
            </span>
          )}
        </button>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview" && (
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="animate-in fade-in duration-200">
          {canUseAnalytics ? (
            <AnalyticsClient
              initialData={null}
              defaultFrom={defaultFrom}
              defaultTo={defaultTo}
              locale={locale}
              plan={plan}
              pointsEnabled={pointsEnabled}
            />
          ) : (
            <AnalyticsUpgradeWallInline locale={locale} />
          )}
        </div>
      )}
    </div>
  );
}
