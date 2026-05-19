"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

function CmpCell({ v }: { v: boolean | string }) {
  if (v === true) return <span className="text-green-600 font-bold">✓</span>;
  if (v === false) return <span className="text-red-400">✕</span>;
  return <span className="text-slate-500 dark:text-zinc-400">{v}</span>;
}

export function LandingPricingSection() {
  const [annual, setAnnual] = useState(false);
  const t = useTranslations("Landing.pricing");
  const locale = useLocale();

  const FREE_FEATS = [
    { ok: true,  t: t("freeFeat1") },
    { ok: true,  t: t("freeFeat2") },
    { ok: true,  t: t("freeFeat3") },
    { ok: true,  t: t("freeFeat4") },
    { ok: true,  t: t("freeFeat5") },
    { ok: false, t: t("freeFeat6") },
    { ok: false, t: t("freeFeat7") },
  ];

  const PRO_FEATS = [
    t("proFeat1"), t("proFeat2"), t("proFeat3"), t("proFeat4"), t("proFeat5"),
    t("proFeat6"), t("proFeat7"), t("proFeat8"), t("proFeat9"),
  ];

  const ENT_FEATS = [
    t("entFeat1"), t("entFeat2"), t("entFeat3"), t("entFeat4"), t("entFeat5"),
  ];

  const COMPARE_ROWS = [
    { cat: t("compareCatLimits") },
    { f: t("cmpBranches"),       free: "1",   pro: "3",   ent: "∞" },
    { f: t("cmpEmployees"),      free: "3",   pro: "15",  ent: "∞" },
    { f: t("cmpServices"),       free: "5",   pro: "30",  ent: "∞" },
    { cat: t("compareCatBookings") },
    { f: t("cmpWidget"),         free: true,  pro: true,  ent: true  },
    { f: t("cmpEmailConfirm"),   free: true,  pro: true,  ent: true  },
    { f: t("cmpMultiServices"),  free: false, pro: true,  ent: true  },
    { f: t("cmpDiffDays"),       free: false, pro: true,  ent: true  },
    { f: t("cmpHomeService"),    free: false, pro: true,  ent: true  },
    { cat: t("compareCatBrand") },
    { f: t("cmpCustomBrand"),    free: false, pro: true,  ent: true  },
    { f: t("cmpOwnUrl"),         free: false, pro: true,  ent: true  },
    { f: t("cmpLogoColors"),     free: false, pro: true,  ent: true  },
    { cat: t("compareCatStaff") },
    { f: t("cmpAutoRotation"),   free: false, pro: true,  ent: true  },
    { f: t("cmpIndividualHours"),free: false, pro: true,  ent: true  },
    { cat: t("compareCatClients") },
    { f: t("cmpSurveys"),        free: false, pro: true,  ent: true  },
    { f: t("cmpVipDetect"),      free: false, pro: true,  ent: true  },
    { f: t("cmpAdvAnalytics"),   free: false, pro: false, ent: true  },
    { cat: t("compareCatSupport") },
    { f: t("cmpEmailSupport"),   free: true,  pro: true,  ent: true  },
    { f: t("cmpPrioritySupport"),free: false, pro: true,  ent: true  },
    { f: t("cmpDedicatedSupport"),free: false, pro: false, ent: true  },
  ];

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16" id="precios">
      <div className="max-w-[1120px] mx-auto">
        {/* Header */}
        <div className="text-center mb-[clamp(36px,5vw,52px)]">
          <div className="inline-flex items-center gap-[6px] bg-purple-500/[0.08] border border-purple-500/25 text-purple-300 text-[13px] font-medium px-4 py-[7px] rounded-full mb-[22px]">
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
              {annual && (
                <span className="text-[10.5px] font-bold text-green-400 bg-green-400/10 border border-green-400/25 px-2 py-0.5 rounded-full">
                  20% off
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-4 max-w-[420px] sm:max-w-none mx-auto items-stretch">
          {/* Free */}
          <div className="group bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Free</div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
              <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">0</span>
            </div>
            <div className="text-[13px] text-slate-500 dark:text-zinc-400 mb-1">{t("perMonth")} {t("forever")}</div>
            <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-[22px]">{t("freeSubtitle")}</div>
            <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[18px]" />
            <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
              {FREE_FEATS.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px] text-slate-500 dark:text-zinc-400">
                  <span className={`flex-shrink-0 mt-px font-bold ${f.ok ? "text-green-600" : "text-red-400"}`}>
                    {f.ok ? "✓" : "✕"}
                  </span>
                  {f.t}
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/admin/register`}
              className="block w-full text-center py-[13px] rounded-[10px] text-[14px] font-bold text-purple-600 border-2 border-purple-500/40 hover:border-purple-600 hover:bg-purple-500/[0.06] transition-all duration-150 no-underline"
            >
              {t("freeCta")}
            </Link>
          </div>

          {/* Pro */}
          <div className="group relative bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-[20px] overflow-visible transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.4)] flex flex-col">
            <div className="absolute inset-0 rounded-[18px] pointer-events-none overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(109,40,217,0.18) 0%, transparent 65%)" }}
              />
            </div>
            <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[11.5px] font-bold px-4 py-[5px] rounded-full whitespace-nowrap z-10 shadow-[0_4px_14px_rgba(139,92,246,0.35)] group-hover:scale-105 transition-transform duration-300">
              {t("mostPopular")}
            </div>

            <div className="relative p-[32px_26px] flex flex-col flex-grow">
              <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Pro</div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
                <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                  {annual ? "23" : "29"}
                </span>
                {annual && <span className="text-[16px] text-slate-400 line-through ml-2 font-normal">$29</span>}
              </div>
              <div className="text-[13px] text-slate-500 dark:text-zinc-400 mb-1">
                {t("perMonth")} {annual ? t("billedAnnual") : ""}
              </div>
              <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-[22px]">{t("proSubtitle")}</div>
              <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[18px]" />

              <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
                {PRO_FEATS.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px] text-slate-500 dark:text-zinc-400">
                    <span className="flex-shrink-0 mt-px font-bold text-green-600">✓</span>
                    {f}
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

          {/* Enterprise */}
          <div className="group bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">Enterprise</div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-[20px] font-semibold text-slate-900 dark:text-white">$</span>
              <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                {annual ? "63" : "79"}
              </span>
              {annual && <span className="text-[16px] text-slate-400 line-through ml-2 font-normal">$79</span>}
            </div>
            <div className="text-[13px] text-slate-500 dark:text-zinc-400 mb-1">
              {t("perMonth")} {annual ? t("billedAnnual") : ""}
            </div>
            <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-[22px]">{t("entSubtitle")}</div>
            <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[18px]" />
            <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
              {ENT_FEATS.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px] text-slate-500 dark:text-zinc-400">
                  <span className="flex-shrink-0 mt-px font-bold text-green-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-[13px] rounded-[10px] text-[14px] font-bold text-purple-600 border-2 border-purple-500/40 hover:border-purple-600 hover:bg-purple-500/[0.06] transition-all duration-150 cursor-pointer bg-transparent">
              {t("entCta")}
            </button>
          </div>
        </div>

        <p className="text-center text-[13px] text-slate-400 dark:text-zinc-500 mb-[52px] transition-colors duration-300">
          {t("trialNote")}
        </p>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 540 }}>
            <thead>
              <tr>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-left border-b border-black/[0.13] dark:border-white/[0.13] w-[40%]">
                  {t("featureCol")}
                </th>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Free</th>
                <th className="text-[12.5px] font-bold text-purple-500 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Pro</th>
                <th className="text-[12.5px] font-bold text-slate-500 dark:text-zinc-400 px-[14px] py-3 text-center border-b border-black/[0.13] dark:border-white/[0.13]">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r, i) =>
                "cat" in r ? (
                  <tr key={i}>
                    <td
                      colSpan={4}
                      className="text-[10.5px] font-bold text-purple-500 uppercase tracking-[0.8px] px-[14px] pt-[18px] pb-[6px]"
                    >
                      {r.cat}
                    </td>
                  </tr>
                ) : (
                  <tr key={i} className="even:bg-black/[0.02] dark:even:bg-white/[0.02]">
                    <td className="text-[13px] text-slate-500 dark:text-zinc-400 px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]">
                      {r.f}
                    </td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]">
                      <CmpCell v={r.free!} />
                    </td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]">
                      <CmpCell v={r.pro!} />
                    </td>
                    <td className="text-center px-[14px] py-[10px] border-b border-black/[0.04] dark:border-white/[0.04]">
                      <CmpCell v={r.ent!} />
                    </td>
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
