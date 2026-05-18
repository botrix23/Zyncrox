"use client";

import { Calendar, CheckCircle, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

const PLAN_ORDER = ["BASIC", "PROFESSIONAL", "ENTERPRISE"] as const;

export default function PlansPage() {
  const t = useTranslations("TrialPlans");
  const router = useRouter();
  const locale = typeof window !== "undefined"
    ? window.location.pathname.split("/")[1] || "es"
    : "es";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl shadow-xl shadow-purple-500/20 mb-4">
            <Calendar className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            Zyncrox
          </h1>
          <h2 className="text-2xl font-bold text-rose-500 mt-3">
            {t("expiredTitle")}
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 max-w-lg mx-auto text-sm leading-relaxed">
            {t("expiredSubtitle")}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLAN_ORDER.map((plan) => {
            const planData = t.raw(`plans.${plan}`) as {
              name: string;
              desc: string;
              features: string[];
            };
            const isPopular = plan === "PROFESSIONAL";

            return (
              <div
                key={plan}
                className={`relative bg-white dark:bg-zinc-900 border rounded-3xl p-6 flex flex-col gap-4 transition-all hover:shadow-lg ${
                  isPopular
                    ? "border-purple-500 shadow-purple-500/20 shadow-xl"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}

                <div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      plan === "BASIC"
                        ? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10"
                        : plan === "PROFESSIONAL"
                        ? "text-purple-600 dark:text-purple-400 bg-purple-500/10"
                        : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                    }`}
                  >
                    {planData.name}
                  </span>
                  <p className="text-slate-500 dark:text-zinc-400 text-sm mt-3 leading-relaxed">
                    {planData.desc}
                  </p>
                </div>

                <ul className="space-y-2 flex-1">
                  {planData.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => router.push(`/${locale}/admin/billing`)}
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isPopular
                      ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
                      : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  {t("choosePlan")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={() => logoutAction(locale)}
            className="inline-flex items-center gap-2 text-sm text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
