"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { getAvailableSlots, createBookingAction } from "@/app/actions/booking";
import { Calendar, Clock, ChevronRight, Check, X, ArrowLeft, User, MapPin, Truck, Mail, Phone, UserCircle, Loader2 } from "lucide-react";

type Branch = { id: string; name: string };
type Service = { id: string; name: string; durationMinutes: number; price: string; includes: string[]; excludes: string[] };
type Staff = { id: string; name: string };

const COUNTRIES = [
  { code: 'SV', name: 'El Salvador', prefix: '+503', flag: '🇸🇻' },
  { code: 'US', name: 'USA', prefix: '+1', flag: '🇺🇸' },
  { code: 'GT', name: 'Guatemala', prefix: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', prefix: '+504', flag: '🇭🇳' },
  { code: 'CR', name: 'Costa Rica', prefix: '+506', flag: '🇨🇷' },
  { code: 'MX', name: 'México', prefix: '+52', flag: '🇲🇽' },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
];

const AVAILABLE_TIMES = [
  { time: "10:00 AM", available: true },
  { time: "10:30 AM", available: true },
  { time: "11:00 AM", available: false },
  { time: "11:30 AM", available: true },
  { time: "01:00 PM", available: false },
  { time: "01:30 PM", available: true },
  { time: "02:00 PM", available: true },
  { time: "04:30 PM", available: true }
];

export default function BookingWidget({ 
  branches, 
  services, 
  staff, 
  tenantName, 
  tenantId, 
  tenantLogo,
  whatsappNumber,
  homeServiceTerms,
  homeServiceTermsEnabled,
  waMessageTemplate
}: { 
  branches: Branch[], 
  services: Service[], 
  staff: Staff[], 
  tenantName: string, 
  tenantId: string,
  tenantLogo?: string,
  whatsappNumber?: string,
  homeServiceTerms?: string,
  homeServiceTermsEnabled?: boolean,
  waMessageTemplate?: string | null
}) {
  const t = useTranslations('BookingWidget');
  const [step, setStep] = useState(1);
  
  // States del Flujo Completo
  const [modality, setModality] = useState<'local' | 'domicilio' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Real-time Availability States
  const [availableTimes, setAvailableTimes] = useState<{time: string, available: boolean}[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  // Guest Data States
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryList, setShowCountryList] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Auto-detect country roughly by timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Salvador')) setSelectedCountry(COUNTRIES.find(c => c.code === 'SV') || COUNTRIES[0]);
    else if (tz.includes('America/New_York') || tz.includes('America/Los_Angeles') || tz.includes('America/Chicago')) setSelectedCountry(COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0]);
    else if (tz.includes('Mexico')) setSelectedCountry(COUNTRIES.find(c => c.code === 'MX') || COUNTRIES[0]);
    else if (tz.includes('Europe/Madrid')) setSelectedCountry(COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0]);
  }, []);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Botón habilitado cuando: nombre + email + teléfono válidos
  // Y si es domicilio Y los términos están activados: también debe aceptarlos
  const totalPrice = selectedServices.reduce((acc, s) => acc + parseFloat(s.price), 0);
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);

  const isFormValid =
    guestName.trim() !== '' &&
    emailRegex.test(guestEmail) &&
    guestPhone.length >= 7 &&
    (modality !== 'domicilio' || !homeServiceTermsEnabled || agreedToTerms);

  // Cargar horarios reales cuando cambien los filtros
  useEffect(() => {
    if (step === 3 && selectedDate && selectedServices.length > 0) {
      const fetchTimes = async () => {
        setIsLoadingTimes(true);
        try {
          const times = await getAvailableSlots(
            selectedDate, 
            selectedServices[0]?.id || '', 
            selectedBranch?.id || branches[0]?.id || '', 
            selectedStaff?.id,
            totalDuration
          );
          console.log("Found slots:", times.length, "for date:", selectedDate);
          setAvailableTimes(times);
          // Si el horario previamente seleccionado ya no está disponible, limpiarlo
          if (selectedTime && !times.find(t => t.time === selectedTime && t.available)) {
            setSelectedTime(null);
          }
        } catch (error) {
          console.error("Failed to fetch slots:", error);
        } finally {
          setIsLoadingTimes(false);
        }
      };
      fetchTimes();
    }
  }, [step, selectedDate, selectedServices, selectedStaff, selectedBranch, selectedTime]);

  // Handlers
  const handleSelectModality = (mod: 'local' | 'domicilio', branch: Branch | null = null) => {
    setModality(mod);
    setSelectedBranch(branch);
    setStep(2); // Pasar a Servicios
  };

  const handleToggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const handleSelectStaff = (member: Staff | null) => {
    setSelectedStaff(member);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmTimes = () => {
    setStep(4); // Pasar a Formulario de Guest
  };

  const handleFinalCheckout = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) return;

    // 1. Calcular tiempos de inicio y fin (UTC para consistencia en DB)
    const militaryTime = formatTimeToMilitary(selectedTime);
    const startDateTime = new Date(`${selectedDate}T${militaryTime}Z`);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

    // 2. Persistir en Base de Datos
    const result = await createBookingAction({
      tenantId: tenantId, 
      branchId: selectedBranch?.id || branches[0]?.id || '',
      serviceId: selectedServices[0].id, // Usamos el ID del primero como referencia técnica
      staffId: selectedStaff?.id || staff[0]?.id || '',
      customerName: guestName,
      customerEmail: guestEmail,
      startTime: startDateTime,
      endTime: endDateTime
    });

    if (result.success) {
      if (modality === 'domicilio') {
        // Usar el número WA configurado por el negocio (o fallback genérico)
        const waNumber = whatsappNumber || '50370000000';
        
        let message = waMessageTemplate;
        if (!message) {
          // Fallback default message (sin rombos ◆)
          message = "¡Hola! Me gustaría confirmar mi cita para *{servicio}*.\n\n" +
                    "📅 *Fecha:* {fecha}\n" +
                    "⏰ *Hora:* {hora}\n" +
                    "📍 *Modalidad:* Servicio a Domicilio\n" +
                    "👤 *Cliente:* {cliente}\n" +
                    "📞 *Teléfono:* {telefono}";
        }

        // Reemplazar variables
        const serviceNames = selectedServices.map(s => s.name).join(", ");
        const formattedMsg = message
          .replace(/{servicio}/g, serviceNames)
          .replace(/{fecha}/g, selectedDate)
          .replace(/{hora}/g, selectedTime)
          .replace(/{cliente}/g, guestName)
          .replace(/{telefono}/g, `${selectedCountry.prefix} ${guestPhone}`);

        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(formattedMsg)}`, '_blank');
      }
      setStep(5);
    } else {
      alert("Error al crear la reserva");
    }
  };

  // Helper para convertir "10:30 AM" a "10:30:00"
  const formatTimeToMilitary = (time12h: string) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  };

  // Generate dates dynamically based on modality
  const today = new Date();
  const nextDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    // Para domicilio, requerimos 7 días de anticipación
    d.setDate(today.getDate() + i + (modality === 'domicilio' ? 7 : 0)); 
    return {
      date: d,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: d.getDate(),
      fullDate: d.toISOString().split('T')[0]
    };
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-start md:justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative overflow-x-hidden bg-slate-50 dark:bg-black/95">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>

      <div className="z-10 w-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        
        {/* Left Side: Business Info / Contextual Selection */}
        <div className="w-full lg:flex-1 space-y-6 pt-8 lg:pt-12 lg:sticky top-12">
          <div className="space-y-4 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              {tenantLogo ? (
                <div className="flex items-center gap-4">
                  <img src={tenantLogo} alt={tenantName} className="h-16 w-auto object-contain" />
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {tenantName}
                  </h1>
                </div>
              ) : (
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/50 break-words leading-tight">
                  {tenantName}
                </h1>
              )}
              <div className="flex gap-2 self-start sm:self-auto bg-white/5 dark:bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-slate-200 dark:border-white/10">
                <ThemeToggle />
                <LangToggle />
              </div>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-lg leading-relaxed max-w-xl">
              {t("hero_subtitle")}
            </p>
          </div>
          
          {(modality || selectedServices.length > 0) && (
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-6 space-y-4 border-l-4 border-l-purple-500 border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-xl">
              <h3 className="text-zinc-100 font-medium tracking-wide text-sm uppercase">{t("your_appointment")}</h3>
              
              {modality && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-300">
                  {modality === 'domicilio' ? <Truck className="w-5 h-5 text-purple-400" /> : <MapPin className="w-5 h-5 text-purple-400" />}
                  <span className="font-medium">
                    {modality === 'domicilio' ? t("home_address") : t("branch_address", { branch: selectedBranch?.name || '' })}
                  </span>
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-300">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-sm uppercase tracking-wider">{t("selected_services")}:</span>
                  </div>
                  <div className="pl-8 space-y-1">
                    {selectedServices.map(s => (
                      <p key={s.id} className="text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-500" /> {s.name}
                      </p>
                    ))}
                    <p className="text-xs font-bold text-purple-400 mt-2">
                      Total: {totalDuration} min · ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedStaff && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-300 animate-in fade-in slide-in-from-left-2 duration-300">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium">{t("with_staff", { staff: selectedStaff.name })}</span>
                </div>
              )}

              {(selectedDate || selectedTime) && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-300 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span className="font-medium">
                    {selectedDate ? selectedDate : t("date_tbd")} 
                    {selectedTime ? ` - ${selectedTime}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Booking Widget */}
        <div className="flex-[1.5] w-full bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 sm:p-8 shadow-2xl relative min-h-[500px] flex flex-col rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
          
          {/* STEP 1: Branch & Modality */}
          {step === 1 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
                {t("title_branch")}
              </h2>
              <div className="space-y-4">
                <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">{t("visit_branch")}</p>
                {branches.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => handleSelectModality('local', b)}
                    className="w-full p-5 bg-white dark:bg-white/5 hover:bg-purple-500/10 border border-slate-200 dark:border-white/10 hover:border-purple-500/40 rounded-xl flex items-center gap-4 transition-all duration-300 group shadow-lg text-left"
                  >
                    <div className="bg-purple-500/20 p-3 rounded-full text-purple-400"><MapPin /></div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-400">{b.name}</h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("visit_branch_desc")}</p>
                    </div>
                  </button>
                ))}

                <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold uppercase tracking-wider mt-8 mb-2">{t("or_home")}</p>
                <button 
                  onClick={() => handleSelectModality('domicilio')}
                  className="w-full p-5 bg-white dark:bg-white/5 hover:bg-emerald-500/10 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 rounded-xl flex items-center gap-4 transition-all duration-300 group shadow-lg text-left relative overflow-hidden"
                >
                  <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-400"><Truck /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-400">{t("home_service")}</h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("home_service_desc")}</p>
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
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("title_service")}
                </h2>
              </div>
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {services.map((srv) => {
                  const isSelected = selectedServices.some(s => s.id === srv.id);
                  return (
                    <button 
                      key={srv.id} 
                      onClick={() => handleToggleService(srv)}
                      className={`w-full p-5 bg-white dark:bg-white/5 border rounded-xl text-left transition-all duration-300 group shadow-lg flex flex-col ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                          : 'border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          {isSelected && <div className="p-1 bg-purple-500 rounded-full"><Check className="w-3 h-3 text-white" /></div>}
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors uppercase tracking-tight">{srv.name}</h3>
                        </div>
                        <span className="text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full text-sm inline-block self-start sm:self-auto">${srv.price}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-zinc-400 mb-5">
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500" /> {srv.durationMinutes} min</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-sm border-t border-slate-200 dark:border-white/5 pt-4">
                        <div>
                          <p className="text-zinc-200 font-semibold mb-2 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"><Check className="w-4 h-4 text-emerald-400"/> {t("includes")}</p>
                          <ul className="space-y-2">
                            {srv.includes?.map((inc, i) => (
                              <li key={i} className="flex items-start gap-2 text-slate-500 dark:text-zinc-400 leading-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mt-1.5 shrink-0"></span>
                                {inc}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-zinc-200 font-semibold mb-2 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"><X className="w-4 h-4 text-rose-400"/> {t("excludes")}</p>
                          <ul className="space-y-2">
                            {srv.excludes?.map((exc, i) => (
                              <li key={i} className="flex items-start gap-2 text-slate-400 dark:text-zinc-500 leading-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-1.5 shrink-0"></span>
                                {exc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Summary Bar at bottom of services list */}
              {selectedServices.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5 animate-in slide-in-from-bottom-4 duration-300">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("resume")}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'} · {totalDuration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-black text-purple-400">${totalPrice.toFixed(2)}</p>
                        <button 
                          onClick={() => setStep(3)}
                          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                        >
                          {t("continue")} →
                        </button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Select Date & Time (and STAFF) */}
          {step === 3 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => { setStep(2); setSelectedTime(null); setSelectedStaff(null); }}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  {t("title_specialist")}
                </h2>
              </div>
              
              {/* STAFF SELECTION */}
              <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">{t("who_attends")}</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    <div 
                      onClick={() => handleSelectStaff(null)}
                      className={`min-w-[100px] flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedStaff === null 
                          ? 'bg-purple-500/20 border-purple-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-white/10 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">✨</div>
                      <p className="text-xs font-medium text-center leading-tight">{t("anyone")}<br/>{t("anyone_desc")}</p>
                    </div>
                    
                    {staff.map((member) => (
                      <div 
                        key={member.id}
                        onClick={() => handleSelectStaff(member)}
                        className={`min-w-[100px] flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-300 ${
                          selectedStaff?.id === member.id 
                            ? 'bg-blue-500/20 border-blue-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-white/10 hover:text-slate-900 dark:text-white'
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

              {/* DATE SELECTION (MOCK) */}
              <div className="mb-6 bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">
                  {modality === 'domicilio' ? t("dates_home") : t("dates")}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {nextDays.map((day) => (
                    <div 
                      key={day.fullDate}
                      onClick={() => setSelectedDate(day.fullDate)}
                      className={`min-w-[80px] border-2 text-center py-3 rounded-xl font-bold cursor-pointer transition-all duration-300 ${
                        selectedDate === day.fullDate
                          ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-white/10 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      <p className="text-xs uppercase opacity-80 mb-1">{day.dayName}</p>
                      <p className="text-2xl">{day.dayNum}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIME SELECTION */}
              <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">{t("times")}</p>
              <div className="grid grid-cols-2 gap-3 mb-8 overflow-y-auto flex-1 pr-2 min-h-[200px] relative">
                {isLoadingTimes ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/20 backdrop-blur-[2px] z-20 rounded-xl">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
                    <Clock className="w-12 h-12 mb-2 opacity-20" />
                    <p>{t("no_slots_available")}</p>
                  </div>
                ) : availableTimes.map(({time, available}) => (
                  <button 
                    key={time}
                    onClick={() => available && handleSelectTime(time)}
                    disabled={!available}
                    className={`group relative px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center justify-between overflow-hidden border ${
                      !available
                        ? "bg-slate-100 dark:bg-black/20 text-zinc-600 border-slate-200 dark:border-white/5 cursor-not-allowed opacity-60"
                        : selectedTime === time 
                          ? "bg-purple-600 text-slate-900 dark:text-white border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
                          : "bg-white dark:bg-white/5 hover:bg-white/10 border-slate-200 dark:border-white/10 hover:border-white/20 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <span className={`font-semibold tracking-wide text-sm ${!available ? 'line-through' : ''}`}>{time}</span>
                    {available ? (
                      <ChevronRight className={`w-4 h-4 transition-all duration-300 ${selectedTime === time ? "opacity-100 translate-x-0 text-slate-900 dark:text-white" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400 dark:text-zinc-500"}`} />
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-rose-500/70">{t("occupied")}</span>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleConfirmTimes}
                disabled={!selectedTime || !selectedDate}
                className="w-full mt-auto py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-xl font-bold tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:shadow-none hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300 border border-purple-500/50"
              >
                {t("go_to_data")}
              </button>
            </div>
          )}

          {/* STEP 4: Guest Form */}
          {step === 4 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(3)}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  {t("title_data")}
                </h2>
              </div>
              
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{t("full_name")}</label>
                  <div className="relative">
                    <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ej. Ana Gómez" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{t("email")}</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="tu@correo.com" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{t("phone")}</label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowCountryList(!showCountryList)}
                        className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white hover:bg-white/10 transition-all min-w-[100px] justify-between"
                      >
                        <span className="text-xl">{selectedCountry.flag}</span>
                        <span className="text-sm font-bold">{selectedCountry.prefix}</span>
                      </button>
                      
                      {showCountryList && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {COUNTRIES.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => { setSelectedCountry(c); setShowCountryList(false); }}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{c.flag}</span>
                                  <span className="text-sm text-white font-medium">{c.name}</span>
                                </div>
                                <span className="text-zinc-500 text-xs font-bold">{c.prefix}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value.replace(/\D/g, ''))} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                    </div>
                  </div>
                </div>

                {modality === 'domicilio' && homeServiceTermsEnabled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-sm text-slate-600 dark:text-zinc-300 italic mb-2 whitespace-pre-wrap">
                        {homeServiceTerms || t("home_service_terms_default")}
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 border-2 border-slate-300 dark:border-white/20 rounded-md bg-transparent peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all"></div>
                          <Check className="w-4 h-4 absolute inset-1 text-slate-900 dark:text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-200 group-hover:text-purple-400 transition-colors">
                          {t("i_agree_to_terms")}
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto">

                <button 
                  onClick={handleFinalCheckout}
                  disabled={!isFormValid}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-xl font-bold tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all duration-300 border border-emerald-500/50"
               >
                  {modality === 'domicilio' ? t("confirm_whatsapp") : t("finish_booking")}
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
                 {modality === 'domicilio' ? t("redirecting") : t("success")}
               </h2>
               
               <div className="space-y-4 text-slate-600 dark:text-zinc-300 mb-8 max-w-md">
                 <p>
                    {modality === 'domicilio' 
                      ? t("redirecting_desc", { service: selectedServices.map(s => s.name).join(", "), tenant: tenantName })
                      : t("success_desc", { name: guestName.split(' ')[0], branch: selectedBranch?.name || '', service: selectedServices.map(s => s.name).join(", ") })
                    }
                 </p>
                 <div className="bg-slate-200 dark:bg-black/30 w-full p-4 rounded-xl border border-slate-200 dark:border-white/5 mt-4">
                    <p className="text-purple-400 font-bold text-lg mb-1">{selectedDate || t("date_tbd")}</p>
                    <p className="text-slate-900 dark:text-white text-xl">{selectedTime}</p>
                 </div>
               </div>
               
               <button 
                onClick={() => { setStep(1); setSelectedDate(null); setSelectedTime(null); setSelectedServices([]); setSelectedStaff(null); setModality(null); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}
                className="px-8 py-3 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-medium transition-all"
              >
                {t("back_to_start")}
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
