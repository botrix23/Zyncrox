"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Abril / April 2026 — el 1 cae en miércoles, grid comienza en Lunes (Mar 30)
const CAL_CELLS = [
  {d:30,cur:false,past:true,s:false},{d:31,cur:false,past:true,s:false},
  {d:1,cur:true,past:true,s:true},{d:2,cur:true,past:true,s:true},{d:3,cur:true,past:true,s:false},{d:4,cur:true,past:true,s:true},{d:5,cur:true,past:true,s:false},
  {d:6,cur:true,past:true,s:true},{d:7,cur:true,past:true,s:true},{d:8,cur:true,past:true,s:false},{d:9,cur:true,past:true,s:true},{d:10,cur:true,past:true,s:true},{d:11,cur:true,past:true,s:false},{d:12,cur:true,past:true,s:false},
  {d:13,cur:true,past:true,s:true},{d:14,cur:true,past:true,s:true},{d:15,cur:true,past:true,s:true},{d:16,cur:true,past:true,s:false},{d:17,cur:true,past:true,s:true},{d:18,cur:true,past:true,s:false},{d:19,cur:true,past:true,s:true},
  {d:20,cur:true,past:false,s:true},{d:21,cur:true,past:false,s:true},{d:22,cur:true,past:false,s:true},{d:23,cur:true,past:false,s:false},{d:24,cur:true,past:false,s:true},{d:25,cur:true,past:false,s:false},{d:26,cur:true,past:false,s:false},
  {d:27,cur:true,past:false,s:true},{d:28,cur:true,past:false,s:true},{d:29,cur:true,past:false,s:true},{d:30,cur:true,past:false,s:false},
  {d:1,cur:false,past:false,s:false},{d:2,cur:false,past:false,s:false},{d:3,cur:false,past:false,s:false},
];

