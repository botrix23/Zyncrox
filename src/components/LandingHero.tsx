"use client";

import Link from "next/link";
import { LandingWidgetMockup } from "./LandingWidgetMockup";
import { WidgetTiltWrapper } from "./WidgetTiltWrapper";

const SOCIAL_AVATARS = [
  { initials: "AF", bg: "bg-indigo-500" },
  { initials: "CM", bg: "bg-sky-500" },
  { initials: "JL", bg: "bg-amber-500" },
  { initials: "RV", bg: "bg-emerald-500" },
];

export function LandingHero() {
  return (
    <section className="relative z-10 min-h-screen pt-16 flex items-center px-5 lg:px-16">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-9 lg:gap-[72px] items-center py-16">

        {/* ── Left: Copy ── */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-[7px] border border-purple-500/35 bg-purple-500/[0.08] text-purple-400 text-[12px] font-medium px-3 py-[5px] rounded-full mb-[26px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="w-[5px] h-[5px] bg-purple-500 rounded-full animate-badge-blink flex-shrink-0" />
            Nuevo · Integración con Google Calendar
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(30px,3.2vw,50px)] font-extrabold leading-[1.1] tracking-[-1.2px] text-slate-900 dark:text-white mb-[22px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            Reservas que se adaptan<br />
            a tu negocio. <em className="italic font-bold text-purple-600">No al revés.</em>
          </h1>

          {/* Subtitle */}
          <p className="text-[clamp(14px,1.3vw,15.5px)] leading-[1.72] text-slate-500 dark:text-zinc-400 max-w-[400px] mb-[34px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            ZyncSlot transforma la gestión de citas en una experiencia fluida. Personaliza, automatiza y crece — sin complicaciones técnicas.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap mb-11 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <Link
              href="/admin/register"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-purple-600 hover:bg-purple-700 px-[26px] py-[13px] rounded-[10px] whitespace-nowrap shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.6),0_8px_32px_rgba(139,92,246,0.45)] hover:-translate-y-0.5 transition-all duration-150 no-underline"
            >
              Empieza gratis
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <button className="inline-flex items-center gap-[7px] text-[15px] font-medium text-slate-500 dark:text-zinc-400 bg-transparent border border-black/[0.15] dark:border-white/[0.13] hover:text-slate-900 dark:hover:text-white hover:border-purple-500/40 hover:bg-purple-500/[0.06] px-[22px] py-3 rounded-[10px] whitespace-nowrap hover:-translate-y-px transition-all duration-150 cursor-pointer">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
              </svg>
              Ver demo
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex">
              {SOCIAL_AVATARS.map((a, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 border-[#f5f4f2] dark:border-[#09090b] ${a.bg} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 transition-colors duration-300 ${i > 0 ? "-ml-2" : ""}`}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-slate-400 dark:text-zinc-500">
              <strong className="text-slate-500 dark:text-zinc-400 font-semibold">+2.400 negocios</strong> ya gestionan sus citas con ZyncSlot
            </p>
          </div>
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
