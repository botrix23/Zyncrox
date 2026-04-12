"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, startOfToday, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { getAvailableSlots, createBookingAction, createBookingSessionAction } from "@/app/actions/booking";
import { Calendar, Clock, ChevronRight, Check, X, ArrowLeft, User, MapPin, Truck, Mail, Phone, UserCircle, Loader2, CheckCircle2, XCircle, Instagram, Facebook, Music, Layers, CalendarRange, Crown, Download, Globe } from "lucide-react";
import { canUseFeature, getPlanFeatures } from "@/core/plans";
import { getGoogleCalendarUrl, getOutlookCalendarUrl, generateICSFile } from "@/lib/calendar";

type Branch = { id: string; name: string; businessHours?: string | null };
type Service = { id: string; name: string; durationMinutes: number; price: string; includes: string[]; excludes: string[]; allowsHomeService?: boolean; branches?: { id: string; branchId: string }[] };
type Staff = { id: string; name: string; allowsHomeService?: boolean };
type CoverageZone = { id: string; name: string; fee: string; description?: string | null };

const COUNTRIES = [
  { code: 'SV', name: 'El Salvador', prefix: '+503', flag: '🇸🇻', minLen: 8, maxLen: 8 },
  { code: 'US', name: 'USA', prefix: '+1', flag: '🇺🇸', minLen: 10, maxLen: 10 },
  { code: 'GT', name: 'Guatemala', prefix: '+502', flag: '🇬🇹', minLen: 8, maxLen: 8 },
  { code: 'HN', name: 'Honduras', prefix: '+504', flag: '🇭🇳', minLen: 8, maxLen: 8 },
  { code: 'CR', name: 'Costa Rica', prefix: '+506', flag: '🇨🇷', minLen: 8, maxLen: 8 },
  { code: 'MX', name: 'México', prefix: '+52', flag: '🇲🇽', minLen: 10, maxLen: 10 },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸', minLen: 9, maxLen: 9 },
];

