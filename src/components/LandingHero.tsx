"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { LandingWidgetMockup } from "./LandingWidgetMockup";
import { WidgetTiltWrapper } from "./WidgetTiltWrapper";

export function LandingHero() {
  const t = useTranslations("Landing.hero");
  const locale = useLocale();

  return (
    <section className="relative z-10 min-h-screen pt-16 flex items-center px-5 lg:px-16">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-9 lg:gap-[72px] items-center py-16">

        {/* ── Left: Copy ── */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-[7px] border border-purple-500/35 bg-purple-500/[0.08] text-purple-400 text-[12px] font-medium px-3 py-[5px] rounded-full mb-[26px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="w-[5px] h-[5px] bg-purple-500 rounded-full animate-badge-blink flex-shrink-0" />
            {t("badge")}
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(30px,3.2vw,50px)] font-extrabold leading-[1.1] tracking-[-1.2px] text-slate-900 dark:text-white mb-[22px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {t("h1Line1")}<br />
            {t("h1Line2")} <em className="italic font-bold text-purple-600">{t("h1Italic")}</em>
          </h1>

          {/* Subtitle */}
          <p className="text-[clamp(14px,1.3vw,15.5px)] leading-[1.72] text-slate-500 dark:text-zinc-400 max-w-[400px] mb-[34px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            {t("subtitle")}
          </p>

          {/* CTA */}
          <div className="flex items-center gap-3 flex-wrap mb-9 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <Link
              href={`/${locale}/admin/register`}
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-purple-600 hover:bg-purple-700 px-[26px] py-[13px] rounded-[10px] whitespace-nowrap shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.6),0_8px_32px_rgba(139,92,246,0.45)] hover:-translate-y-0.5 transition-all duration-150 no-underline"
            >
              {t("cta1")}
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Tagline */}
          <p className="text-[12.5px] text-slate-400 dark:text-zinc-500 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            {t("tagline")}
          </p>
        </div>

        {/* ── Right: Widget mockup with 3D tilt ── */}
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 delay-150">
          <WidgetTiltWrapper>
            {/* Floating notification 1 */}
            <div className="hidden lg:flex absolute -top-5 -right-5 z-20 w-[218px] items-center gap-[9px] bg-[#18181b] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-3 py-2.5 animate-notif-1 pointer-events-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-purple-500/20 text-white">✓</div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-bold text-[#fafafa]">Nueva reserva</div>
                <div className="text-[10.5px] text-[#a1a1aa]">María G. · Hoy 14:30</div>
              </div>
              <div className="ml-auto text-[10px] text-[#71717a] flex-shrink-0">ahora</div>
            </div>

            <LandingWidgetMockup />

            {/* Floating notification 2 */}
            <div className="hidden lg:flex absolute bottom-8 -left-6 z-20 w-[218px] items-center gap-[9px] bg-[#18181b] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-3 py-2.5 animate-notif-2 pointer-events-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-amber-400/15">🔔</div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-bold text-[#fafafa]">Recordatorio enviado</div>
                <div className="text-[10.5px] text-[#a1a1aa]">Carlos R. · Mañana 10:00</div>
              </div>
              <div className="ml-auto text-[10px] text-[#71717a] flex-shrink-0">2m</div>
            </div>
          </WidgetTiltWrapper>
        </div>

      </div>
    </section>
  );
}
