"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function MockStep1() {
  const t = useTranslations("Landing.how");
  return (
    <div>
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-[7px] text-[15px] font-bold text-slate-900">
          <span className="text-purple-600 text-[18px]">⚡</span>Zyncrox
        </span>
      </div>
      <div className="text-[18px] font-black text-center text-slate-900 tracking-tight mb-1">{t("mock1Title")}</div>
      <div className="text-[12.5px] text-zinc-500 text-center mb-6">{t("mock1Subtitle")}</div>
      {[
        { labelKey: "mock1FieldBusiness", val: "Studio Noa", type: "text" },
        { labelKey: "mock1FieldEmail",    val: "hola@studionoa.com", type: "email" },
        { labelKey: "mock1FieldPassword", val: "••••••••", type: "password" },
      ].map((f) => (
        <div className="mb-3" key={f.labelKey}>
          <div className="text-[11.5px] font-semibold text-zinc-600 mb-[5px]">{t(f.labelKey as any)}</div>
          <input
            type={f.type}
            readOnly
            value={f.val}
            className="w-full px-[13px] py-[10px] rounded-lg border-[1.5px] border-zinc-200 bg-zinc-50 text-[13px] text-zinc-400 outline-none"
          />
        </div>
      ))}
      <button className="w-full mt-1.5 py-3 rounded-[9px] bg-purple-600 text-white text-[14px] font-bold shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
        {t("mock1Submit")}
      </button>
      <p className="text-center text-[11.5px] text-zinc-400 mt-3">{t("mock1Terms")}</p>
    </div>
  );
}

