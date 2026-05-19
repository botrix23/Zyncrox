"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const BRAND_MOCKS = [
  {
    name: "Glam Studio",
    slug: "glam-studio",
    color: "#db2777",
    icon: "✂️",
    services: [
      { n: "Corte + secado", d: "45 min", p: "25" },
      { n: "Manicura gel",   d: "60 min", p: "35" },
      { n: "Alisado keratina", d: "90 min", p: "80" },
    ],
  },
  {
    name: "Dr. Méndez",
    slug: "dr-mendez",
    color: "#2563eb",
    icon: "🏥",
    services: [
      { n: "Consulta general",       d: "30 min", p: "40" },
      { n: "Revisión cardiológica",  d: "45 min", p: "75" },
      { n: "Análisis clínicos",      d: "20 min", p: "30" },
    ],
  },
  {
    name: "Alma Spa",
    slug: "alma-spa",
    color: "#8b5cf6",
    icon: "🌿",
    services: [
      { n: "Masaje relajante",   d: "60 min", p: "55" },
      { n: "Facial hidratante",  d: "45 min", p: "65" },
      { n: "Aromaterapia",       d: "30 min", p: "40" },
    ],
  },
];

function BrandMockup({ data }: { data: typeof BRAND_MOCKS[0] }) {
  const t = useTranslations("Landing.brand");
  const [sel, setSel] = useState(0);
  const c = data.color;
  return (
    <div className="bg-white rounded-2xl w-[290px] flex-shrink-0 overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.12),0_16px_40px_rgba(0,0,0,0.10)] font-sans text-left">
      {/* Header */}
      <div className="px-4 py-[14px] pb-3 border-b border-[#e4e4e7] flex items-center gap-[10px]">
        <div
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[15px] flex-shrink-0"
          style={{ background: `${c}18` }}
        >
          {data.icon}
        </div>
        <div>
          <div className="text-[13.5px] font-black text-[#0d0d0b] tracking-[-0.3px]">{data.name}</div>
          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-[7px] py-[2px] rounded-full mt-0.5">
            <span>●</span> {t("mockOnline")}
          </div>
        </div>
      </div>

      {/* Step label */}
      <div className="text-[10px] font-bold text-[#71717a] tracking-[0.8px] uppercase px-4 pt-3 pb-[6px]">
        {t("mockStep")}
      </div>

      {/* Services */}
      <div className="px-3 pb-3 flex flex-col gap-[6px]">
        {data.services.map((s, i) => (
          <div
            key={i}
            onClick={() => setSel(i)}
            className="flex items-center justify-between gap-2 px-[11px] py-[9px] rounded-[9px] border-[1.5px] border-[#e4e4e7] cursor-pointer transition-all duration-150"
            style={sel === i ? { background: `${c}10`, borderColor: c } : {}}
          >
            <div>
              <div
                className="text-[12px] font-semibold text-[#0d0d0b]"
                style={sel === i ? { color: c } : {}}
              >
                {s.n}
              </div>
              <div className="text-[10.5px] text-[#71717a] mt-px">{s.d} · ${s.p}</div>
            </div>
            {sel === i && (
              <span className="text-[13px] font-black flex-shrink-0" style={{ color: c }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        className="block w-[calc(100%-24px)] mx-3 mb-3 py-[10px] rounded-lg text-[13px] font-bold text-white border-none cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: c }}
      >
        {t("mockContinue")}
      </button>
    </div>
  );
}

export function LandingBrandSection() {
  const t = useTranslations("Landing.brand");

  const BRAND_STATS = [
    { num: t("stat1Num"), lbl: t("stat1Label") },
    { num: t("stat2Num"), lbl: t("stat2Label") },
    { num: t("stat3Num"), lbl: t("stat3Label") },
    { num: t("stat4Num"), lbl: t("stat4Label") },
  ];

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16 text-center">
      <div className="max-w-[1120px] mx-auto">
        {/* Headline */}
        <h2 className="font-serif text-[clamp(34px,4.5vw,62px)] leading-[1.1] tracking-[-0.4px] text-slate-900 dark:text-white mb-4 transition-colors duration-300">
          {t("title1")}<br />
          <em className="italic text-purple-600">{t("titleItalic")}</em>
        </h2>
        <p className="text-[clamp(14px,1.4vw,16.5px)] text-slate-500 dark:text-zinc-400 max-w-[560px] mx-auto mb-[clamp(40px,5vw,64px)] leading-[1.65] transition-colors duration-300">
          {t("subtitle")}
        </p>

        {/* Mockups */}
        <div className="flex gap-6 justify-center items-start mb-[clamp(40px,5vw,64px)] overflow-x-auto pb-3 lg:overflow-x-visible">
          {BRAND_MOCKS.map((m, i) => (
            <div key={i} className="flex flex-col items-center gap-4 flex-shrink-0">
              <BrandMockup data={m} />
              <div>
                <span className="block text-[14px] font-bold text-slate-500 dark:text-zinc-400 mb-[3px] transition-colors duration-300">
                  {m.name}
                </span>
                <span className="text-[12px] text-purple-600">app.zyncrox.com/{m.slug}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {BRAND_STATS.map((s, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-black/[0.13] dark:border-white/[0.13] rounded-[14px] px-5 py-6 text-center transition-colors duration-300"
            >
              <div className="text-[28px] font-black text-purple-600 tracking-[-0.5px] mb-[6px]">{s.num}</div>
              <div className="text-[13px] text-slate-500 dark:text-zinc-400 leading-[1.4] transition-colors duration-300">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
