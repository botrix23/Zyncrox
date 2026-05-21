"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal } from "./ScrollReveal";

const PAIN_KEYS = ["p1", "p2", "p3", "p4"] as const;

export function LandingPainSection() {
  const t = useTranslations("Landing.pain");

  const pains = PAIN_KEYS.map((k) => ({
    title: t(`${k}Title` as any),
    desc: t(`${k}Desc` as any),
  }));

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16">
      <div className="max-w-[1080px] mx-auto">
        {/* Headline */}
        <h2 className="font-serif text-[clamp(32px,4vw,58px)] leading-[1.12] tracking-[-0.5px] text-slate-900 dark:text-white mb-5 max-w-[780px] transition-colors duration-300">
          {t("title1")}<br />
          a <em className="text-purple-600">{t("titleItalic")}</em>
        </h2>
        <p className="text-[clamp(15px,1.5vw,17px)] text-slate-500 dark:text-zinc-400 leading-[1.68] max-w-[520px] mb-[clamp(44px,6vw,72px)] transition-colors duration-300">
          {t("subtitle")}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pains.map((p, i) => (
            <ScrollReveal key={i} variant="fade-up" delay={i * 90} threshold={0.06}>
            <div
              className="h-full bg-white dark:bg-zinc-900/80 border border-black/[0.13] dark:border-white/[0.13] rounded-[14px] p-[clamp(22px,2.5vw,32px)] hover:border-red-400/30 hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              <div className="inline-flex items-center justify-center w-7 h-7 bg-red-500/[0.12] border border-red-500/25 rounded-[7px] text-red-400 text-[14px] font-black mb-[14px] flex-shrink-0">
                ✕
              </div>
              <div className="text-[clamp(15px,1.4vw,17px)] font-bold text-slate-900 dark:text-white tracking-[-0.3px] mb-2 leading-[1.3] transition-colors duration-300">
                {p.title}
              </div>
              <div className="text-[clamp(13px,1.2vw,14.5px)] text-slate-500 dark:text-zinc-400 leading-[1.65] transition-colors duration-300">
                {p.desc}
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
