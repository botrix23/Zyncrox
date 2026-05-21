"use client";

import { Lock, TrendingUp, BarChart2, Calendar } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function StatsUpgradeWall() {
  const locale = useLocale();
  const t = useTranslations("Dashboard.statsUpgradeWall");

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px]">
      {/* Blurred mockup */}
      <div className="blur-sm pointer-events-none select-none opacity-50 space-y-6 pb-16">
        {/* Mock weekly chart */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-6">
          <div className="flex items-end gap-3 h-24 mb-3">
            {[40, 70, 55, 90, 60, 80, 45].map((h, i) => (
              <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="text-sm font-semibold text-slate-400">Resumen de la semana</p>
        </div>
        {/* Mock monthly cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {["24", "18", "3", "7", "41"].map((v, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{v}</p>
              <p className="text-xs text-slate-400 mt-1">Métrica</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-50/50 dark:from-black/50 via-slate-50/85 dark:via-black/85 to-slate-50 dark:to-black rounded-2xl z-10">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-purple-500/10 flex flex-col items-center gap-4 w-full max-w-sm mx-4 text-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t("title")}</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t("subtitle")}</p>
          </div>
          <div className="w-full grid grid-cols-1 gap-2 text-left">
            {([
              { icon: BarChart2, key: "bullet1" },
              { icon: TrendingUp, key: "bullet2" },
              { icon: Calendar, key: "bullet3" },
            ] as const).map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">{t(key)}</span>
              </div>
            ))}
          </div>
          <Link
            href={`/${locale}/admin/billing`}
            className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-150"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
