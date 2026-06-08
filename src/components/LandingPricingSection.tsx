"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ScrollReveal } from "./ScrollReveal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function ChevronIcon({ open, size = 16 }: { open: boolean; size?: number }) {
  return (
    <svg
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CmpCell({ v }: { v: boolean | string }) {
  if (v === true)
    return <span className="text-green-500 font-bold text-[15px]">✓</span>;
  if (v === false)
    return (
      <span className="text-slate-300 dark:text-zinc-700 text-[15px]">—</span>
    );
  return (
    <span className="text-slate-600 dark:text-zinc-300 text-[13px]">{v}</span>
  );
}

function ScoreBadge({
  count,
  total,
  isPro,
}: {
  count: number;
  total: number;
  isPro?: boolean;
}) {
  const full = count === total;
  if (isPro) {
    return (
      <div className="flex justify-center">
        <span
          className={`text-[10px] font-bold px-[6px] py-px rounded-full border ${
            full
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
          }`}
        >
          {count}/{total}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="text-[10px] font-bold px-[6px] py-px rounded-full border bg-black/[0.04] dark:bg-white/[0.04] text-slate-400 dark:text-zinc-500 border-black/[0.06] dark:border-white/[0.06]">
        {count}/{total}
      </span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FeatureRow = {
  f: string;
  b: boolean | string;
  p: boolean | string;
  e: boolean | string;
};
type CatGroup = { label: string; rows: FeatureRow[]; isLimits: boolean };

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPricingSection() {
  const [annual, setAnnual] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<number>>(new Set([0]));
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("Landing.pricing");
  const locale = useLocale();

  // ── Plan feature bullet lists ─────────────────────────────────────────────
  const BASIC_FEATS = [
    "basicF1",
    "basicF2",
    "basicF3",
    "basicF4",
    "basicF5",
    "basicF6",
    "basicF7",
  ];
  const PRO_FEATS = [
    "proF1",
    "proF2",
    "proF3",
    "proF4",
    "proF5",
    "proF6",
    "proF7",
  ];
  const ENT_FEATS = [
    "entF1",
    "entF2",
    "entF3",
    "entF4",
    "entF5",
    "entF6",
  ];

  // ── Comparison rows ───────────────────────────────────────────────────────
  type CmpRow = { cat: string; isLimits?: boolean } | FeatureRow;
  const ROWS: CmpRow[] = [
    { cat: t("catLimits"), isLimits: true },
    { f: t("cmpBranches"),         b: "1",  p: "2",  e: "∞" },
    { f: t("cmpSpecialists"),      b: "3",  p: "10", e: "∞" },
    { f: t("cmpAdmins"),           b: "1",  p: "2",  e: "∞" },
    { f: t("cmpServices"),         b: "20", p: "50", e: "∞" },
    { cat: t("catBookings") },
    { f: t("cmpWidget"),           b: true,  p: true,  e: true  },
    { f: t("cmpReschedule"),       b: true,  p: true,  e: true  },
    { f: t("cmpTimezone"),         b: true,  p: true,  e: true  },
    { f: t("cmpSpecialistPick"),   b: true,  p: true,  e: true  },
    { f: t("cmpCalendar"),         b: true,  p: true,  e: true  },
    { f: t("cmpMultiService"),     b: false, p: true,  e: true  },
    { f: t("cmpSeparateBooking"),  b: false, p: true,  e: true  },
    { f: t("cmpSimultaneous"),     b: false, p: true,  e: true  },
    { cat: t("catHomeService") },
    { f: t("cmpHomeService"),      b: true,  p: true,  e: true  },
    { f: t("cmpCoverage"),         b: true,  p: true,  e: true  },
    { cat: t("catTeam") },
    { f: t("cmpAssignSpec"),       b: true,  p: true,  e: true  },
    { f: t("cmpAbsences"),         b: true,  p: true,  e: true  },
    { f: t("cmpStaffRole"),        b: true,  p: true,  e: true  },
    { f: t("cmpMyBookings"),       b: true,  p: true,  e: true  },
    { f: t("cmpSpecialtyCat"),     b: false, p: true,  e: true  },
    { f: t("cmpRotations"),        b: false, p: true,  e: true  },
    { cat: t("catBrand") },
    { f: t("cmpBranding"),         b: true,  p: true,  e: true  },
    { f: t("cmpTheme"),            b: false, p: true,  e: true  },
    { f: t("cmpHero"),             b: false, p: true,  e: true  },
    { f: t("cmpWidgetSteps"),      b: false, p: false, e: true  },
    { f: t("cmpEmailTemplate"),    b: false, p: true,  e: true  },
    { cat: t("catComms") },
    { f: t("cmpEmailNotif"),       b: true,  p: true,  e: true  },
    { f: t("cmpCalLinks"),         b: true,  p: true,  e: true  },
    { f: t("cmpIcs"),              b: true,  p: true,  e: true  },
    { cat: t("catClients") },
    { f: t("cmpClientList"),       b: true,  p: true,  e: true  },
    { f: t("cmpVip"),              b: true,  p: true,  e: true  },
    { f: t("cmpSurveys"),          b: false, p: true,  e: true  },
    { f: t("cmpNps"),              b: false, p: false, e: true  },
    { cat: t("catStats") },
    { f: t("cmpDashboard"),        b: true,  p: true,  e: true  },
    { f: t("cmpWeeklyStats"),      b: false, p: true,  e: true  },
    { f: t("cmpAdvAnalytics"),     b: false, p: false, e: true  },
    { cat: t("catSupport") },
    { f: t("cmpEmailSupport"),     b: true,  p: true,  e: true  },
    { f: t("cmpPrioritySupport"),  b: false, p: true,  e: true  },
    { f: t("cmpDedicatedSupport"), b: false, p: false, e: true  },
    { f: t("cmpOnboarding"),       b: false, p: false, e: true  },
    { f: t("cmpTraining"),         b: false, p: false, e: true  },
    { f: t("cmpAuditLogs"),        b: false, p: false, e: true  },
  ];

  // ── Group rows into categories ────────────────────────────────────────────
  const catGroups: CatGroup[] = [];
  let cur: CatGroup | null = null;
  for (const row of ROWS) {
    if ("cat" in row) {
      cur = { label: row.cat, rows: [], isLimits: !!row.isLimits };
      catGroups.push(cur);
    } else if (cur) {
      cur.rows.push(row as FeatureRow);
    }
  }

  const countIncluded = (vals: (boolean | string)[]) =>
    vals.filter((v) => v !== false).length;

  const toggleCat = (i: number) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleToggleTable = () => {
    setTableOpen((prev) => {
      if (prev) {
        setTimeout(
          () =>
            tableWrapRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          50
        );
      }
      return !prev;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16"
      id="precios"
    >
      <div className="max-w-[1120px] mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-[clamp(36px,5vw,52px)]">
          <div className="inline-flex items-center gap-[6px] bg-purple-500/[0.08] border border-purple-500/25 text-purple-400 text-[13px] font-medium px-4 py-[7px] rounded-full mb-[22px]">
            {t("badge")}
          </div>
          <h2 className="font-serif text-[clamp(34px,4.5vw,60px)] leading-[1.1] tracking-[-0.4px] text-slate-900 dark:text-white mb-8 transition-colors duration-300">
            {t("title1")}
            <br />
            <em className="italic text-purple-600">{t("titleItalic")}</em>
          </h2>

          {/* Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-full p-1 transition-colors duration-300">
            <button
              onClick={() => setAnnual(false)}
              className={`text-[13px] font-semibold px-5 py-[7px] rounded-full transition-all duration-150 whitespace-nowrap ${
                !annual
                  ? "bg-purple-600 text-white"
                  : "text-slate-500 dark:text-zinc-400 bg-transparent"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`text-[13px] font-semibold px-5 py-[7px] rounded-full transition-all duration-150 flex items-center gap-[6px] whitespace-nowrap ${
                annual
                  ? "bg-purple-600 text-white"
                  : "text-slate-500 dark:text-zinc-400 bg-transparent"
              }`}
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

          {/* Inicial */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <div className="group h-full bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
              <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">
                Inicial
              </div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-[20px] font-semibold text-slate-900 dark:text-white">
                  $
                </span>
                <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                  {annual ? "20" : "25"}
                </span>
                {annual && (
                  <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">
                    $25
                  </span>
                )}
              </div>
              <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
                {t("perMonth")}{" "}
                {annual ? `· ${t("billedAnnual")} ($250)` : ""}
              </div>
              <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">
                {t("basicSubtitle")}
              </div>
              <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">
                {t("basicLimits")}
              </div>
              <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
              <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
                {BASIC_FEATS.map((k) => (
                  <li
                    key={k}
                    className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400"
                  >
                    <span className="flex-shrink-0 mt-px font-bold text-green-600">
                      ✓
                    </span>
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

          {/* Profesional */}
          <ScrollReveal variant="fade-up" delay={120} threshold={0.06}>
            <div className="group h-full relative bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-[20px] overflow-visible transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.4)] flex flex-col">
              <div className="absolute inset-0 rounded-[18px] pointer-events-none overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(109,40,217,0.18) 0%, transparent 65%)",
                  }}
                />
              </div>
              <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[11.5px] font-bold px-4 py-[5px] rounded-full whitespace-nowrap z-10 shadow-[0_4px_14px_rgba(139,92,246,0.35)] group-hover:scale-105 transition-transform duration-300">
                {t("mostPopular")}
              </div>
              <div className="relative p-[32px_26px] flex flex-col flex-grow">
                <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">
                  Profesional
                </div>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-[20px] font-semibold text-slate-900 dark:text-white">
                    $
                  </span>
                  <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                    {annual ? "49" : "59"}
                  </span>
                  {annual && (
                    <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">
                      $59
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
                  {t("perMonth")}{" "}
                  {annual ? `· ${t("billedAnnual")} ($590)` : ""}
                </div>
                <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">
                  {t("proSubtitle")}
                </div>
                <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">
                  {t("proLimits")}
                </div>
                <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
                <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
                  {PRO_FEATS.map((k) => (
                    <li
                      key={k}
                      className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400"
                    >
                      <span className="flex-shrink-0 mt-px font-bold text-green-600">
                        ✓
                      </span>
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

          {/* Negocio */}
          <ScrollReveal variant="fade-up" delay={240} threshold={0.06}>
            <div className="group h-full bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[20px] p-[32px_26px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)] hover:border-purple-500/30 flex flex-col">
              <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-[1px] uppercase mb-[10px]">
                Negocio
              </div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-[20px] font-semibold text-slate-900 dark:text-white">
                  $
                </span>
                <span className="text-[46px] font-black text-slate-900 dark:text-white tracking-[-2px] leading-none">
                  {annual ? "82" : "99"}
                </span>
                {annual && (
                  <span className="text-[15px] text-slate-400 line-through ml-2 font-normal">
                    $99
                  </span>
                )}
              </div>
              <div className="text-[12px] text-slate-500 dark:text-zinc-400 mb-1">
                {t("perMonth")}{" "}
                {annual ? `· ${t("billedAnnual")} ($990)` : ""}
              </div>
              <div className="text-[12.5px] text-slate-400 dark:text-zinc-500 italic mb-1">
                {t("entSubtitle")}
              </div>
              <div className="text-[11.5px] text-purple-500 font-semibold mb-[18px]">
                {t("entLimits")}
              </div>
              <div className="h-px bg-black/[0.08] dark:bg-white/[0.08] mb-[16px]" />
              <ul className="flex flex-col gap-[9px] mb-[26px] list-none p-0 flex-grow">
                {ENT_FEATS.map((k) => (
                  <li
                    key={k}
                    className="flex items-start gap-2 text-[13px] text-slate-500 dark:text-zinc-400"
                  >
                    <span className="flex-shrink-0 mt-px font-bold text-green-600">
                      ✓
                    </span>
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

        {/* ── Comparison table — Option C: fade+pill outer + accordion inner ── */}
        <div ref={tableWrapRef} className="relative">

          {/* Outer collapse: overflow-y hidden for height animation, overflow-x auto for mobile scroll */}
          <div
            style={{
              overflowY: "hidden",
              overflowX: "auto",
              maxHeight: tableOpen ? "8000px" : "460px",
              transition: "max-height 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ minWidth: 540 }}>

              {/* Column header bar */}
              <div
                className="grid px-5 py-3 mb-2 rounded-xl border border-black/[0.07] dark:border-white/[0.06] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm"
                style={{ gridTemplateColumns: "1fr 88px 110px 88px" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.9px] text-slate-400 dark:text-zinc-500">
                  {t("featureCol")}
                </div>
                <div className="text-center text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  Inicial
                </div>
                <div className="text-center text-[11px] font-bold text-purple-500">
                  Profesional
                </div>
                <div className="text-center text-[11px] font-bold text-amber-500">
                  Negocio
                </div>
              </div>

              {/* Accordion items */}
              <div className="flex flex-col gap-[6px]">
                {catGroups.map((group, gi) => {
                  const isOpen = openCats.has(gi);
                  const bCount = countIncluded(group.rows.map((r) => r.b));
                  const pCount = countIncluded(group.rows.map((r) => r.p));
                  const eCount = countIncluded(group.rows.map((r) => r.e));
                  const total = group.rows.length;

                  return (
                    <div
                      key={gi}
                      className={`rounded-[12px] overflow-hidden transition-colors duration-200 border ${
                        isOpen
                          ? "border-purple-500/30 dark:border-purple-500/20"
                          : "border-black/[0.07] dark:border-white/[0.07] hover:border-purple-500/20 dark:hover:border-purple-500/15"
                      }`}
                    >
                      {/* Trigger */}
                      <button
                        onClick={() => toggleCat(gi)}
                        className={`w-full flex items-center justify-between px-5 py-[14px] gap-3 transition-colors duration-150 text-left ${
                          isOpen
                            ? "bg-purple-500/[0.04] dark:bg-purple-500/[0.04]"
                            : "bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Left: chevron + label + count */}
                        <div className="flex items-center gap-[10px] flex-1 min-w-0">
                          <span className="text-purple-500">
                            <ChevronIcon open={isOpen} />
                          </span>
                          <span className="text-[13.5px] font-bold text-slate-800 dark:text-zinc-100 truncate">
                            {group.label}
                          </span>
                          <span className="text-[10px] font-semibold px-[7px] py-px rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.07] text-slate-400 dark:text-zinc-500 whitespace-nowrap flex-shrink-0">
                            {total}
                          </span>
                        </div>

                        {/* Right: score badges (hidden on mobile) */}
                        <div
                          className="hidden sm:grid gap-0 flex-shrink-0"
                          style={{ gridTemplateColumns: "88px 110px 88px" }}
                        >
                          {group.isLimits ? (
                            <>
                              <div className="text-center text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                                1·3·20
                              </div>
                              <div className="text-center text-[11px] font-semibold text-purple-500">
                                2·10·50
                              </div>
                              <div className="text-center text-[11px] font-semibold text-amber-500">
                                ∞
                              </div>
                            </>
                          ) : (
                            <>
                              <ScoreBadge count={bCount} total={total} />
                              <ScoreBadge
                                count={pCount}
                                total={total}
                                isPro
                              />
                              <ScoreBadge count={eCount} total={total} />
                            </>
                          )}
                        </div>
                      </button>

                      {/* Panel */}
                      <div
                        style={{
                          maxHeight: isOpen ? "2000px" : "0px",
                          overflow: "hidden",
                          transition:
                            "max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        <table className="w-full border-collapse">
                          <tbody>
                            {group.rows.map((row, ri) => (
                              <tr
                                key={ri}
                                className="border-t border-black/[0.04] dark:border-white/[0.04] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.015]"
                              >
                                <td className="text-[13px] text-slate-500 dark:text-zinc-400 px-5 py-[10px]">
                                  {row.f}
                                </td>
                                <td
                                  className="text-center px-3 py-[10px]"
                                  style={{ width: 88, minWidth: 88 }}
                                >
                                  <CmpCell v={row.b} />
                                </td>
                                <td
                                  className="text-center px-3 py-[10px] bg-purple-500/[0.025] dark:bg-purple-500/[0.04]"
                                  style={{ width: 110, minWidth: 110 }}
                                >
                                  <CmpCell v={row.p} />
                                </td>
                                <td
                                  className="text-center px-3 py-[10px]"
                                  style={{ width: 88, minWidth: 88 }}
                                >
                                  <CmpCell v={row.e} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fade overlay — fades out when table is open */}
            <div
              className="absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-b from-transparent dark:to-[#09090b] to-white pointer-events-none transition-opacity duration-500"
              style={{ zIndex: 2, opacity: tableOpen ? 0 : 1 }}
            />
          </div>

          {/* Pill button — floats over fade when collapsed, drops below when expanded */}
          <div
            className="flex justify-center"
            style={{
              position: "absolute",
              bottom: tableOpen ? -60 : 22,
              left: 0,
              right: 0,
              zIndex: 10,
              transition: "bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <button
              onClick={handleToggleTable}
              className="inline-flex items-center gap-2 bg-purple-500/[0.11] dark:bg-purple-500/[0.11] border border-purple-500/40 text-purple-500 dark:text-purple-400 text-[13.5px] font-bold px-7 py-[11px] rounded-full cursor-pointer hover:bg-purple-500/[0.2] hover:border-purple-500/60 transition-all duration-200 shadow-[0_0_0_5px_rgba(139,92,246,0.05),0_8px_32px_rgba(139,92,246,0.18)] hover:shadow-[0_0_0_6px_rgba(139,92,246,0.08),0_12px_40px_rgba(139,92,246,0.28)] hover:-translate-y-0.5 whitespace-nowrap"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <ChevronIcon open={tableOpen} />
              {tableOpen ? t("hideFeatures") : t("showAllFeatures")}
            </button>
          </div>

          {/* Spacer so content below the pill button doesn't overlap when expanded */}
          <div
            style={{
              height: tableOpen ? 64 : 0,
              transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

      </div>
    </section>
  );
}
