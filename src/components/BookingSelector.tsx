// src/components/BookingSelector.tsx
'use client';

import { useState } from 'react';

type Service = { id: string; name: string; durationMinutes: number; price: string };
type Staff = { id: string; name: string };

export default function BookingSelector({ services, staff }: { services: Service[], staff: Staff[] }) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  // Encontrar detalle del servicio para el resumen
  const serviceDetail = services.find(s => s.id === selectedService);

  return (
    <div className="space-y-10 mt-8">
      {/* 1. Selector de Servicios */}
      <section>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4 flex items-center gap-2">
          <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          Elige el servicio
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => { setSelectedService(svc.id); setSelectedStaff(null); }}
              className={`p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer outline-none focus:outline-none ${
                selectedService === svc.id 
                  ? 'bg-indigo-50 border-2 border-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.15)] ring-0' 
                  : 'bg-white border-2 border-slate-100 hover:border-indigo-200 hover:shadow-md'
              }`}
            >
              <div className="font-semibold text-slate-900 text-lg">{svc.name}</div>
              <div className="flex items-center gap-3 mt-2 text-slate-500 font-medium text-sm">
                <span className="flex items-center gap-1">⏱ {svc.durationMinutes} min</span>
                <span>•</span>
                <span className="flex items-center gap-1">💵 ${svc.price}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Selector de Staff (Solo aparece tras elegir servicio) */}
      {selectedService && (
        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
            ¿Con quién quieres atenderte?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedStaff('any')}
              className={`p-4 border-2 rounded-2xl flex items-center gap-4 transition-all duration-200 ${
                selectedStaff === 'any' ? 'border-indigo-600 bg-indigo-50 shadow-[0_0_15px_rgba(79,70,229,0.15)]' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md'
              }`}
            >
              <div className="h-12 w-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-2xl">✨</div>
              <div className="font-semibold text-slate-800 text-left">Cualquiera<br/><span className="text-xs text-slate-500 font-normal">Máxima disponibilidad</span></div>
            </button>
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedStaff(member.id)}
                className={`p-4 border-2 rounded-2xl flex items-center gap-4 transition-all duration-200 ${
                  selectedStaff === member.id ? 'border-indigo-600 bg-indigo-50 shadow-[0_0_15px_rgba(79,70,229,0.15)]' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className="h-12 w-12 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                  {member.name.charAt(0)}
                </div>
                <div className="font-semibold text-slate-800">{member.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Botón Flotante/Confirmación */}
      {selectedService && selectedStaff && (
         <div className="pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <p className="text-slate-400 text-sm font-medium">Resumen de selección:</p>
                    <p className="font-bold text-lg">{serviceDetail?.name}</p>
                </div>
                <button className="w-full sm:w-auto px-8 py-4 bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-400 focus:ring-4 focus:ring-indigo-500/30 transition-all active:scale-95 whitespace-nowrap">
                  Buscar Horarios →
                </button>
            </div>
         </div>
      )}
    </div>
  );
}