function MockStep2() {
  const t = useTranslations("Landing.how");
  return (
    <div>
      <div className="flex items-center gap-[10px] mb-5 pb-4 border-b border-zinc-100">
        <div className="w-10 h-10 rounded-[10px] bg-purple-600 flex items-center justify-center text-white font-black text-[16px]">N</div>
        <div>
          <div className="text-[13px] font-bold text-slate-900">Studio Noa</div>
          <div className="text-[11px] text-zinc-400">app.zyncrox.com/studionoa</div>
        </div>
      </div>
      {[
        { lbl: "Logo", val: "🖼️" },
        { lbl: "Color principal", val: <><span className="inline-block w-3.5 h-3.5 rounded-full bg-purple-500 mr-1.5" />#8B5CF6</> },
        { lbl: t("mock2FieldServices"), val: "3" },
        { lbl: t("mock2FieldStaff"), val: "2" },
        { lbl: t("mock2FieldHours"), val: "Lun–Sáb 9–19h" },
      ].map((r, i) => (
        <div key={i} className="flex items-center justify-between py-[11px] border-b border-zinc-50 last:border-none">
          <span className="text-[13px] font-medium text-zinc-600">{r.lbl}</span>
          <span className="text-[12px] text-zinc-400 flex items-center">{r.val}</span>
        </div>
      ))}
    </div>
  );
}

function MockStep3() {
  const t = useTranslations("Landing.how");
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-center h-full py-4">
      {/* Gradient link card — réplica de AppearanceClient */}
      <div
        className="w-full rounded-3xl p-6 relative overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
      >
        {/* Decorative share icon */}
        <svg
          className="absolute top-4 right-5 opacity-[0.12]"
          width="56" height="56" fill="none" viewBox="0 0 24 24"
        >
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        {/* Title + badge */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-white">{t("mock3CardTitle")}</span>
            <span className="bg-emerald-400 text-white text-[9px] font-black px-2.5 py-[3px] rounded-full tracking-widest">
              {t("mock3CardStatus")}
            </span>
          </div>
        </div>

        {/* URL row */}
        <div className="flex items-center gap-2 bg-black/25 p-2 rounded-xl border border-white/10">
          <code className="flex-1 px-2 text-[12px] font-mono text-purple-100 truncate">
            app.zyncrox.com/studionoa
          </code>
          <button
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="px-4 py-1.5 bg-white text-purple-600 rounded-lg text-[11px] font-bold flex-shrink-0 hover:bg-purple-50 transition-all cursor-pointer active:scale-95"
          >
            {copied ? t("mock3Copied") : t("mock3Copy")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MockStep4() {
  const t = useTranslations("Landing.how");
  const noBooking = t("mock4NoBooking");
  const slots = [
    { time: "9:00 AM",  client: "María González",  svc: "Manicura",         booked: true },
    { time: "10:30 AM", client: "Valentina R.",     svc: "Coloración",       booked: true },
    { time: "12:00 PM", client: "",                 svc: noBooking,          booked: false },
    { time: "2:00 PM",  client: "Sofía M.",         svc: "Corte + Brushing", booked: true },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-[14px]">
        <div className="text-[14px] font-black text-slate-900 tracking-tight">{t("mock4Date")}</div>
        <div className="bg-green-100 text-green-700 text-[10.5px] font-bold px-[10px] py-[3px] rounded-full border border-green-200">● {t("mock4BookingsCount")}</div>
      </div>
      <div className="flex flex-col gap-2">
        {slots.map((s, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-[13px] py-[10px] rounded-[9px] border-[1.5px] ${s.booked ? 'bg-purple-50 border-purple-200/40' : 'border-zinc-200'}`}>
            <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${s.booked ? 'bg-purple-600' : 'bg-zinc-300'}`} />
            <div className="text-[12px] font-bold text-slate-900 w-[52px] flex-shrink-0">{s.time}</div>
            <div className="flex-1">
              <div className="text-[12px] text-zinc-600">{s.booked ? s.client : <span className="text-zinc-300">{s.svc}</span>}</div>
              <div className="text-[11px] text-zinc-400">{s.booked ? s.svc : ""}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-green-50 border border-green-200 rounded-[9px] px-[13px] py-[10px] flex items-center gap-2">
        <span className="text-[14px]">🔔</span>
        <span className="text-[12px] font-semibold text-green-700">{t("mock4NewBooking")}</span>
      </div>
    </div>
  );
}

const MOCK_SCREENS = [MockStep1, MockStep2, MockStep3, MockStep4];

export function LandingHowSection() {
  const [active, setActive] = useState(0);
  const [switching, setSwitching] = useState(false);
  const t = useTranslations("Landing.how");

  const STEPS = [
    { num: 1, title: t("step1Title"), desc: t("step1Desc") },
    { num: 2, title: t("step2Title"), desc: t("step2Desc") },
    { num: 3, title: t("step3Title"), desc: t("step3Desc") },
    { num: 4, title: t("step4Title"), desc: t("step4Desc") },
  ];

  function goTo(i: number) {
    if (i === active) return;
    setSwitching(true);
    setTimeout(() => { setActive(i); setSwitching(false); }, 220);
  }

  const MockScreen = MOCK_SCREENS[active];

  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="text-center mb-[clamp(44px,6vw,64px)]">
          <h2 className="font-serif text-[clamp(30px,3.8vw,52px)] leading-[1.1] tracking-[-0.4px] text-slate-900 dark:text-white mb-[14px] transition-colors duration-300">
            {t("title")}
          </h2>
          <p className="text-[clamp(14px,1.4vw,16px)] text-slate-500 dark:text-zinc-400 leading-[1.65] max-w-[440px] mx-auto transition-colors duration-300">
            {t("subtitle")}
          </p>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[72px] items-start">
          {/* Steps */}
          <div className="flex flex-col gap-1">
            {STEPS.map((s, i) => (
              <div
                key={i}
                onClick={() => goTo(i)}
                className={`flex gap-4 items-start px-5 py-[18px] rounded-xl cursor-pointer border-l-[3px] transition-all duration-200 relative
                  ${active === i
                    ? 'bg-purple-500/[0.06] border-l-purple-600'
                    : 'border-l-transparent hover:bg-purple-500/[0.05]'
                  }`}
              >
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-px border-[1.5px] transition-all duration-200
                  ${active === i
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white dark:bg-zinc-900 border-black/[0.13] dark:border-white/[0.13] text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {s.num}
                </div>
                <div>
                  <div className={`text-[15px] font-bold mb-[5px] tracking-[-0.2px] transition-colors duration-200 ${active === i ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}>
                    {s.title}
                  </div>
                  <div
                    className="text-[13.5px] text-slate-400 dark:text-zinc-500 leading-[1.6] overflow-hidden transition-all duration-300"
                    style={{ maxHeight: active === i ? 80 : 0, opacity: active === i ? 1 : 0 }}
                  >
                    {s.desc}
                  </div>
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[30px] bottom-[-4px] w-px h-2 bg-black/[0.13] dark:bg-white/[0.13]" />
                )}
              </div>
            ))}
          </div>

          {/* Mockup */}
          <div className="lg:sticky lg:top-20">
            <div
              className={`bg-white rounded-[20px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.10),0_24px_56px_rgba(0,0,0,0.08)] p-7 min-h-[340px] transition-all duration-200 ${switching ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
            >
              <MockScreen />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
