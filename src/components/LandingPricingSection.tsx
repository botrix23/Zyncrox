"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ScrollReveal } from "./ScrollReveal";

function CmpCell({ v }: { v: boolean | string }) {
  if (v === true)  return <span className="text-green-600 font-bold">✓</span>;
  if (v === false) return <span className="text-red-400/80">—</span>;
  return <span className="text-slate-500 dark:text-zinc-400 text-[12px]">{v}</span>;
}

export function LandingPricingSection() {
  const [annual, setAnnual] = useState(false);
  const t = useTranslations("Landing.pricing");
  const locale = useLocale();

  // ── Plan feature lists ───────────────────────────────────────────────────
  const BASIC_FEATS = ["basicF1","basicF2","basicF3","basicF4","basicF5","basicF6","basicF7"];
  const PRO_FEATS   = ["proF1","proF2","proF3","proF4","proF5","proF6","proF7"];
  const ENT_FEATS   = ["entF1","entF2","entF3","entF4","entF5","entF6"];

  // ── Compare table ────────────────────────────────────────────────────────
  type CmpRow = { cat: string } | { f: string; b: boolean | string; p: boolean | string; e: boolean | string };
  const ROWS: CmpRow[] = [
    { cat: t("catLimits") },
    { f: t("cmpBranches"),       b: "1",    p: "3",    e: "∞" },
    { f: t("cmpSpecialists"),    b: "2",    p: "15",   e: "∞" },
    { f: t("cmpAdmins"),         b: "1",    p: "3",    e: "∞" },
    { f: t("cmpServices"),       b: "10",   p: "30",   e: "∞" },
    { cat: t("catBookings") },
    { f: t("cmpWidget"),         b: true,   p: true,   e: true  },
    { f: t("cmpReschedule"),     b: true,   p: true,   e: true  },
    { f: t("cmpTimezone"),       b: true,   p: true,   e: true  },
    { f: t("cmpSpecialistPick"), b: true,   p: true,   e: true  },
    { f: t("cmpCalendar"),       b: true,   p: true,   e: true  },
    { f: t("cmpMultiService"),   b: false,  p: true,   e: true  },
    { f: t("cmpSeparateBooking"),b: false,  p: true,   e: true  },
    { f: t("cmpSimultaneous"),   b: false,  p: true,   e: true  },
    { cat: t("catHomeService") },
    { f: t("cmpHomeService"),    b: true,   p: true,   e: true  },
    { f: t("cmpCoverage"),       b: true,   p: true,   e: true  },
    { cat: t("catTeam") },
    { f: t("cmpAssignSpec"),     b: true,   p: true,   e: true  },
    { f: t("cmpAbsences"),       b: true,   p: true,   e: true  },
    { f: t("cmpStaffRole"),      b: true,   p: true,   e: true  },
    { f: t("cmpMyBookings"),     b: true,   p: true,   e: true  },
    { f: t("cmpSpecialtyCat"),   b: false,  p: true,   e: true  },
    { f: t("cmpRotations"),      b: false,  p: true,   e: true  },
    { cat: t("catBrand") },
    { f: t("cmpBranding"),       b: true,   p: true,   e: true  },
    { f: t("cmpTheme"),          b: false,  p: true,   e: true  },
    { f: t("cmpHero"),           b: false,  p: true,   e: true  },
    { f: t("cmpWidgetSteps"),    b: false,  p: false,  e: true  },
    { f: t("cmpEmailTemplate"),  b: false,  p: true,   e: true  },
    { cat: t("catComms") },
    { f: t("cmpEmailNotif"),     b: true,   p: true,   e: true  },
    { f: t("cmpCalLinks"),       b: true,   p: true,   e: true  },
    { f: t("cmpIcs"),            b: true,   p: true,   e: true  },
    { cat: t("catClients") },
    { f: t("cmpClientList"),     b: true,   p: true,   e: true  },
    { f: t("cmpVip"),            b: true,   p: true,   e: true  },
    { f: t("cmpSurveys"),        b: false,  p: true,   e: true  },
    { f: t("cmpNps"),            b: false,  p: false,  e: true  },
    { cat: t("catStats") },
    { f: t("cmpDashboard"),      b: true,   p: true,   e: true  },
    { f: t("cmpWeeklyStats"),    b: false,  p: true,   e: true  },
    { f: t("cmpAdvAnalytics"),   b: false,  p: false,  e: true  },
    { cat: t("catSupport") },
    { f: t("cmpEmailSupport"),   b: true,   p: true,   e: true  },
    { f: t("cmpPrioritySupport"),b: false,  p: true,   e: true  },
    { f: t("cmpDedicatedSupport"),b:false,  p: false,  e: true  },
    { f: t("cmpOnboarding"),     b: false,  p: false,  e: true  },
    { f: t("cmpTraining"),       b: false,  p: false,  e: true  },
    { f: t("cmpAuditLogs"),      b: false,  p: false,  e: true  },
  ];

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16" id="precios">
      <div className="max-w-[1120px] mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-[clamp(36px,5vw,52px)]">
          <div className="inline-flex items-center gap-[6px] bg-purple-500/[0.08] border border-purple-500/25 text-purple-400 text-[13px] font-medium px-4 py-[7px] rounded-full mb-[22px]">
            {t("badge")}
          </div>
          <h2 className="font-serif text-[clamp(34px,4.5vw,60px)] leading-[1.1] tracking-[-0.4px] text-slate-900 dark:text-white mb-8 transition-colors duration-300">
            {t("title1")}<br />
            <em className="italic text-purple-600">{t("titleItalic")}</em>
          </h2>

          {/* Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-full p-1 transition-colors duration-300">
            <button
              onClick={() => setAnnual(false)}
              className={`text-[13px] font-semibold px-5 py-[7px] rounded-full transition-all duration-150 whitespace-nowrap ${!annual ? "bg-purple-600 text-white" : "text-slate-500 dark:text-zinc-400 bg-transparent"}`}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`text-[13px] font-semibold px-5 py-[7px] rounded-full transition-all duration-150 flex items-center gap-[6px] whitespace-nowrap ${annual ? "bg-purple-600 text-white" : "text-slate-500 dark:text-zinc-400 bg-transparent"}`}
            >
              {t("annual")}
              {!annual && (
                <span className="text-[10.5px] font-bold text-green-500 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-full">
                  {t("annualSave")}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-4 max-w-[440px] sm:max-w-none mx-auto items-stretch">

          {/* Basic */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
          <div className="group h-full bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Inicial</div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
              <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                {annual ? "20" : "25"}
              </span>
              {annual && <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">$25</span>}
            </div>
            <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
              {t("perMonth")} {annual ? `· ${t("billedAnnual")} ($250)` : ""}
            </div>
            <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">{t("basicSubtitle")}</div>
            <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">{t("basicLimits")}</div>
            <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
            <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
              {BASIC_FEATS.map((k) => (
                <li key={k} className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400">
                  <span className="flex-shrink-0 mt-px font-bold text-green-600">✓</span>
                  {t(k as any)}
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/admin/register`}
              className="block w-full text-center py-[13px] rounded-[10px] text-[14px] font-bold text-purple-600 border-2 border-purple-500/40 hover:border-purple-600 hover:bg-purple-500/[0.06] transition-all duration-150 no-underline"
            >
              {t("basicCta")}
            </Link>
          </div>
          </ScrollReveal>

          {/* Professional (most popular) */}
          <ScrollReveal variant="fade-up" delay={120} threshold={0.06}>
          <div className="group h-full relative bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-[20px] overflow-visible transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.4)] flex flex-col">
            <div className="absolute inset-0 rounded-[18px] pointer-events-none overflow-hidden">
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(109,40,217,0.18) 0%, transparent 65%)" }} />
            </div>
            <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[11.5px] font-bold px-4 py-[5px] rounded-full whitespace-nowrap z-10 shadow-[0_4px_14px_rgba(139,92,246,0.35)] group-hover:scale-105 transition-transform duration-300">
              {t("mostPopular")}
            </div>
            <div className="relative p-[32px_26px] flex flex-col flex-grow">
              <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Profesional</div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
                <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                  {annual ? "49" : "59"}
                </span>
                {annual && <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">$59</span>}
              </div>
              <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
                {t("perMonth")} {annual ? `· ${t("billedAnnual")} ($590)` : ""}
              </div>
              <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">{t("proSubtitle")}</div>
              <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">{t("proLimits")}</div>
              <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
              <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
                {PRO_FEATS.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400">
                    <span className="flex-shrink-0 mt-px font-bold text-green-600">✓</span>
                    {t(k as any)}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/admin/register`}
                className="block w-full text-center py-[13px] rounded-[10px] text-[14px] font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-[0_2px_12px_rgba(139,92,246,0.35)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.45)] hover:-translate-y-px transition-all duration-150 no-underline mt-auto"
              >
                {t("proCta")}
              </Link>
            </div>
          </div>
          </ScrollReveal>

          {/* Business */}
          <ScrollReveal variant="fade-up" delay={240} threshold={0.06}>
          <div className="group h-full bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Negocio</div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
              <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                {annual ? "82" : "99"}
              </span>
              {annual && <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">$99</span>}
            </div>
            <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
              {t("perMonth")} {annual ? `· ${t("billedAnnual")} ($990)` : ""}
            </div>
            <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">{t("entSubtitle")}</div>
            <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">{t("entLimits")}</div>
            <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
            <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
              {ENT_FEATS.map((k) => (
                <li key={k} className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400">
                  <span className="flex-shrink-0 mt-px font-bold text-green-600">✓</span>
                  {t(k as any)}
                </li>
              ))}
            </ul>
            <a
              href="mailto:hola@zyncrox.com"
              className="block w-full text-center py-[13px] rounded-[10px] text-[14px] font-bold text-purple-600 border-2 border-purple-500/40 hover:border-purple-600 hover:bg-purple-500/[0.06] transition-all duration-150 no-underline"
            >
              {t("entCta")}
            </a>
          </div>
          </ScrollReveal>
        </div>

        {/* Trial note */}
        <p className="text-center text-[13px] text-slate-400 dark:text-zinc-500 mb-[52px] max-w-[640px] mx-auto leading-[1.6] transition-colors duration-300">
          {t("trialNote")}
        </p>

        {/* ── Comparison Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-left border-b border-black/[0.13] dark:border-white/[0.13] w-[40%]">
                  {t("featureCol")}
                </th>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Inicial</th>
                <th className="text-[12.5px] font-bold text-purple-500 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Profesional</th>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Negocio</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) =>
                "cat" in r ? (
                  <tr key={i}>
                    <td colSpan={4} className="text-[10.5px] font-bold text-purple-500 uppercase tracking-[0.8px] px-[14px] pt-[18px] pb-[6px]">
                      {r.cat}
                    </td>
                  </tr>
                ) : (
                  <tr key={i} className="even:bg-black/[0.02] dark:even:bg-white/[0.02]">
                    <td className="text-[13px] text-slate-500 dark:text-zinc-400 px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]">{r.f}</td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]"><CmpCell v={r.b} /></td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]"><CmpCell v={r.p} /></td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]"><CmpCell v={r.e} /></td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
