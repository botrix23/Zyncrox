"use client";

import { useState } from "react";

// Abril 2026 — el 1 cae en miércoles, grid comienza en Lunes (Mar 30)
const CAL_CELLS = [
  {d:30,cur:false,past:true,s:false},{d:31,cur:false,past:true,s:false},
  {d:1,cur:true,past:true,s:true},{d:2,cur:true,past:true,s:true},{d:3,cur:true,past:true,s:false},{d:4,cur:true,past:true,s:true},{d:5,cur:true,past:true,s:false},
  {d:6,cur:true,past:true,s:true},{d:7,cur:true,past:true,s:true},{d:8,cur:true,past:true,s:false},{d:9,cur:true,past:true,s:true},{d:10,cur:true,past:true,s:true},{d:11,cur:true,past:true,s:false},{d:12,cur:true,past:true,s:false},
  {d:13,cur:true,past:true,s:true},{d:14,cur:true,past:true,s:true},{d:15,cur:true,past:true,s:true},{d:16,cur:true,past:true,s:false},{d:17,cur:true,past:true,s:true},{d:18,cur:true,past:true,s:false},{d:19,cur:true,past:true,s:true},
  {d:20,cur:true,past:false,s:true},{d:21,cur:true,past:false,s:true},{d:22,cur:true,past:false,s:true},{d:23,cur:true,past:false,s:false},{d:24,cur:true,past:false,s:true},{d:25,cur:true,past:false,s:false},{d:26,cur:true,past:false,s:false},
  {d:27,cur:true,past:false,s:true},{d:28,cur:true,past:false,s:true},{d:29,cur:true,past:false,s:true},{d:30,cur:true,past:false,s:false},
  {d:1,cur:false,past:false,s:false},{d:2,cur:false,past:false,s:false},{d:3,cur:false,past:false,s:false},
];

