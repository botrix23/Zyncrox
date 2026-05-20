"use client";

import { Lock, TrendingUp, BarChart2, Users, Star } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function AnalyticsUpgradeWall() {
  const locale = useLocale();
  const t = useTranslations("Dashboard.analytics");
  const tw = useTranslations("Dashboard.analytics.upgradeWall");

  return (
    <div className="relative space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          {t("title")}
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">{t("subtitle")}</p>
      </div>

      {/* Lock overlay + blurred mockup */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Blurred mockup */}
        <div className="blur-sm pointer-events-none select-none opacity-60">
          {/* Mock summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            {["284", "$12,430", "8%", "4.7 ★", "María G.", "Carlos P."].map((v, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                <p className="text-xl font-bold text-slate-900 dark:text-white">{v}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Métrica {i + 1}</p>
              </div>
            ))}
          </div>
          {/* Mock chart */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-6 mb-4">
            <div className="flex items-end gap-3 h-28">
              {[60, 90, 45, 110, 75, 95, 50, 120, 80, 65].map((h, i) => (
                <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          {/* Mock table */}
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

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50/60 dark:from-black/60 via-slate-50/80 dark:via-black/80 to-slate-50 dark:to-black rounded-2xl z-10">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-purple-500/10 flex flex-col items-center gap-5 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{tw("title")}</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{tw("subtitle")}</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2.5 text-left">
              {([
                { icon: Users, key: "bullet1" },
                { icon: BarChart2, key: "bullet2" },
                { icon: Star, key: "bullet3" },
                { icon: TrendingUp, key: "bullet4" },
              ] as const).map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                  <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">{tw(key)}</span>
                </div>
              ))}
            </div>

            <Link
              href={`/${locale}/admin/billing`}
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-150"
            >
              {tw("cta")}
            </Link>
            <p className="text-xs text-slate-400 dark:text-zinc-500">{tw("note")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