const MORNING   = ["8:00 AM","8:15 AM","8:30 AM","8:45 AM","9:00 AM","9:15 AM","9:30 AM","9:45 AM","10:00 AM","10:15 AM","10:30 AM","10:45 AM","11:00 AM","11:15 AM"];
const AFTERNOON = ["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];

export function LandingWidgetMockup() {
  const t = useTranslations("Landing.widget");

  const [selDate, setSelDate]     = useState(20);
  const [selSpec, setSelSpec]     = useState(0);
  const [selSlot, setSelSlot]     = useState<string | null>(null);
  const [tardeOpen, setTardeOpen] = useState(false);

  const DAY_HDRS = t("dayHeaders").split(",");

  const SPECS = [
    { id: 0, label: t("specAnyone"), icon: "✨", gradient: true },
    { id: 1, label: t("spec1"),  initials: t("spec1").charAt(0), color: "#7c3aed" },
    { id: 2, label: t("spec2"), initials: t("spec2").charAt(0), color: "#ec4899" },
  ];

  return (
    <div
      className="flex rounded-3xl overflow-hidden bg-slate-50 w-full"
      style={{
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.14), 0 32px 72px rgba(0,0,0,0.26), 0 64px 120px rgba(139,92,246,0.12)",
      }}
    >

      {/* ── Sidebar ── */}
      <div className="w-[190px] flex-shrink-0 bg-white/50 border-r border-slate-200 p-6 flex flex-col backdrop-blur-xl">

        {/* Business name */}
        <div className="text-[17px] font-black text-slate-900 tracking-tight mb-1">Studio Noa</div>
        <div className="text-[11px] text-slate-500 leading-[1.5] mb-5">
          {t("tagline")}
        </div>

        {/* Appointment summary */}
        <div className="text-[9.5px] font-black text-slate-400 tracking-[0.2em] uppercase mb-3">{t("yourAppt")}</div>

        <div className="flex items-start gap-2 mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t("branch")}</div>
            <div className="text-[11px] font-bold text-slate-900 leading-[1.3]">{t("branchName")}</div>
          </div>
        </div>

        {/* Services */}
        <div className="text-[9.5px] font-black text-slate-400 tracking-[0.2em] uppercase mt-4 mb-3">{t("servicesSelected")}</div>
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-emerald-500 shrink-0">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11.5px] font-bold text-slate-700">{t("serviceName")}</span>
          </div>
          <span className="text-[10px] font-black text-slate-400 shrink-0 mt-px">{t("serviceDuration")}</span>
        </div>

        <div className="h-px bg-slate-100 my-4" />

        {/* Price summary card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-inner">
          <div className="text-[9.5px] font-black text-purple-600 tracking-[0.2em] uppercase mb-2 text-center">{t("summary")}</div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[26px] font-black text-slate-900 tracking-tighter leading-none">$25.00</span>
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">{t("summaryDetail")}</span>
          </div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 bg-white/95 p-5 flex flex-col gap-3 min-w-0 overflow-hidden">

        {/* Step header */}
        <div className="flex items-center gap-2">
          <button className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="text-[16px] font-bold text-slate-900 tracking-tight">{t("stepTitle")}</div>
        </div>

        {/* Agendando banner */}
        <div className="w-full p-1.5 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-center gap-2">
          <div className="bg-purple-600 px-3 py-1 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] leading-none">{t("booking")}</span>
          </div>
          <span className="text-[12px] font-bold text-purple-600">{t("serviceName")}</span>
        </div>

        {/* Staff selection — circular avatars */}
        <div className="flex gap-5 pb-1 px-0.5">
          {SPECS.map(sp => {
            const isSelected = selSpec === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => setSelSpec(sp.id)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 select-none ${isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
              >
                <div
                  className={`w-[46px] h-[46px] rounded-full flex items-center justify-center text-base font-black shadow-lg transition-all duration-300`}
                  style={
                    isSelected
                      ? sp.gradient
                        ? { background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "white", boxShadow: "0 0 0 4px rgba(251,191,36,0.2)" }
                        : { backgroundColor: "#7c3aed", color: "white", boxShadow: "0 0 0 4px rgba(139,92,246,0.2)" }
                      : { background: "#f4f4f5", color: sp.color || "#94a3b8", border: "1.5px solid #e4e4e7" }
                  }
                >
                  {sp.gradient ? "✨" : sp.initials}
                </div>
                <span className={`text-[10px] font-black tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {sp.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Calendar + Slots */}
        <div className="flex gap-3 min-w-0 flex-1">

          {/* Calendar */}
          <div className="flex-shrink-0 w-[195px]">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{t("daysAvailable")}</div>
            <div className="bg-white rounded-[24px] border border-slate-200 p-3 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] font-black text-slate-900 tracking-tight capitalize">{t("monthLabel")}</div>
                <div className="flex gap-1 shrink-0">
                  {[
                    "M15 18l-6-6 6-6",
                    "M9 6l6 6-6 6"
                  ].map((d, i) => (
                    <button key={i} className="w-[22px] h-[22px] rounded-xl border border-slate-100 bg-white flex items-center justify-center text-slate-400 cursor-pointer hover:bg-purple-500/5 hover:text-purple-600 hover:border-purple-500/20 transition-all">
                      <svg width="9" height="9" fill="none" viewBox="0 0 24 24">
                        <path d={d} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 text-center mb-3">
                {DAY_HDRS.map(h => (
                  <div key={h} className="text-[8.5px] font-black text-slate-400 tracking-[0.1em]">{h}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {CAL_CELLS.map((c, i) => {
                  const isSel = c.cur && !c.past && c.d === selDate;
                  return (
                    <div
                      key={i}
                      onClick={() => { if (c.cur && !c.past) setSelDate(c.d); }}
                      className={`w-7 h-7 mx-auto flex flex-col items-center justify-center rounded-full text-[10.5px] font-bold relative transition-all duration-300
                        ${!c.cur || c.past
                          ? "text-slate-200 cursor-default opacity-30"
                          : isSel
                            ? "text-white scale-105 cursor-pointer"
                            : "text-slate-700 cursor-pointer hover:bg-purple-500/5 hover:text-purple-600"
                        }`}
                      style={isSel ? { backgroundColor: "#7c3aed", boxShadow: "0 4px 12px rgba(124,58,237,0.4)" } : {}}
                    >
                      {c.d}
                      {c.cur && !c.past && !isSel && c.s && (
                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-purple-500/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1">
              <svg width="9" height="9" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {t("timesAvailable")}
            </div>

            <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-3 shadow-sm overflow-hidden flex flex-col">

              {/* Morning */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5 py-[4px] mb-2">
                  <span className="text-[12px]">🌅</span>
                  <span className="text-[10.5px] font-black text-slate-900 flex-1 uppercase tracking-[0.1em]">{t("morning")}</span>
                  <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-purple-500/20 whitespace-nowrap">{t("freeSlots")}</span>
                  <svg width="9" height="9" fill="none" viewBox="0 0 24 24" className="text-slate-400 rotate-180">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MORNING.map((slot, i) => (
                    <div
                      key={i}
                      onClick={() => setSelSlot(selSlot === slot ? null : slot)}
                      className={`py-[5px] rounded-xl text-center text-[10px] font-bold cursor-pointer border transition-all duration-150 select-none whitespace-nowrap
                        ${selSlot === slot
                          ? "-translate-y-px"
                          : "border-slate-200 text-slate-700 bg-white hover:border-purple-500/40 hover:text-purple-600 hover:bg-purple-500/5 hover:-translate-y-px"
                        }`}
                      style={selSlot === slot ? {
                        backgroundColor: "#7c3aed",
                        borderColor: "#7c3aed",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
                      } : {}}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {/* Afternoon */}
              <div>
                <div
                  className="flex items-center gap-1.5 py-[4px] cursor-pointer"
                  onClick={() => setTardeOpen(!tardeOpen)}
                >
                  <span className="text-[12px]">☀️</span>
                  <span className="text-[10.5px] font-black text-slate-900 flex-1 uppercase tracking-[0.1em]">{t("afternoon")}</span>
                  <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-purple-500/20 whitespace-nowrap">{t("freeSlots")}</span>
                  <svg
                    width="9" height="9" fill="none" viewBox="0 0 24 24"
                    className={`text-slate-400 transition-transform duration-200 ${tardeOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </div>
                {tardeOpen && (
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {AFTERNOON.map((slot, i) => (
                      <div
                        key={i}
                        onClick={() => setSelSlot(selSlot === slot ? null : slot)}
                        className={`py-[5px] rounded-xl text-center text-[10px] font-bold cursor-pointer border transition-all duration-150 select-none whitespace-nowrap
                          ${selSlot === slot
                            ? "-translate-y-px"
                            : "border-slate-200 text-slate-700 bg-white hover:border-purple-500/40 hover:text-purple-600 hover:bg-purple-500/5 hover:-translate-y-px"
                          }`}
                        style={selSlot === slot ? {
                          backgroundColor: "#7c3aed",
                          borderColor: "#7c3aed",
                          color: "white",
                          boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
                        } : {}}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
          <button className="py-3 px-2 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-black tracking-widest uppercase transition-all text-[9.5px] shadow-md hover:bg-slate-50 hover:border-slate-200 flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="shrink-0">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            {t("back")}
          </button>
          <button
            disabled={!selSlot}
            className={`py-3 px-2 rounded-2xl font-black tracking-widest uppercase transition-all text-[9.5px] flex items-center justify-center gap-1.5 active:scale-[0.98] ${
              selSlot
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {t("continue")}
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="shrink-0">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
