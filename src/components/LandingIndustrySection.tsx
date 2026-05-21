"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal } from "./ScrollReveal";

const INDUSTRY_ICONS = ["💇", "✂️", "🧖", "🏥", "🏠", "📋"];
const INDUSTRY_KEYS = ["i1", "i2", "i3", "i4", "i5", "i6"] as const;

export function LandingIndustrySection() {
  const t = useTranslations("Landing.industry");

  const items = INDUSTRY_KEYS.map((k, i) => ({
    icon: INDUSTRY_ICONS[i],
    name: t(`${k}Name` as any),
    desc: t(`${k}Desc` as any),
  }));

  return (
    <section className="relative z-10 bg-transparent py-[clamp(64px,8vw,100px)] px-5 lg:px-16">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="text-center mb-[clamp(36px,5vw,52px)]">
          <h2 className="font-serif text-[clamp(30px,3.8vw,50px)] leading-[1.1] tracking-[-0.4px] text-slate-900 dark:text-white mb-3 transition-colors duration-300">
            {t("title")}
          </h2>
          <p className="text-[clamp(14px,1.4vw,16px)] text-slate-500 dark:text-zinc-400 leading-[1.65] transition-colors duration-300">
            {t("subtitle")}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {items.map((item, i) => (
            <ScrollReveal key={i} variant="zoom-in" delay={i * 60} threshold={0.06}>
            <div
              className="h-full bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-[14px] p-[clamp(18px,2vw,24px)] hover:border-purple-500/[0.22] hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(139,92,246,0.08)] transition-all duration-200 cursor-default"
            >
              <div className="text-[28px] mb-[10px]">{item.icon}</div>
              <div className="text-[clamp(13.5px,1.2vw,15px)] font-bold text-slate-900 dark:text-white tracking-[-0.2px] mb-[5px] leading-[1.3] transition-colors duration-300">
                {item.name}
              </div>
              <div className="text-[clamp(12px,1.1vw,13px)] text-zinc-500 dark:text-zinc-400 leading-[1.6] transition-colors duration-300">
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
