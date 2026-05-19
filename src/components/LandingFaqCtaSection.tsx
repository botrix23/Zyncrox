"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
const FOOTER_COL_KEYS = [
  { titleKey: "col1Title", links: ["col1L1", "col1L2", "col1L3", "col1L4"] },
  { titleKey: "col2Title", links: ["col2L1", "col2L2", "col2L3", "col2L4"] },
  { titleKey: "col3Title", links: ["col3L1", "col3L2"] },
] as const;

export function LandingFaqCtaSection() {
  const [open, setOpen] = useState<boolean[]>(FAQ_KEYS.map(() => false));
  const t = useTranslations("Landing");
  const locale = useLocale();

  function toggle(i: number) {
    setOpen((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  const faqItems = FAQ_KEYS.map((k) => ({
    q: t(`faq.${k}` as any),
    a: t(`faq.a${k.slice(1)}` as any),
  }));

  return (
    <>
      {/* ── FAQ ── */}
      <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16">
        <div className="max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-[clamp(40px,5vw,80px)] items-start">
          <h2 className="font-serif text-[clamp(34px,4vw,54px)] leading-[1.12] tracking-[-0.4px] text-slate-900 dark:text-white lg:sticky lg:top-20 transition-colors duration-300">
            {t("faq.title1")}<br />
            <em className="italic text-purple-600">{t("faq.titleItalic")}</em>
          </h2>

          <div className="flex flex-col gap-2">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  open[i]
                    ? "border-l-2 border-l-purple-600 border-black/[0.13] dark:border-white/[0.13]"
                    : "border-black/[0.13] dark:border-white/[0.13]"
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className={`w-full flex items-center justify-between gap-3 px-5 py-[18px] text-left bg-transparent border-none cursor-pointer transition-colors duration-200 ${
                    open[i] ? "bg-white dark:bg-zinc-900" : ""
                  }`}
                >
                  <span className="text-[14.5px] font-semibold text-slate-900 dark:text-white transition-colors duration-300">
                    {item.q}
                  </span>
                  <span
                    className={`text-[20px] font-light text-slate-400 dark:text-zinc-500 flex-shrink-0 transition-all duration-250 ${
                      open[i] ? "rotate-45 text-purple-500" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="text-[14px] text-slate-500 dark:text-zinc-400 leading-[1.65] overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: open[i] ? 200 : 0,
                    padding: open[i] ? "4px 20px 18px" : "0 20px",
                    opacity: open[i] ? 1 : 0,
                  }}
                >
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-[clamp(80px,10vw,140px)] px-5 lg:px-16 text-center overflow-hidden bg-transparent">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[700px] h-[700px] rounded-full pointer-events-none animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 65%)" }}
        />
        <div className="relative">
          <div className="text-[38px] mb-5 text-purple-600">⚡</div>
          <h2 className="font-serif text-[clamp(28px,4.2vw,58px)] leading-[1.12] tracking-[-0.4px] text-slate-900 dark:text-white max-w-[720px] mx-auto mb-[18px] transition-colors duration-300">
            {t("cta.title")}
          </h2>
          <p className="text-[clamp(15px,1.5vw,17px)] text-slate-500 dark:text-zinc-400 max-w-[480px] mx-auto mb-9 leading-[1.65] transition-colors duration-300">
            {t("cta.subtitle")}
          </p>
          <Link
            href={`/${locale}/admin/register`}
            className="inline-block text-[16px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-10 py-4 rounded-xl shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_8px_32px_rgba(139,92,246,0.4)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.6),0_12px_44px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 transition-all duration-150 no-underline"
          >
            {t("cta.btn")}
          </Link>
          <p className="text-[12.5px] text-slate-400 dark:text-zinc-500 mt-4 transition-colors duration-300">
            {t("cta.note")}
          </p>
          <div className="flex justify-center gap-3 mt-7 flex-wrap">
            {[t("cta.badge1"), t("cta.badge2")].map((b) => (
              <div
                key={b}
                className="flex items-center gap-[6px] border border-black/[0.13] dark:border-white/[0.13] bg-white dark:bg-zinc-900 rounded-full px-4 py-[7px] text-[12.5px] text-slate-500 dark:text-zinc-400 font-medium transition-colors duration-300"
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#09090b] border-t border-white/[0.08] px-5 lg:px-16 pt-[60px] pb-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-[clamp(24px,4vw,56px)] mb-12">
            {/* Brand */}
            <div>
              <Link href={`/${locale}`} className="flex items-center gap-2 no-underline mb-3">
                <Zap className="w-[18px] h-[18px] text-purple-500 fill-purple-500" />
                <span className="text-[16px] font-bold text-[#fafafa] tracking-[-0.4px]">Zyncrox</span>
              </Link>
              <p className="text-[13.5px] text-[#71717a] leading-[1.6] mb-5">
                {t("footer.tagline")}
              </p>
              <div className="flex gap-2">
                {["𝕏", "in", "📷", "▶"].map((ic, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-[34px] h-[34px] rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#a1a1aa] text-[15px] no-underline hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-300 transition-all duration-150"
                  >
                    {ic}
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_COL_KEYS.map((col) => (
              <div key={col.titleKey}>
                <div className="text-[11.5px] font-bold text-[#fafafa] tracking-[0.6px] uppercase mb-[14px]">
                  {t(`footer.${col.titleKey}` as any)}
                </div>
                <ul className="list-none p-0 m-0 flex flex-col gap-[10px]">
                  {col.links.map((lk) => (
                    <li key={lk}>
                      <a
                        href="#"
                        className="text-[13.5px] text-[#71717a] no-underline hover:text-[#a1a1aa] transition-colors duration-150"
                      >
                        {t(`footer.${lk}` as any)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] pt-6 text-center text-[12.5px] text-[#52525b]">
            {t("footer.copyright")}
          </div>
        </div>
      </footer>
    </>
  );
}
