"use client";

import { useState } from "react";
import { Calendar, Clock, ChevronRight, Check, X, ArrowLeft, User, MapPin, Truck, Mail, Phone, UserCircle } from "lucide-react";

type Branch = { id: string; name: string };
type Service = { id: string; name: string; durationMinutes: number; price: string; includes: string[]; excludes: string[] };
type Staff = { id: string; name: string };

const AVAILABLE_TIMES = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
  "01:00 PM", "01:30 PM", "02:00 PM", "04:30 PM"
];

export default function BookingWidget({ branches, services, staff, tenantName }: { branches: Branch[], services: Service[], staff: Staff[], tenantName: string }) {
  const [step, setStep] = useState(1);
  
  // States del Flujo Completo
  const [modality, setModality] = useState<'local' | 'domicilio' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Guest Data States
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isFormValid = guestName.trim() !== "" && emailRegex.test(guestEmail) && guestPhone.length >= 8;

  // Handlers
  const handleSelectModality = (mod: 'local' | 'domicilio', branch: Branch | null = null) => {
    setModality(mod);
    setSelectedBranch(branch);
    setStep(2); // Pasar a Servicios
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setStep(3); // Pasar a Fechas/Staff
  };

  const handleSelectStaff = (member: Staff | null) => {
    setSelectedStaff(member);
    setSelectedTime(null);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmTimes = () => {
    setStep(4); // Pasar a Formulario de Guest
  };

  const handleFinalCheckout = () => {
    setStep(5); // Success o WPP
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-24 relative overflow-hidden bg-black/95">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>

      <div className="z-10 w-full max-w-6xl flex flex-col md:flex-row gap-8 items-start justify-center">
        
        {/* Left Side: Business Info / Contextual Selection */}
        <div className="flex-1 space-y-6 pt-12 md:sticky top-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
              {tenantName}
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Reserva tu cita al instante. Solo completemos los detalles clave.
            </p>
          </div>
          
          {(modality || selectedService) && (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 space-y-4 border-l-4 border-l-purple-500 border border-white/10 transition-all duration-300 shadow-xl">
              <h3 className="text-zinc-100 font-medium tracking-wide text-sm uppercase">Tu Cita:</h3>
              
              {modality && (
                <div className="flex items-center gap-3 text-zinc-300">
                  {modality === 'domicilio' ? <Truck className="w-5 h-5 text-purple-400" /> : <MapPin className="w-5 h-5 text-purple-400" />}
                  <span className="font-medium">
                    {modality === 'domicilio' ? 'A Domicilio' : `Sucursal: ${selectedBranch?.name}`}
                  </span>
                </div>
              )}

              {selectedService && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">{selectedService.name} ({selectedService.durationMinutes} min)</span>
                </div>
              )}
              
              {selectedStaff && (
                <div className="flex items-center gap-3 text-zinc-300 animate-in fade-in slide-in-from-left-2 duration-300">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium">Con {selectedStaff.name}</span>
                </div>
              )}

              {selectedTime && (
                <div className="flex items-center gap-3 text-zinc-300 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span className="font-medium">18 Mar 2026 - {selectedTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Booking Widget */}
        <div className="flex-[1.4] w-full bg-white/5 backdrop-blur-xl border border-white/10 p-5 sm:p-8 shadow-2xl relative min-h-[550px] flex flex-col rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
          
          {/* STEP 1: Branch & Modality */}
          {step === 1 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">
                Paso 1: ¿Dónde te atenderemos?
              </h2>
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">Visita una Sucursal</p>
                {branches.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => handleSelectModality('local', b)}
                    className="w-full p-5 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/40 rounded-xl flex items-center gap-4 transition-all duration-300 group shadow-lg text-left"
                  >
                    <div className="bg-purple-500/20 p-3 rounded-full text-purple-400"><MapPin /></div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-purple-400">{b.name}</h3>
                      <p className="text-zinc-500 text-sm">Reserva inmediata en nuestras instalaciones</p>
                    </div>
                  </button>
                ))}

                <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mt-8 mb-2">O vamos a ti</p>
                <button 
                  onClick={() => handleSelectModality('domicilio')}
                  className="w-full p-5 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 rounded-xl flex items-center gap-4 transition-all duration-300 group shadow-lg text-left relative overflow-hidden"
                >
                  <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-400"><Truck /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400">Servicio a Domicilio</h3>
                    <p className="text-zinc-500 text-sm">Termina de agendar vía WhatsApp (Requiere 7 días de anticipación)</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Service */}
          {step === 2 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(1)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Paso 2: Elige tu Servicio
                </h2>
              </div>
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {services.map((srv) => (
                  <button 
                    key={srv.id} 
                    onClick={() => handleSelectService(srv)}
                    className="w-full p-5 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/40 rounded-xl text-left transition-all duration-300 group shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{srv.name}</h3>
                      <span className="text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full text-sm inline-block self-start sm:self-auto">${srv.price}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400 mb-5">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-zinc-500" /> {srv.durationMinutes} min</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-sm border-t border-white/5 pt-4">
                      <div>
                        <p className="text-zinc-200 font-semibold mb-2 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400"/> Incluye:</p>
                        <ul className="space-y-2">
                          {srv.includes?.map((inc, i) => (
                            <li key={i} className="flex items-start gap-2 text-zinc-400 leading-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mt-1.5 shrink-0"></span>
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-zinc-200 font-semibold mb-2 flex items-center gap-2"><X className="w-4 h-4 text-rose-400"/> No incluye:</p>
                        <ul className="space-y-2">
                          {srv.excludes?.map((exc, i) => (
                            <li key={i} className="flex items-start gap-2 text-zinc-500 leading-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-1.5 shrink-0"></span>
                              {exc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Select Date & Time (and STAFF) */}
          {step === 3 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500 text-white">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => { setStep(2); setSelectedTime(null); setSelectedStaff(null); }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  Paso 3: Especialista y Fecha
                </h2>
              </div>
              
              {/* STAFF SELECTION */}
              {modality !== 'domicilio' && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">¿Con quién te atiendes?</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    <div 
                      onClick={() => handleSelectStaff(null)}
                      className={`min-w-[100px] flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedStaff === null 
                          ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">✨</div>
                      <p className="text-xs font-medium text-center leading-tight">Cualquiera<br/>Libre</p>
                    </div>
                    
                    {staff.map((member) => (
                      <div 
                        key={member.id}
                        onClick={() => handleSelectStaff(member)}
                        className={`min-w-[100px] flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                          selectedStaff?.id === member.id 
                            ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mb-2 border border-blue-500/30">
                          {member.name.charAt(0)}
                        </div>
                        <p className="text-xs font-medium text-center py-1">{member.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DATE SELECTION (MOCK) */}
              <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                <p className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
                  {modality === 'domicilio' ? "Fechas (+7 días anticipación)" : "Días disponibles"}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <div className="min-w-[80px] bg-purple-500/20 border-2 border-purple-500 text-center py-3 rounded-xl text-purple-400 font-bold cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <p className="text-xs uppercase opacity-80 mb-1">{modality === 'domicilio' ? 'Mié' : 'Hoy'}</p>
                    <p className="text-2xl">{modality === 'domicilio' ? '25' : '18'}</p>
                  </div>
                </div>
              </div>

              {/* TIME SELECTION */}
              <p className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">Horarios</p>
              <div className="grid grid-cols-2 gap-3 mb-8 overflow-y-auto flex-1 pr-2">
                {AVAILABLE_TIMES.map((time) => (
                  <button 
                    key={time}
                    onClick={() => handleSelectTime(time)}
                    className={`group relative px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center justify-between overflow-hidden border ${
                      selectedTime === time 
                        ? "bg-purple-600 text-white border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
                        : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold tracking-wide text-sm">{time}</span>
                    <ChevronRight className={`w-4 h-4 transition-all duration-300 ${selectedTime === time ? "opacity-100 translate-x-0 text-white" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-zinc-500"}`} />
                  </button>
                ))}
              </div>

              <button 
                onClick={handleConfirmTimes}
                disabled={!selectedTime}
                className="w-full mt-auto py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:shadow-none hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300 border border-purple-500/50"
              >
                IR A MIS DATOS
              </button>
            </div>
          )}

          {/* STEP 4: Guest Form */}
          {step === 4 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500 text-white">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(3)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  Paso 4: Tus Datos
                </h2>
              </div>
              
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nombre Completo</label>
                  <div className="relative">
                    <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ej. Ana Gómez" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="tu@correo.com" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Teléfono * (Solo números)</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value.replace(/\D/g, ''))} placeholder="12345678" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <p className="text-xs text-zinc-500 text-center mb-4">No necesitas crear cuenta. Solo requerimos estos datos de contacto obligatorios.</p>
                <button 
                  onClick={handleFinalCheckout}
                  disabled={!isFormValid}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all duration-300 border border-emerald-500/50"
               >
                  {modality === 'domicilio' ? 'CONFIRMAR POR WHATSAPP' : 'FINALIZAR RESERVA'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Screen */}
          {step === 5 && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in-95 duration-700">
               <div className={`w-24 h-24 ${modality === 'domicilio' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] text-purple-400'} border rounded-full flex items-center justify-center mb-8`}>
                 {modality === 'domicilio' ? <Phone className="w-10 h-10" /> : <Check className="w-12 h-12" />}
               </div>
               
               <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-4">
                 {modality === 'domicilio' ? '¡Redirigiendo!' : '¡Reserva Exitosa!'}
               </h2>
               
               <div className="space-y-4 text-zinc-300 mb-8 max-w-sm">
                 <p>
                   {modality === 'domicilio' 
                     ? `Tu solicitud de ${selectedService?.name} a domicilio está en camino de ser confirmada. Serás redirigido a conversar con ${tenantName}.`
                     : `Hola ${guestName.split(' ')[0]}, tu cita presencial en ${selectedBranch?.name} para ${selectedService?.name} está confirmada.`
                   }
                 </p>
                 <div className="bg-black/30 w-full p-4 rounded-xl border border-white/5 mt-4">
                    <p className="text-purple-400 font-bold text-lg mb-1">{modality === 'domicilio' ? 'Fecha Tentativa: 25 Mar 2026' : '18 de Marzo, 2026'}</p>
                    <p className="text-white text-xl">{selectedTime}</p>
                 </div>
               </div>
               
               <button 
                onClick={() => { setStep(1); setSelectedTime(null); setSelectedService(null); setSelectedStaff(null); setModality(null); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
              >
                Volver al inicio
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