const DAY_HDRS = ["LU","MA","MI","JU","VI","SA","DO"];
const MORNING = ["8:00 AM","8:15 AM","8:30 AM","8:45 AM","9:00 AM","9:15 AM","9:30 AM","9:45 AM","10:00 AM","10:15 AM","10:30 AM","10:45 AM","11:00 AM","11:15 AM"];
const AFTERNOON = ["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];
const SPECS = [
  { id: 0, label: "Cualquiera", icon: "✨" },
  { id: 1, label: "Marta Pérez",  initials: "M", color: "#8b5cf6" },
  { id: 2, label: "Fátima Ruano", initials: "F", color: "#ec4899" },
];

export function LandingWidgetMockup() {
  const [selDate, setSelDate]   = useState(20);
  const [selSpec, setSelSpec]   = useState(0);
  const [selSlot, setSelSlot]   = useState<string | null>(null);
  const [tardeOpen, setTardeOpen] = useState(false);

  return (
    <div
      className="flex rounded-[18px] overflow-hidden bg-white w-full"
      style={{
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.14), 0 32px 72px rgba(0,0,0,0.26), 0 64px 120px rgba(139,92,246,0.12)",
      }}
    >
      {/* ── Sidebar ── */}
      <div className="w-[175px] flex-shrink-0 bg-[#f8f8fb] border-r border-[#e4e4e7] p-5 flex flex-col">
        <div className="text-[18px] font-black text-[#0d0d0b] tracking-[-0.5px] mb-1">Studio Noa</div>
        <div className="text-[11px] text-[#71717a] leading-[1.5] mb-[18px]">
          Reserva tu cita al instante. Solo completamos los detalles clave.
        </div>

        <div className="text-[10px] font-bold text-[#71717a] tracking-[0.5px] uppercase mb-2.5">Tu cita:</div>
        <div className="flex items-start gap-1.5 mb-2">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" className="text-purple-600 flex-shrink-0 mt-px">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
          </svg>
          <div className="text-[11.5px] text-[#0d0d0b] font-medium leading-[1.4]">Sucursal: Sucursal La Skina</div>
        </div>

        <div className="text-[10px] font-bold text-[#71717a] tracking-[0.5px] uppercase mt-2.5 mb-1">Servicios seleccionados</div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11.5px] text-[#0d0d0b]">✓ Manicura</span>
          <span className="text-[10.5px] text-[#71717a]">45 min</span>
        </div>

        <div className="h-px bg-[#e4e4e7] my-3.5" />

        <div className="bg-white border-[1.5px] border-[#e4e4e7] rounded-[9px] p-[10px_12px]">
          <div className="text-[10px] font-bold text-purple-600 tracking-[0.3px] mb-1.5">Resumen</div>
          <div className="flex items-baseline justify-between">
            <span className="text-[20px] font-black text-[#0d0d0b] tracking-[-0.5px]">$25.00</span>
            <span className="text-[10.5px] text-[#71717a]">45 min</span>
          </div>
          <div className="text-[10.5px] text-[#71717a] mt-0.5">1 servicio seleccionado</div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 p-[18px_16px] flex flex-col gap-3 min-w-0 overflow-hidden">
        {/* Step header */}
        <div className="flex items-center gap-2">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" className="text-[#71717a] flex-shrink-0">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="text-[15px] font-bold text-[#0d0d0b] tracking-[-0.3px]">Paso 3: Especialista y fecha</div>
        </div>

        {/* Agendando banner */}
        <div className="bg-[#f3f0ff] border border-[#ddd6fe] rounded-lg px-3 py-[7px] flex items-center gap-2">
          <span className="text-[10.5px] font-bold text-[#71717a] tracking-[0.5px] uppercase">Agendando:</span>
          <span className="text-[12px] font-bold text-purple-600">Manicura</span>
        </div>

        {/* Specialists */}
        <div className="flex gap-1.5 flex-wrap">
          {SPECS.map(sp => (
            <div
              key={sp.id}
              onClick={() => setSelSpec(sp.id)}
              className={`flex items-center gap-[5px] px-[11px] py-[5px] rounded-full text-[11.5px] font-medium cursor-pointer border-[1.5px] transition-all duration-150 select-none
                ${selSpec === sp.id
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-[#e4e4e7] text-[#0d0d0b] bg-white hover:border-purple-500 hover:text-purple-600"
                }`}
            >
              {sp.initials ? (
                <div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: selSpec === sp.id ? "rgba(255,255,255,0.25)" : sp.color }}
                >
                  {sp.initials}
                </div>
              ) : (
                <span className="text-[12px]">{sp.icon}</span>
              )}
              {sp.label}
            </div>
          ))}
        </div>

        {/* Calendar + Slots */}
        <div className="flex gap-3 min-w-0 flex-1">
          {/* Calendar */}
          <div className="flex-shrink-0 w-[195px]">
            <div className="text-[9.5px] font-bold text-[#71717a] uppercase tracking-[0.6px] mb-1.5">Días disponibles</div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[13px] font-bold text-[#0d0d0b]">Abril 2026</div>
              <div className="flex gap-0.5">
                {["M15 18l-6-6 6-6","M9 6l6 6-6 6"].map((d, i) => (
                  <button key={i} className="w-[22px] h-[22px] rounded-[5px] bg-[#f4f4f5] border-none flex items-center justify-center text-[#71717a] cursor-pointer hover:bg-purple-600 hover:text-white transition-colors">
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                      <path d={d} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 text-center mb-1">
              {DAY_HDRS.map(h => (
                <div key={h} className="text-[9px] font-bold text-[#71717a] py-0.5">{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {CAL_CELLS.map((c, i) => {
                const isSel = c.cur && !c.past && c.d === selDate;
                return (
                  <div
                    key={i}
                    onClick={() => { if (c.cur && !c.past) setSelDate(c.d); }}
                    className={`aspect-square flex flex-col items-center justify-center rounded-[6px] text-[11px] font-medium relative transition-all duration-100
                      ${!c.cur || c.past
                        ? "text-[#d4d4d8] cursor-default"
                        : isSel
                          ? "bg-purple-600 text-white cursor-pointer"
                          : "text-[#0d0d0b] cursor-pointer hover:bg-[#f3f0ff] hover:text-purple-600"
                      }`}
                  >
                    {c.d}
                    {c.cur && !c.past && c.s && (
                      <div className={`absolute bottom-0.5 w-[3px] h-[3px] rounded-full ${isSel ? "bg-white/70" : "bg-purple-500 opacity-60"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-[5px] text-[9.5px] font-bold text-[#71717a] uppercase tracking-[0.6px] mb-2">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Horarios disponibles
            </div>

            {/* Mañana */}
            <div className="mb-2.5">
              <div className="flex items-center gap-1.5 py-[5px] mb-[7px]">
                <span className="text-[13px]">🌅</span>
                <span className="text-[11.5px] font-bold text-[#0d0d0b] flex-1 tracking-[0.2px]">MAÑANA</span>
                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">14 libres</span>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" className="text-[#71717a] rotate-180">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MORNING.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => setSelSlot(selSlot === t ? null : t)}
                    className={`py-[6px] rounded-[7px] text-center text-[11px] font-medium cursor-pointer border-[1.5px] whitespace-nowrap transition-all duration-100 select-none
                      ${selSlot === t
                        ? "bg-purple-600 border-purple-600 text-white shadow-[0_2px_6px_rgba(139,92,246,0.3)] -translate-y-px"
                        : "border-[#e4e4e7] text-[#0d0d0b] bg-white hover:border-purple-500 hover:text-purple-600 hover:bg-[#f3f0ff] hover:-translate-y-px"
                      }`}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Tarde */}
            <div>
              <div
                className="flex items-center gap-1.5 py-[5px] cursor-pointer"
                onClick={() => setTardeOpen(!tardeOpen)}
              >
                <span className="text-[13px]">☀️</span>
                <span className="text-[11.5px] font-bold text-[#0d0d0b] flex-1 tracking-[0.2px]">TARDE</span>
                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">14 libres</span>
                <svg
                  width="10" height="10" fill="none" viewBox="0 0 24 24"
                  className={`text-[#71717a] transition-transform duration-200 ${tardeOpen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </div>
              {tardeOpen && (
                <div className="grid grid-cols-3 gap-1 mt-[7px]">
                  {AFTERNOON.map((t, i) => (
                    <div
                      key={i}
                      onClick={() => setSelSlot(selSlot === t ? null : t)}
                      className={`py-[6px] rounded-[7px] text-center text-[11px] font-medium cursor-pointer border-[1.5px] whitespace-nowrap transition-all duration-100 select-none
                        ${selSlot === t
                          ? "bg-purple-600 border-purple-600 text-white shadow-[0_2px_6px_rgba(139,92,246,0.3)] -translate-y-px"
                          : "border-[#e4e4e7] text-[#0d0d0b] bg-white hover:border-purple-500 hover:text-purple-600 hover:bg-[#f3f0ff] hover:-translate-y-px"
                        }`}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-1.5 border-t border-[#e4e4e7]">
          <button className="flex-1 text-[12px] font-semibold text-[#0d0d0b] bg-white border-[1.5px] border-[#e4e4e7] rounded-lg py-[9px] cursor-pointer hover:bg-[#f4f4f5] hover:border-[#71717a] transition-colors">
            ← Volver
          </button>
          <button
            disabled={!selSlot}
            className={`flex-[1.6] text-[12px] font-bold rounded-lg py-[9px] flex items-center justify-center gap-[5px] transition-all duration-150
              ${selSlot
                ? "bg-purple-600 text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:bg-purple-700 hover:-translate-y-px cursor-pointer"
                : "bg-[#ddd6fe] text-[#a78bfa] cursor-not-allowed"
              }`}
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
