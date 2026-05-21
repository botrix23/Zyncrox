"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal } from "./ScrollReveal";

const DIFF_KEYS = ["d1", "d2", "d3", "d4"] as const;

export function LandingDiffSection() {
  const t = useTranslations("Landing.diff");

  const items = DIFF_KEYS.map((k) => ({
    icon: t(`${k}Icon` as any),
    title: t(`${k}Title` as any),
    desc: t(`${k}Desc` as any),
  }));

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="mb-[clamp(40px,5vw,56px)]">
          <h2 className="font-serif text-[clamp(32px,4vw,54px)] leading-[1.12] tracking-[-0.4px] text-slate-900 dark:text-white mb-4 transition-colors duration-300">
            {t("title")}
          </h2>
        </div>

        {/* Grid 2×2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item, i) => (
            <ScrollReveal key={i} variant={i % 2 === 0 ? "fade-right" : "fade-left"} delay={i * 80} threshold={0.06}>
            <div
              className="h-full bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-[16px] p-[clamp(22px,2.5vw,32px)] hover:border-purple-500/[0.18] hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(139,92,246,0.10)] transition-all duration-200 cursor-default"
            >
              {/* Icon badge */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-purple-100 dark:bg-purple-950/40 text-[20px] mb-4 flex-shrink-0">
                {item.icon}
              </div>
              <div className="text-[clamp(15px,1.4vw,17px)] font-bold text-slate-900 dark:text-white tracking-[-0.3px] mb-2 leading-[1.3] transition-colors duration-300">
                {item.title}
              </div>
              <div className="text-[clamp(13px,1.2vw,14.5px)] text-slate-500 dark:text-zinc-400 leading-[1.65] transition-colors duration-300">
                {item.desc}
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