const AVAILABLE_TIMES = [
  { time: "09:00 AM", available: true },
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: false },
  { time: "12:00 PM", available: true },
  { time: "01:00 PM", available: true },
  { time: "02:00 PM", available: false },
  { time: "03:00 PM", available: true },
  { time: "04:00 PM", available: true },
  { time: "05:00 PM", available: true }
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
  waMessageTemplate,
  bookingSettings,
  primaryColor,
  coverUrl,
  forcedTheme,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  allowsHomeService,
  homeServiceLeadDays,
  coverageZones,
  tenantPlan,
  heroTitle,
  heroSubtitle
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
  waMessageTemplate?: string | null,
  bookingSettings?: {
    step1Title?: string;
    step2Title?: string;
    step3Title?: string;
    step4Title?: string;
    showSummaryOnLeft?: boolean;
  },
  primaryColor?: string;
  coverUrl?: string | null;
  forcedTheme?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  allowsHomeService?: boolean;
  homeServiceLeadDays?: number;
  coverageZones?: CoverageZone[];
  tenantPlan?: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
}) {
  const t = useTranslations('BookingWidget');
  const [step, setStep] = useState(1);
  const currentPlan = tenantPlan || 'FREE';
  
  // States del Flujo Completo
  const [modality, setModality] = useState<'local' | 'domicilio' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<CoverageZone | null>(null);
  
  // Real-time Availability States
  const [availableTimes, setAvailableTimes] = useState<{time: string, available: boolean}[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [errorType, setErrorType] = useState<'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null>(null);

  // Multi-Service Scheduling Strategy
  const [schedulingMode, setSchedulingMode] = useState<'bulk' | 'separate' | null>(null);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [cartBookings, setCartBookings] = useState<{
    service: Service;
    staff: Staff | null;
    date: string | null;
    time: string | null;
  }[]>([]);

  // Plan info (fetched or passed, for now we assume we have it via props or we'll add a dummy for now)
  // TODO: Pass tenant plan from page.tsx to widget. For now default to PRO to allow testing, 
  // but let's add it to props.
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryList, setShowCountryList] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Aviso inline cuando el plan no permite más servicios
  const [planLimitWarning, setPlanLimitWarning] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // --- Lógica de Zonas Horarias Inteligente ---
  const businessTimezone = branches[0]?.tenant?.timezone || 'America/El_Salvador';
  
  const [hasTzDifference, setHasTzDifference] = useState(false);
  const [businessOffsetLabel, setBusinessOffsetLabel] = useState("");

  useEffect(() => {
    try {
      // 1. Obtener offset del negocio
      const bizFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: businessTimezone,
        timeZoneName: 'shortOffset'
      });
      const bizParts = bizFormatter.formatToParts(new Date());
      const bizTzName = bizParts.find(p => p.type === 'timeZoneName')?.value || 'GMT-6';
      
      // 2. Obtener offset del navegador
      const browserFormatter = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'shortOffset'
      });
      const browserParts = browserFormatter.formatToParts(new Date());
      const browserTzName = browserParts.find(p => p.type === 'timeZoneName')?.value || '';

      if (bizTzName !== browserTzName) {
        setHasTzDifference(true);
        setBusinessOffsetLabel(bizTzName);
      }
    } catch (e) {
      console.warn("TZ detection failed", e);
    }
  }, [businessTimezone]);
  // --- FIN Lógica de Zonas Horarias ---

  // Auto-detect country roughly by timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Salvador')) setSelectedCountry(COUNTRIES.find(c => c.code === 'SV') || COUNTRIES[0]);
    else if (tz.includes('America/New_York') || tz.includes('America/Los_Angeles') || tz.includes('America/Chicago')) setSelectedCountry(COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0]);
    else if (tz.includes('Mexico')) setSelectedCountry(COUNTRIES.find(c => c.code === 'MX') || COUNTRIES[0]);
    else if (tz.includes('Europe/Madrid')) setSelectedCountry(COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0]);
  }, []);

  useEffect(() => {
     if (forcedTheme) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(forcedTheme === 'dark' ? 'dark' : 'light');
        document.documentElement.style.colorScheme = forcedTheme === 'dark' ? 'dark' : 'light';
     }
  }, [forcedTheme]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Filtrado Granular basado en Modalidad y Sucursal
  const displayServices = useMemo(() => {
    if (modality === 'domicilio') {
      return services.filter(s => s.allowsHomeService !== false);
    }
    if (modality === 'local' && selectedBranch) {
      return services.filter(s => {
        // Si no hay restricciones de sucursales (relación vacía), es global.
        if (!s.branches || s.branches.length === 0) return true;
        // Si tiene restricciones, el selectedBranch debe estar en la lista.
        return s.branches.some(b => b.branchId === selectedBranch.id);
      });
    }
    return services;
  }, [services, modality, selectedBranch]);

  const displayStaff = useMemo(() => {
    if (modality === 'domicilio') {
      return staff.filter(s => s.allowsHomeService !== false);
    }
    return staff;
  }, [staff, modality]);
  // Botón habilitado cuando: nombre + email + teléfono válidos
  // Y si es domicilio Y los términos están activados: también debe aceptarlos
  const isFormValid =
    guestName.trim() !== '' &&
    emailRegex.test(guestEmail) &&
    guestPhone.length >= (selectedCountry as any).minLen &&
    (modality !== 'domicilio' || (selectedZone !== null && (!homeServiceTermsEnabled || agreedToTerms)));

  // LÓGICA DE PRECIO PRO: Bloques de traslado
  const calculateTransferFees = () => {
    if (modality !== 'domicilio' || !selectedZone || cartBookings.length === 0) return 0;
    
    const zoneFee = parseFloat(selectedZone.fee);
    let transferBlocks = 1;

    // Ordenar citas por tiempo
    const sortedBookings = [...cartBookings].sort((a, b) => {
        const timeA = new Date(`${a.date}T${formatTimeToMilitary(a.time!)}`).getTime();
        const timeB = new Date(`${b.date}T${formatTimeToMilitary(b.time!)}`).getTime();
        return timeA - timeB;
    });

    for (let i = 1; i < sortedBookings.length; i++) {
        const prev = sortedBookings[i-1];
        const curr = sortedBookings[i];
        
        const prevEndTime = new Date(`${prev.date}T${formatTimeToMilitary(prev.time!)}`).getTime() + (prev.service.durationMinutes * 60000);
        const currStartTime = new Date(`${curr.date}T${formatTimeToMilitary(curr.time!)}`).getTime();
        
        // Un traslado extra si:
        // 1. Diferente día
        // 2. Diferente especialista
        // 3. Hay un hueco de tiempo (gap > 0)
        const isDifferentDay = prev.date !== curr.date;
        const isDifferentStaff = prev.staff?.id !== curr.staff?.id;
        const hasGap = currStartTime > prevEndTime;

        if (isDifferentDay || isDifferentStaff || hasGap) {
            transferBlocks++;
        }
    }

    return transferBlocks * zoneFee;
  };

  const transferTotal = calculateTransferFees();
  const servicesTotal = selectedServices.reduce((acc, s) => acc + parseFloat(s.price), 0);
  const totalPrice = servicesTotal + transferTotal;
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);

  useEffect(() => {
    if (step === 3 && (selectedDate || schedulingMode === 'separate') && selectedServices.length > 0) {
      const fetchTimes = async () => {
        setIsLoadingTimes(true);
        setErrorType(null);
        try {
          const serviceToQuery = schedulingMode === 'separate' 
            ? selectedServices[currentServiceIndex] 
            : selectedServices[0];
          
          const durationToQuery = schedulingMode === 'separate'
            ? serviceToQuery.durationMinutes
            : totalDuration;

          const res = await getAvailableSlots(
            selectedDate || '', 
            serviceToQuery?.id || '', 
            selectedBranch?.id || branches[0]?.id || '', 
            selectedStaff?.id,
            durationToQuery,
            modality === 'domicilio'
          );
          
          const slots = res.slots || [];
          setAvailableTimes(slots);
          setErrorType(res.errorType || null);

          // LÓGICA DE AUTO-SELECCIÓN DE PRÓXIMO DÍA DISPONIBLE
          // Si no hay slots disponibles hoy y el usuario llegó a este paso sin una fecha específica o por cambio de staff
          if (slots.filter(s => s.available).length === 0 && selectedDate && schedulingMode === 'bulk') {
             // Buscar el primer día con slots en los próximos 30 días
             const findNextAvailable = async () => {
                for (const day of nextDays) {
                   if (day.fullDate <= (selectedDate || '')) continue;
                   const nextRes = await getAvailableSlots(
                      day.fullDate,
                      serviceToQuery?.id || '',
                      selectedBranch?.id || branches[0]?.id || '',
                      selectedStaff?.id,
                      durationToQuery,
                      modality === 'domicilio'
                   );
                   if (nextRes.slots?.some(s => s.available)) {
                      setSelectedDate(day.fullDate);
                      return;
                   }
                }
             };
             findNextAvailable();
          }
        } catch (error) {
          console.error("Failed to fetch slots:", error);
          setAvailableTimes([]);
          setErrorType(null);
        } finally {
          setIsLoadingTimes(false);
        }
      };
      if (selectedDate) fetchTimes();
      else if (nextDays.length > 0) setSelectedDate(nextDays[0].fullDate); // Auto-select first day on start
    }
  }, [step, selectedDate, selectedServices, selectedStaff, selectedBranch, branches, totalDuration, schedulingMode, currentServiceIndex]);

  // Handlers
  const handleSelectModality = (mod: 'local' | 'domicilio', branch: Branch | null = null) => {
    setModality(mod);
    setSelectedBranch(branch);
    
    if (mod === 'domicilio') {
      setStep(1.1); // Pasar a Selección de Zona
    } else {
      setStep(2); // Pasar a Servicios
    }
  };

  const handleSelectZone = (zone: CoverageZone) => {
    setSelectedZone(zone);
    setStep(2); // Pasar a Servicios
  };

  const handleToggleService = (service: Service) => {
    setPlanLimitWarning(null); // Limpiar aviso previo
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      // Si ya estaba seleccionado, lo quitamos (toggle off)
      if (exists) return prev.filter(s => s.id !== service.id);
      
      // Verificar si el plan permite multi-servicio
      const features = getPlanFeatures(tenantPlan);
      if (prev.length >= 1 && !features.multiServiceBooking) {
        // Mostrar aviso amigable al usuario en lugar de ignorar el clic
        setTimeout(() => setPlanLimitWarning('Tu plan actual solo permite seleccionar 1 servicio por cita. Actualiza a Plan PRO para agendar más servicios en una sola sesión.'), 0);
        return prev;
      }
      return [...prev, service];
    });
  };

  const handleSelectStaff = (member: Staff | null) => {
    setSelectedStaff(member);
    // Ya no reseteamos la fecha para reducir fricción
    // El efecto useEffect en el widget cargará los slots automáticamente para el nuevo staff
    setSelectedTime(null);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmTimes = () => {
    setStep(4); // Pasar a Formulario de Guest
  };

  const handleFinalCheckout = async () => {
    if (cartBookings.length === 0) {
      console.warn("Cannot checkout: cart is empty");
      return;
    }

    setIsFinishing(true);
    try {
      // 1. Preparar el arreglo de bookings para la sesión
      let currentStartTime: Date | null = null;
      
      const sessionBookingsData = cartBookings.map((item) => {
        const militaryTime = formatTimeToMilitary(item.time!);
        
        // Enviamos el string "plano" YYYY-MM-DDTHH:mm:ss
        // IMPORTANTE: NO usamos new Date().toISOString() aquí porque eso aplicaría el offset del cliente
        const localIsoString = `${item.date}T${militaryTime}:00`;
        
        // Para calcular el endTime localmente
        const baseStartTime = new Date(`${item.date}T${militaryTime}`);
        const actualStartTime = (schedulingMode === 'bulk' && currentStartTime) 
          ? currentStartTime 
          : baseStartTime;
        const actualEndTime = new Date(actualStartTime.getTime() + item.service.durationMinutes * 60000);
        
        if (schedulingMode === 'bulk') {
          currentStartTime = actualEndTime;
        }

        const formattedEnd = format(actualEndTime, "yyyy-MM-dd'T'HH:mm:ss");

        return {
          branchId: selectedBranch?.id || branches[0]?.id || '',
          serviceId: item.service.id,
          staffId: item.staff?.id || staff[0]?.id || '',
          startTime: localIsoString, // Enviamos el string del inicio
          endTime: formattedEnd,     // Enviamos el string del fin
          price: item.service.price
        };
      });

      // 2. Ejecutar Acción de Sesión
      const result = await createBookingSessionAction({
        tenantId: tenantId,
        customerName: guestName,
        customerEmail: guestEmail,
        customerPhone: guestPhone ? `${selectedCountry.prefix} ${guestPhone}` : undefined,
        zoneId: selectedZone?.id,
        notes: guestNotes,
        bookings: sessionBookingsData
      });

      if (result.success) {
        if (modality === 'domicilio') {
          const waNumber = whatsappNumber || '50370000000';
          let message = waMessageTemplate;
          if (!message) {
            message = "¡Hola! Me gustaría confirmar mis citas para:\n{servicios}\n\n" +
                      "📅 *Primera cita:* {fecha}\n" +
                      "⏰ *Hora:* {hora}\n" +
                      "📍 *Modalidad:* Servicio a Domicilio\n" +
                      "👤 *Cliente:* {cliente}";
          }

          const serviceList = cartBookings.map(s => `- ${s.service.name}`).join("\n");
          const formattedMsg = message
            .replace(/{servicios}/g, serviceList)
            .replace(/{fecha}/g, cartBookings[0].date!)
            .replace(/{hora}/g, cartBookings[0].time!)
            .replace(/{cliente}/g, guestName);

          window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(formattedMsg)}`, '_blank');
        }
        setStep(5);
      } else {
        alert("Error al crear la sesión: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Critical error during session checkout:", err);
      alert("Error crítico al procesar la sesión de reservas");
    } finally {
      setIsFinishing(false);
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

  const formatTo12h = (time24h: string) => {
    const [hours, minutes] = time24h.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
  };

  // Generate dates dynamically based on modality
  const today = new Date();
  const nextDays = Array.from({ length: 30 }).map((_, i) => {
    const leadDays = modality === 'domicilio' ? (homeServiceLeadDays ?? 7) : 0;
    const d = new Date(today);
    d.setDate(today.getDate() + i + leadDays); 
    
    // Usar formato local para evitar desfases de UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayValue = String(d.getDate()).padStart(2, '0');
    const fullDateStr = `${year}-${month}-${dayValue}`;

    return {
      date: d,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: d.getDate(),
      fullDate: fullDateStr
    };
  });

  const getDayName = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Helper to get branch schedule for a specific date
  const getBranchSchedule = (date: Date) => {
    const targetBranch = selectedBranch || branches[0];
    const defaultSchedule = { isOpen: true, slots: [] as { open: string; close: string }[] };
    if (!targetBranch?.businessHours) return defaultSchedule;

    try {
      const bh = JSON.parse(targetBranch.businessHours);
      const dateStr = format(date, "yyyy-MM-dd");
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[date.getDay()];

      // Check special dates first
      if (bh.special?.[dateStr]) {
        return { 
          isOpen: bh.special[dateStr].isOpen, 
          slots: bh.special[dateStr].slots || [] 
        };
      }

      // Check regular schedule
      if (bh.regular?.[dayOfWeek]) {
        return { 
          isOpen: bh.regular[dayOfWeek].isOpen, 
          slots: bh.regular[dayOfWeek].slots || [] 
        };
      }

      // Fallback for simple format: {"open": "08:00", "close": "18:00"}
      if (bh.open && bh.close) {
        return { 
          isOpen: true, 
          slots: [{ open: bh.open, close: bh.close }] 
        };
      }

      return defaultSchedule;
    } catch (e) {
      return defaultSchedule;
    }
  };

  const isBranchOpen = (date: Date) => getBranchSchedule(date).isOpen;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    const todayStart = startOfToday();
    const leadDays = modality === 'domicilio' ? (homeServiceLeadDays ?? 7) : 0;
    const minDate = addDays(todayStart, leadDays);
    const maxDate = addDays(todayStart, 30 + leadDays); // Horizonte de 30 días disponibles

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "yyyy-MM-dd");
        
        let isPast = isBefore(day, minDate);
        let isTooFar = isAfter(day, maxDate);
        const isOpen = isBranchOpen(day);

        // Si es HOY y no hay días de anticipación requeridos, verificar si aún hay tiempo suficiente para el servicio antes del cierre definitivo
        const isToday = formattedDate === format(todayStart, "yyyy-MM-dd");
        if (!isPast && isToday && leadDays === 0) {
          const schedule = getBranchSchedule(day);
          if (schedule.isOpen && schedule.slots.length > 0) {
            // Obtener el cierre definitivo del día
            const lastSlot = schedule.slots[schedule.slots.length - 1];
            const [h, m] = lastSlot.close.split(':').map(Number);
            
            const closingTime = new Date();
            closingTime.setHours(h, m, 0, 0);
            
            const now = new Date();
            // Si ya pasó la hora de cierre definitiva, el día es pasado.
            // Nota: El backend filtrará los slots individuales que ya pasaron.
            if (now >= closingTime) {
              isPast = true;
            }
          } else {
            // Si no está abierto o no tiene slots para hoy, es pasado
            isPast = true;
          }
        }
        
        days.push({
          day,
          formattedDate,
          isDisabled: isPast || isTooFar || !isOpen,
          isClosed: !isOpen && !isPast && !isTooFar,
          isCurrentMonth: isSameMonth(day, monthStart),
          isSelected: selectedDate === formattedDate
        });
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }
    return rows;
  }, [currentMonth, selectedDate, selectedBranch, branches, modality, homeServiceLeadDays, selectedServices, totalDuration]);

  const brand = primaryColor || '#9333ea';

  return (
    <main id={`widget-${tenantId}`} className="flex min-h-screen flex-col items-center justify-start relative overflow-x-hidden bg-slate-50 dark:bg-black/95">
      <style dangerouslySetInnerHTML={{__html: `
         #widget-${tenantId} .bg-purple-600 { background-color: ${brand} !important; }
         #widget-${tenantId} .hover\\:bg-purple-500:hover { background-color: ${brand} !important; filter: brightness(1.2); }
         #widget-${tenantId} .text-purple-600 { color: ${brand} !important; }
         #widget-${tenantId} .text-purple-500 { color: ${brand} !important; }
         #widget-${tenantId} .text-purple-400 { color: ${brand} !important; filter: brightness(1.2); }
         #widget-${tenantId} .border-purple-500 { border-color: ${brand} !important; }
         #widget-${tenantId} .border-l-purple-500 { border-left-color: ${brand} !important; }
         #widget-${tenantId} .hover\\:border-purple-500\\/40:hover { border-color: ${brand}66 !important; }
         #widget-${tenantId} .bg-purple-500\\/5 { background-color: ${brand}0D !important; }
         #widget-${tenantId} .bg-purple-500\\/10 { background-color: ${brand}1A !important; }
         #widget-${tenantId} .hover\\:bg-purple-500\\/10:hover { background-color: ${brand}1A !important; }
         #widget-${tenantId} .bg-purple-500\\/20 { background-color: ${brand}33 !important; }
         #widget-${tenantId} .border-purple-500\\/10 { border-color: ${brand}1A !important; }
         #widget-${tenantId} .border-purple-500\\/20 { border-color: ${brand}33 !important; }
         #widget-${tenantId} .ring-purple-500 { --tw-ring-color: ${brand} !important; }
         #widget-${tenantId} .ring-purple-500\\/20 { --tw-ring-color: ${brand}33 !important; }
         #widget-${tenantId} .ring-purple-500\\/30 { --tw-ring-color: ${brand}4D !important; }
         #widget-${tenantId} .shadow-purple-500\\/20 { --tw-shadow-color: ${brand}33 !important; --tw-shadow: var(--tw-shadow-colored) !important; }
      `}} />

      {coverUrl && (
         <div className="absolute top-0 left-0 w-full h-[30vh] sm:h-[40vh] z-0 overflow-hidden">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-slate-50 dark:to-black/95"></div>
         </div>
      )}

      {/* Decorative ambient background blobs */}
      {!coverUrl && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10 mix-blend-screen" style={{ backgroundColor: `${brand}33` }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
        </>
      )}

      <div className="z-10 w-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center p-4 sm:p-6 md:p-8 mt-4">
        
        {/* Left Side: Business Info / Contextual Selection */}
        <div className="w-full lg:flex-1 space-y-6 pt-0 lg:sticky top-4">
          <div className="space-y-4 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              {tenantLogo ? (
                <div className="flex items-center gap-4">
                  <img src={tenantLogo} alt={tenantName} className="h-16 w-auto object-contain" />
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {heroTitle || tenantName}
                  </h1>
                </div>
              ) : (
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/50 break-words leading-tight">
                  {heroTitle || tenantName}
                </h1>
              )}
              <div className="flex gap-2 self-start sm:self-auto bg-white/5 dark:bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-slate-200 dark:border-white/10">
                <ThemeToggle />
                <LangToggle />
              </div>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-lg leading-relaxed max-w-xl">
              {heroSubtitle || t("hero_subtitle")}
            </p>
          
          {/* Redes Sociales */}
          {(instagramUrl || facebookUrl || tiktokUrl) && (
            <div className="flex items-center gap-3 mt-4">
               {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:text-purple-600 transition-all text-slate-400 shadow-sm"><Instagram className="w-5 h-5"/></a>}
               {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 transition-all text-slate-400 shadow-sm"><Facebook className="w-5 h-5"/></a>}
               {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all text-slate-400 shadow-sm"><Music className="w-5 h-5"/></a>}
            </div>
          )}
          </div>
          
          {(modality || selectedServices.length > 0) && (
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-6 space-y-4 border-l-4 border-l-purple-500 border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-xl">
              <h3 className="text-zinc-100 font-medium tracking-wide text-xs">{t("your_appointment")}</h3>
              
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
                    <span className="font-bold text-sm tracking-wider">{t("selected_services")}:</span>
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
                  <span className="font-medium text-sm">
                    {selectedDate ? getDayName(selectedDate) : t("date_tbd")} 
                    {selectedTime ? ` · ${formatTo12h(selectedTime)}` : ""}
                  </span>
                </div>
              )}

              {/* Enhanced Summary Info on Left */}
              {selectedServices.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-white/10 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="flex flex-col gap-1 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                      <p className="text-[10px] font-black text-purple-400 tracking-[0.2em] mb-1">{t("resume")}</p>
                      <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          ${totalPrice.toFixed(2)}
                        </p>
                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">
                          {totalDuration} min
                        </p>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-1">
                        {selectedServices.length} {selectedServices.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
                      </p>
                      {transferTotal > 0 && (
                        <p className="text-[10px] font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
                           <Truck className="w-3 h-3" /> +${transferTotal.toFixed(2)} Tarifa de traslado 
                           <span title="Esta tarifa cubre el costo de transporte del especialista a tu ubicación.">(?)</span>
                        </p>
                      )}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Booking Widget */}
        <div className="flex-[1.5] w-full bg-white/95 dark:bg-zinc-950/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-5 sm:p-7 shadow-2xl relative min-h-[550px] flex flex-col rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 rounded-3xl pointer-events-none"></div>
          
          {/* STEP Branch & Modality */}
          {step === 1 && (
            <div className="relative z-10 flex flex-col w-full h-full animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
                {bookingSettings?.step1Title || t("title_branch")}
              </h2>
              <div className="space-y-4">
                <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold tracking-wider mb-2">{t("visit_branch")}</p>
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

                {allowsHomeService && (
                  <>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold tracking-wider mt-8 mb-2">{t("or_home")}</p>
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 1.Zone Selection (Home Service only) */}
          {step === 1.1 && (
            <div className="relative z-10 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
               <div className="flex items-center gap-3 mb-6">
                <button 
                   type="button"
                   onClick={() => setStep(1)}
                   className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('home_service')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{t('home_service_desc')}</p>
                </div>
              </div>
              
              <div className="space-y-4 overflow-y-auto no-scrollbar pr-2 flex-1 scroll-smooth">
                {coverageZones && coverageZones.length > 0 ? (
                  coverageZones.map(zone => (
                    <button 
                      key={zone.id}
                      type="button"
                      onClick={() => handleSelectZone(zone)}
                      className="w-full p-5 bg-white dark:bg-white/5 hover:bg-purple-500/10 border border-slate-200 dark:border-white/10 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 group shadow-sm text-left active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-purple-500/20 p-3 rounded-full text-purple-400 group-hover:scale-110 transition-transform"><MapPin /></div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-purple-400 leading-tight mb-0.5">{zone.name}</h3>
                          <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{zone.description || "COBERTURA DISPONIBLE"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-emerald-500 text-xl font-black tracking-tighter">+${zone.fee}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Traslado</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 my-auto">
                     <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-slate-300" />
                     </div>
                     <p className="text-slate-500 dark:text-zinc-400 font-bold mb-1">Sin Zonas de Cobertura</p>
                     <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Este negocio aún no ha configurado zonas para servicio a domicilio.</p>
                     <button type="button" onClick={() => setStep(1)} className="mt-6 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black active:scale-95 transition-all">VOLVER ATRÁS</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP Select Service */}
          {step === 2 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(1)}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {bookingSettings?.step2Title || t("title_service")}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                    {t("select_multiple_services")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 overflow-y-auto flex-1 pr-2 custom-scrollbar items-start content-start">
                {displayServices.map((srv) => {
                  const isSelected = selectedServices.some(s => s.id === srv.id);
                  return (
                    <button 
                      key={srv.id} 
                      onClick={() => handleToggleService(srv)}
                      className={`w-full p-4 bg-white dark:bg-white/5 border rounded-xl text-left transition-all duration-300 group shadow-lg flex flex-col ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                          : 'border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-0.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-purple-500 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-75'}`}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors tracking-tight">{srv.name}</h3>
                        </div>
                        <span className="text-purple-400 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded-full text-xs inline-block self-start sm:self-auto">${srv.price}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 mb-3">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> {srv.durationMinutes} min</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-y-4 text-[11px] border-t border-slate-200 dark:border-white/5 pt-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("includes")}</span>
                          </div>
                          <ul className="space-y-1.5 ml-1">
                            {srv.includes?.map((inc, i) => (
                              <li key={i} className="flex items-start gap-2 text-slate-500 dark:text-zinc-400 leading-tight">
                                <span className="w-1 h-1 rounded-full bg-emerald-500/50 mt-1.5 shrink-0"></span>
                                <span className="flex-1">{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {srv.excludes && srv.excludes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("excludes")}</span>
                            </div>
                            <ul className="space-y-1.5 ml-1">
                              {srv.excludes.map((exc, i) => (
                                <li key={i} className="flex items-start gap-2 text-slate-500 dark:text-zinc-400 leading-tight">
                                  <span className="w-1 h-1 rounded-full bg-rose-500/50 mt-1.5 shrink-0"></span>
                                  <span className="flex-1">{exc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Aviso de límite de plan */}
              {planLimitWarning && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in slide-in-from-top-2 duration-300 flex items-start gap-3">
                  <span className="text-amber-400 text-lg shrink-0">⚠</span>
                  <div>
                    <p className="text-sm font-bold text-amber-400">Límite de plan alcanzado</p>
                    <p className="text-xs text-amber-300/80 mt-0.5">{planLimitWarning}</p>
                  </div>
                  <button onClick={() => setPlanLimitWarning(null)} className="ml-auto text-amber-400/60 hover:text-amber-400 transition-colors shrink-0">✕</button>
                </div>
              )}

              {/* Optional Bottom Summary Bar (can be hidden if on left) */}
              {selectedServices.length > 0 && !bookingSettings?.showSummaryOnLeft && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5 animate-in slide-in-from-bottom-4 duration-300">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                      <div>
                        <p className="text-xs font-bold text-slate-400 tracking-widest">{t("resume")}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'} · {totalDuration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-black text-purple-400">${totalPrice.toFixed(2)}</p>
                        <button 
                          onClick={() => {
                            if (selectedServices.length > 1) {
                              setStep(2.5); // Nuevo paso: Elegir modalidad
                            } else {
                              setSchedulingMode('bulk');
                              setStep(3);
                            }
                          }}
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

          {/* STEP 2.Choose Scheduling Mode */}
          {step === 2.5 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(2)}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  ¿Cómo prefieres tus citas?
                </h2>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => { setSchedulingMode('bulk'); setStep(3); }}
                  className="w-full p-6 bg-white dark:bg-white/5 hover:bg-purple-500/10 border border-slate-200 dark:border-white/10 hover:border-purple-500/40 rounded-2xl flex items-center gap-5 transition-all duration-300 group shadow-lg text-left"
                >
                  <div className="bg-purple-500/20 p-4 rounded-full text-purple-400 group-hover:scale-110 transition-transform"><Layers className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-purple-400">Todo seguido (Recomendado)</h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-sm">Realiza todos tus servicios en una sola visita, uno tras otro.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setSchedulingMode('separate'); setStep(3); setCurrentServiceIndex(0); }}
                  className="w-full p-6 bg-white dark:bg-white/5 hover:bg-blue-500/10 border border-slate-200 dark:border-white/10 hover:border-blue-500/40 rounded-2xl flex items-center gap-5 transition-all duration-300 group shadow-lg text-left"
                >
                  <div className="bg-blue-500/20 p-4 rounded-full text-blue-400 group-hover:scale-110 transition-transform"><CalendarRange className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-400">En días u horas distintas</h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-sm">Elige una fecha y especialista diferente para cada servicio.</p>
                  </div>
                </button>

                {!canUseFeature(tenantPlan, 'separateServiceScheduling') && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      El agendamiento dividido es una función **PRO**. Actualiza tu suscripción para activarla.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP Select Date & Time (and STAFF) */}
          {step === 3 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white max-h-screen">
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => { setStep(2); setSelectedTime(null); setSelectedStaff(null); }}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  {schedulingMode === 'separate' 
                    ? `Agendando ${currentServiceIndex + 1} de ${selectedServices.length}: ${selectedServices[currentServiceIndex]?.name}`
                    : (bookingSettings?.step3Title || t("title_specialist"))
                  }
                </h2>
              </div>
              
              <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                {/* STAFF SELECTION - More Compact */}
                <div>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                    <button 
                      onClick={() => handleSelectStaff(null)}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-full transition-all duration-300 shrink-0 ${
                        selectedStaff === null 
                          ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-400 shadow-sm' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="text-sm">✨ {t("anyone")}</span>
                    </button>
                    
                    {displayStaff.map((member) => (
                      <button 
                        key={member.id}
                        onClick={() => handleSelectStaff(member)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-full transition-all duration-300 shrink-0 ${
                          selectedStaff?.id === member.id 
                            ? 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm' 
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 font-bold flex items-center justify-center text-[10px] border border-blue-500/30">
                          {member.name.charAt(0)}
                        </div>
                        <span className="text-sm">{member.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
                  {/* DATE SELECTION - Interactive Calendar */}
                  <div className="w-full md:w-[280px] lg:w-[320px] flex flex-col shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-3 uppercase">
                       {modality === 'domicilio' ? t("dates_home") : t("dates")}
                    </p>
                    
                    <div className="bg-white/5 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-xl overflow-hidden relative group">
                       {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black capitalize dark:text-white">
                          {format(currentMonth, "MMMM yyyy", { locale: es })}
                        </h3>
                        <div className="flex gap-1">
                          <button onClick={prevMonth} className="p-1 px-1.5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <button onClick={nextMonth} className="p-1 px-1.5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Weekday Names */}
                      <div className="grid grid-cols-7 mb-2">
                        {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(d => (
                          <div key={d} className="text-[10px] font-bold text-slate-500 text-center">{d}</div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.flat().map((d, i) => (
                          <button
                            key={i}
                            disabled={d.isDisabled}
                            onClick={() => {
                              setSelectedDate(d.formattedDate);
                              // If it's a padding day from another month, navigate to that month too
                              if (!d.isCurrentMonth) {
                                setCurrentMonth(startOfMonth(d.day));
                              }
                            }}
                            className={`
                              h-9 sm:h-10 text-xs font-bold rounded-lg transition-all duration-300 relative
                              ${d.isDisabled ? 'text-slate-300 dark:text-zinc-700 opacity-50 cursor-not-allowed pointer-events-none' : 'hover:scale-110'}
                              ${!d.isCurrentMonth ? 'opacity-40 grayscale-[0.5]' : ''}
                              ${d.isClosed ? 'bg-rose-500/10 text-rose-500/50' : ''}
                              ${d.isSelected 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/50 scale-105 !opacity-100 !grayscale-0' 
                                : d.isDisabled ? '' : 'bg-white dark:bg-white/5 text-slate-700 dark:text-white border border-transparent hover:border-purple-500/30'}
                            `}
                          >
                            {format(d.day, "d")}
                            {d.isClosed && !d.isSelected && <div className="absolute top-1 right-1 w-1 h-1 bg-rose-500 rounded-full"></div>}
                            {d.isSelected && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TIME SELECTION - Grid */}
                  <div className="flex-1 flex flex-col overflow-hidden w-full">
                    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 sm:p-6 w-full">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Horarios disponibles
                      </h3>

                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6 pb-4">
                        {isLoadingTimes ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            <p className="mt-2 text-xs text-slate-400">Verificando disponibilidad...</p>
                          </div>
                        ) : errorType || (selectedDate && availableTimes.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-rose-500/5 dark:bg-rose-500/10 border border-dashed border-rose-500/20 rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                            {errorType === 'BRANCH_CLOSED' ? (
                                <XCircle className="w-10 h-10 mb-3 text-rose-500/60" />
                            ) : (
                                <Clock className="w-10 h-10 mb-3 text-rose-500/60" />
                            )}
                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                              {errorType === 'BRANCH_CLOSED'
                                ? 'La sucursal no se encuentra disponible en este horario'
                                : (modality === 'domicilio' ? 'No hay disponibilidad para servicio a domicilio' : 'No hay especialistas disponibles para esta fecha')}
                            </p>
                            <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
                              Por favor intenta con otra fecha o {selectedStaff ? 'selecciona otro especialista' : 'verifica en un horario distinto'}.
                            </p>
                          </div>
                        ) : !selectedDate ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                            <Calendar className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm font-medium">Selecciona un día en el calendario</p>
                            <p className="text-[10px] opacity-50 mt-1 max-w-[150px] text-center">Escoge una fecha para ver los horarios disponibles</p>
                          </div>
                        ) : (
                          <>
                            {[
                              { label: "Mañana", icon: "🌅", range: [0, 11] },
                              { label: "Tarde", icon: "☀️", range: [12, 17] },
                              { label: "Noche", icon: "🌙", range: [18, 23] }
                            ].map((section) => {
                              const sectionTimes = (availableTimes as any[]).filter(t => {
                                const hour = parseInt(t.time.split(':')[0], 10); // getAvailableSlots returns 24h 'time'
                                return hour >= section.range[0] && hour <= section.range[1];
                              });

                              if (sectionTimes.length === 0) return null;

                              return (
                                <div key={section.label} className="space-y-3">
                                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-2">
                                    <span className="text-lg">{section.icon}</span>
                                    <h3 className="text-xs font-bold tracking-widest text-slate-600 dark:text-zinc-400">
                                      {section.label}
                                    </h3>
                                  </div>
                                  {hasTzDifference && i === 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2">
                                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                        Horarios mostrados en la hora local del negocio ({businessOffsetLabel})
                                      </p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {sectionTimes.map(({time, available}) => (
                                      <button 
                                        key={time}
                                        onClick={() => available && setSelectedTime(time)}
                                        disabled={!available}
                                        className={`px-2 py-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center border ${
                                          !available
                                            ? "bg-slate-50 dark:bg-black/40 text-slate-300 dark:text-zinc-700 border-slate-100 dark:border-white/5 cursor-not-allowed hidden"
                                            : selectedTime === time 
                                              ? "bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-500/20" 
                                              : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300"
                                        }`}
                                      >
                                        <span className="font-bold text-[10px]">{formatTo12h(time)}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 w-full">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    
                    if (schedulingMode === 'separate') {
                      // Guardar en el carrito temporal
                      const newBooking = {
                        service: selectedServices[currentServiceIndex],
                        staff: selectedStaff,
                        date: selectedDate,
                        time: selectedTime,
                      };
                      setCartBookings(prev => [...prev, newBooking]);
                      
                      // ¿Hay más servicios?
                      if (currentServiceIndex < selectedServices.length - 1) {
                        setCurrentServiceIndex(prev => prev + 1);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setSelectedStaff(null);
                      } else {
                        setStep(4);
                      }
                    } else {
                      // Modo Masivo: Una sola selección para todos
                      const bookingsInBulk = selectedServices.map((s, idx) => {
                         return { 
                           service: s, 
                           staff: selectedStaff, 
                           date: selectedDate, 
                           time: selectedTime 
                         };
                      });
                      setCartBookings(bookingsInBulk);
                      setStep(4);
                    }
                  }}
                  disabled={!selectedTime || !selectedDate}
                  className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white rounded-xl font-black tracking-widest transition-all duration-300 shadow-xl active:scale-[0.98] uppercase text-sm"
                >
                  {schedulingMode === 'separate' && currentServiceIndex < selectedServices.length - 1 
                    ? `Siguiente Servicio (${currentServiceIndex + 2}/${selectedServices.length}) →` 
                    : t("go_to_data")
                  }
                </button>
              </div>
            </div>
          )}

          {/* STEP Guest Form */}
          {step === 4 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setStep(3)}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight">
                  {bookingSettings?.step4Title || t("title_data")}
                </h2>
              </div>
              
              <div className="space-y-5 mb-8 w-full">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">{t("full_name")}</label>
                  <div className="relative">
                    <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre y Apellido" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">{t("email")}</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={t("email_placeholder")} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">{t("phone")}</label>
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

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">{t("comments")}</label>
                  <textarea 
                    value={guestNotes} 
                    onChange={e => setGuestNotes(e.target.value)} 
                    placeholder={t("comments_placeholder")} 
                    rows={3}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 px-4 text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                  />
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

              <div className="mt-auto w-full">
                <button 
                  onClick={handleFinalCheckout}
                  disabled={!isFormValid || isFinishing}
                  className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-black tracking-widest shadow-xl shadow-purple-500/20 disabled:shadow-none transition-all duration-300 border border-purple-500/50 flex items-center justify-center gap-2 uppercase text-sm"
               >
                  {isFinishing && <Loader2 className="w-5 h-5 animate-spin" />}
                  {modality === 'domicilio' ? t("confirm_whatsapp") : t("finish_booking")}
                </button>
              </div>
            </div>
          )}

          {/* STEP Success Screen */}
          {step === 5 && (
            <div className="relative z-10 flex flex-col w-full items-center justify-start text-center animate-in fade-in zoom-in-95 duration-700 pt-2">
               <div className={`w-16 h-16 ${modality === 'domicilio' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] text-purple-400'} border rounded-full flex items-center justify-center mb-3`}>
                 {modality === 'domicilio' ? <Phone className="w-8 h-8" /> : <Check className="w-10 h-10" />}
               </div>
               
               <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                 {modality === 'domicilio' ? t("redirecting") : t("success")}
               </h2>
               
               <div className="space-y-2 text-slate-600 dark:text-zinc-300 mb-4 max-w-md w-full">
                 <p className="text-sm">
                    {modality === 'domicilio' 
                      ? t("redirecting_desc", { service: selectedServices.map(s => s.name).join(", "), tenant: tenantName })
                      : t("success_desc", { name: guestName.split(' ')[0], branch: selectedBranch?.name || '', service: selectedServices.map(s => s.name).join(", ") })
                    }
                 </p>
                 
                 <div className="bg-slate-100 dark:bg-black/30 w-full p-5 rounded-2xl border border-slate-200 dark:border-white/5 mt-2 space-y-3 text-left">
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-white/5">
                      <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{t("date")}</p>
                        <p className="text-purple-500 font-bold text-sm tracking-tight">{selectedDate || t("date_tbd")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{t("time")}</p>
                        <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">{selectedTime ? formatTo12h(selectedTime) : '--'}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t("customer")}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{guestName}</p>
                        </div>
                      </div>

                      {selectedStaff && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 overflow-hidden">
                            {selectedStaff.imageUrl ? <img src={selectedStaff.imageUrl} className="w-full h-full object-cover" /> : <Check className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t("specialist")}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{selectedStaff.name}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t("contact")}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{`${selectedCountry.prefix} ${guestPhone}`}</p>
                        </div>
                      </div>

                      {guestEmail && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t("email_label")}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-all">{guestEmail}</p>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               </div>
               
{/* Calendar Sync Dropdown */}
<div className="relative group mb-4">
<button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-bold transition-all shadow-sm">
<CalendarRange className="w-4 h-4 text-purple-400" />
Sincronizar calendario
</button>
<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[99] p-2 text-left ring-1 ring-black/5 dark:ring-white/5">
<a 
href={getGoogleCalendarUrl({
title: `Cita en ${tenantName}`,
description: `Servicio: ${selectedServices.map(s => s.name).join(", ")}\nEspecialista: ${selectedStaff?.name || 'Cualquiera'}`,
location: selectedBranch?.address || 'Servicio a domicilio',
startTime: new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`),
endTime: new Date(new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`).getTime() + totalDuration * 60000)
})}
target="_blank"
className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300"
>
<Globe className="w-3.5 h-3.5" /> Google Calendar
</a>
<a 
href={getOutlookCalendarUrl({
title: `Cita en ${tenantName}`,
description: `Servicio: ${selectedServices.map(s => s.name).join(", ")}\nEspecialista: ${selectedStaff?.name || 'Cualquiera'}`,
location: selectedBranch?.address || 'Servicio a domicilio',
startTime: new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`),
endTime: new Date(new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`).getTime() + totalDuration * 60000)
})}
target="_blank"
className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300"
>
<Mail className="w-3.5 h-3.5" /> Outlook (Web)
</a>
<a 
href={generateICSFile({
title: `Cita en ${tenantName}`,
description: `Servicio: ${selectedServices.map(s => s.name).join(", ")}\nEspecialista: ${selectedStaff?.name || 'Cualquiera'}`,
location: selectedBranch?.address || 'Servicio a domicilio',
startTime: new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`),
endTime: new Date(new Date(`${selectedDate}T${formatTimeToMilitary(selectedTime || '09:00 AM')}`).getTime() + totalDuration * 60000)
})}
download="cita.ics"
className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300"
>
<Download className="w-3.5 h-3.5" /> Descargar archivo .ics
</a>
</div>
</div>

              <button 
                onClick={() => { setStep(1); setSelectedDate(null); setSelectedTime(null); setSelectedServices([]); setSelectedStaff(null); setModality(null); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}
                className="w-full py-4 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black tracking-widest uppercase transition-all text-xs shadow-sm hover:shadow-md mt-4"
              >
                {t("back_to_start")}
              </button>
            </div>
          )}

          {/* Persistent Widget Footer */}
          {bookingSettings?.footerText && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 text-center">
              <p className="text-xs text-slate-500 dark:text-zinc-500 whitespace-pre-wrap leading-relaxed opacity-80 max-w-sm mx-auto">
                {bookingSettings.footerText}
              </p>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
