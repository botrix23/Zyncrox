"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, startOfToday, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { getAvailableSlots, createBookingAction, createBookingSessionAction, lockSlotAction, releaseSlotLocksAction, releaseServiceSlotLockAction } from "@/app/actions/booking";
import { Calendar, Clock, ChevronRight, ChevronDown, Check, X, ArrowLeft, User, MapPin, Truck, Mail, Phone, UserCircle, Loader2, CheckCircle2, XCircle, Instagram, Facebook, Music, Layers, CalendarRange, Crown, Download, Globe } from "lucide-react";
import { canUseFeature, getPlanFeatures } from "@/core/plans";
import { getGoogleCalendarUrl, getOutlookCalendarUrl, generateICSFile } from "@/lib/calendar";

type Branch = { id: string; name: string; businessHours?: string | null };
type Service = { id: string; name: string; durationMinutes: number; price: string; includes: string[]; excludes: string[]; allowsHomeService?: boolean; allowSimultaneous?: boolean; isExclusive?: boolean; branches?: { id: string; branchId: string }[]; categoryIds?: string[] };
type Staff = { id: string; name: string; allowsHomeService?: boolean; categoryIds?: string[] };
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

// Helper functions moved up for hoisting
function formatTimeToMilitary(time12h: string) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM' && hours !== '12') hours = (parseInt(hours, 10) + 12).toString();
  if (modifier === 'AM' && hours === '12') hours = '00';
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

function formatTo12h(time24h: string) {
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${minutes} ${ampm}`;
}

const parsePrice = (price: any) => {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const clean = String(price).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};


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
  heroSubtitle,
  isAdmin,
  onBookingCreated,
  showStaffSelection,
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
    footerText?: string;
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
  isAdmin?: boolean;
  onBookingCreated?: () => void;
  showStaffSelection?: boolean;
}) {
  const t = useTranslations('BookingWidget');
  const [step, setStep] = useState(1);
  const currentPlan = tenantPlan || 'FREE';

  const [modality, setModality] = useState<'local' | 'domicilio' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<CoverageZone | null>(null);

  const [availableTimes, setAvailableTimes] = useState<{ time: string, available: boolean }[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [errorType, setErrorType] = useState<'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null>(null);

  const [schedulingMode, setSchedulingMode] = useState<'bulk' | 'separate' | null>(null);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  // Servicios en simultaneo
  const [simultaneousMode, setSimultaneousMode] = useState<boolean | null>(null);
  const [showSimultaneousPrompt, setShowSimultaneousPrompt] = useState(false);
  // Grupos de servicios simultáneos: array de arrays de índices en selectedServices
  const [simulGroups, setSimulGroups] = useState<number[][] | null>(null);
  const [cartBookings, setCartBookings] = useState<{
    service: Service;
    staff: Staff | null;
    date: string | null;
    time: string | null;
  }[]>([]);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryList, setShowCountryList] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  // Token único por sesión de reserva — identifica los soft locks de este visitante
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [isFinishing, setIsFinishing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [planLimitWarning, setPlanLimitWarning] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const businessTimezone = (branches[0] as any)?.tenant?.timezone || 'America/El_Salvador';
  const [hasTzDifference, setHasTzDifference] = useState(false);
  const [businessOffsetLabel, setBusinessOffsetLabel] = useState("");
  const [openTimeSections, setOpenTimeSections] = useState<Set<string>>(() => {
    const hour = new Date().getHours();
    if (hour < 12) return new Set(['Mañana']);
    if (hour < 18) return new Set(['Tarde']);
    return new Set(['Noche']);
  });

  useEffect(() => {
    try {
      const bizFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: businessTimezone,
        timeZoneName: 'shortOffset'
      });
      const bizParts = bizFormatter.formatToParts(new Date());
      const bizTzName = bizParts.find(p => p.type === 'timeZoneName')?.value || 'GMT-6';

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

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Salvador')) setSelectedCountry(COUNTRIES.find(c => c.code === 'SV') || COUNTRIES[0]);
    else if (tz.includes('America/New_York') || tz.includes('America/Los_Angeles') || tz.includes('America/Chicago')) setSelectedCountry(COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0]);
    else if (tz.includes('Mexico')) setSelectedCountry(COUNTRIES.find(c => c.code === 'MX') || COUNTRIES[0]);
    else if (tz.includes('Europe/Madrid')) setSelectedCountry(COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0]);
  }, []);

  useEffect(() => {
    // Cuando el widget está embebido en el admin, nunca tocar el tema del documento
    if (isAdmin || !forcedTheme) return;

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(forcedTheme === 'dark' ? 'dark' : 'light');
    document.documentElement.style.colorScheme = forcedTheme === 'dark' ? 'dark' : 'light';

    return () => {
      // Al desmontar (navegación al admin u otra ruta), restaurar el tema
      // que el ThemeProvider (next-themes) guardó en localStorage
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.style.colorScheme = '';
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = (!saved || saved === 'system') ? (prefersDark ? 'dark' : 'light') : saved;
      document.documentElement.classList.add(resolved);
    };
  }, [forcedTheme, isAdmin]);

  useEffect(() => {
    if (!selectedDate) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === todayStr;
    const [y, mo, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, mo - 1, d);
    const schedule = getBranchSchedule(dateObj);

    if (isToday) {
      // For today: open the section that covers the current hour
      const hour = new Date().getHours();
      if (hour < 12) setOpenTimeSections(new Set(['Mañana']));
      else if (hour < 18) setOpenTimeSections(new Set(['Tarde']));
      else setOpenTimeSections(new Set(['Noche']));
    } else {
      // For future dates: open the section that covers the branch's opening hour
      if (schedule.isOpen && schedule.slots.length > 0) {
        const openH = parseInt(schedule.slots[0].open.split(':')[0], 10);
        if (openH < 12) setOpenTimeSections(new Set(['Mañana']));
        else if (openH < 18) setOpenTimeSections(new Set(['Tarde']));
        else setOpenTimeSections(new Set(['Noche']));
      } else {
        setOpenTimeSections(new Set(['Mañana']));
      }
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand the first section with available slots when slots load
  useEffect(() => {
    if (!availableTimes || availableTimes.length === 0) return;
    const sections = [
      { label: "Mañana", range: [0, 11] },
      { label: "Tarde", range: [12, 17] },
      { label: "Noche", range: [18, 23] }
    ];
    setOpenTimeSections(prev => {
      const openHasSlots = [...prev].some(label => {
        const sec = sections.find(s => s.label === label);
        if (!sec) return false;
        return availableTimes.some(t => {
          const h = parseInt(t.time.split(':')[0], 10);
          return h >= sec.range[0] && h <= sec.range[1] && t.available;
        });
      });
      if (openHasSlots) return prev;
      for (const sec of sections) {
        if (availableTimes.some(t => {
          const h = parseInt(t.time.split(':')[0], 10);
          return h >= sec.range[0] && h <= sec.range[1] && t.available;
        })) {
          return new Set([sec.label]);
        }
      }
      return prev;
    });
  }, [availableTimes]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const displayServices = useMemo(() => {
    if (modality === 'domicilio') {
      // Regla 15: solo servicios con allowsHomeService
      // Regla 19: servicios exclusivos de sucursal nunca en domicilio
      return services.filter(s => s.allowsHomeService !== false && !s.isExclusive);
    }
    if (modality === 'local' && selectedBranch) {
      return services.filter(s => {
        if (s.isExclusive) {
          // Regla 18: exclusivos solo en su sucursal asignada (debe tener match explícito)
          return (s.branches || []).some(b => b.branchId === selectedBranch.id);
        }
        // No-exclusivos: sin restricción de sucursal = mostrar en todas
        if (!s.branches || s.branches.length === 0) return true;
        return s.branches.some(b => b.branchId === selectedBranch.id);
      });
    }
    return services;
  }, [services, modality, selectedBranch]);

  // Regla 25: el prompt de simultáneos solo aplica si HAY AL MENOS 2 servicios con el tag
  const hasSomeSimultaneous = selectedServices.filter(s => s.allowSimultaneous).length >= 2;

  // Calcula los grupos de simultaneidad: pares de servicios allowSimultaneous primero,
  // luego los no-simultáneos individualmente al final.
  const computeSimulGroups = (svcs: Service[]): number[][] => {
    const simulIdx = svcs.map((s, i) => s.allowSimultaneous ? i : null).filter(i => i !== null) as number[];
    const nonSimulIdx = svcs.map((s, i) => !s.allowSimultaneous ? i : null).filter(i => i !== null) as number[];
    const groups: number[][] = [];
    for (let i = 0; i < simulIdx.length; i += 2) groups.push(simulIdx.slice(i, i + 2));
    for (const i of nonSimulIdx) groups.push([i]);
    return groups;
  };

  // Obtiene el tiempo real de inicio de un cartBooking[idx] considerando grupos simultáneos
  const getSimulStartTime = (idx: number): Date => {
    const base = new Date(`${cartBookings[0]?.date}T${formatTimeToMilitary(cartBookings[0]?.time!)}`);
    if (!simultaneousMode || !simulGroups) {
      const offsetMs = cartBookings.slice(0, idx).reduce((acc, b) => acc + b.service.durationMinutes * 60000, 0);
      return new Date(base.getTime() + offsetMs);
    }
    let groupStart = base;
    for (const group of simulGroups) {
      if (group.includes(idx)) return groupStart;
      const maxDur = Math.max(...group.map(i => cartBookings[i]?.service.durationMinutes ?? 0));
      groupStart = new Date(groupStart.getTime() + maxDur * 60000);
    }
    return groupStart;
  };

  const displayStaff = useMemo(() => {
    let filtered = modality === 'domicilio'
      ? staff.filter(s => s.allowsHomeService !== false)
      : [...staff];

    if (selectedServices.length > 0) {
      if (schedulingMode === 'separate') {
        // En modo separado cada servicio elige su propio especialista:
        // filtrar solo por el servicio que se está agendando en este momento.
        const currentCategoryIds = selectedServices[currentServiceIndex]?.categoryIds || [];
        if (currentCategoryIds.length > 0) {
          filtered = filtered.filter(s =>
            (s.categoryIds || []).some(cId => currentCategoryIds.includes(cId))
          );
        }
      } else {
        // En modo bulk un mismo especialista atiende TODOS los servicios:
        // debe tener al menos una categoría de CADA servicio que tenga categorías asignadas.
        const servicesWithCategories = selectedServices.filter(s => (s.categoryIds || []).length > 0);
        if (servicesWithCategories.length > 0) {
          filtered = filtered.filter(s =>
            servicesWithCategories.every(service =>
              (service.categoryIds || []).some(cId => (s.categoryIds || []).includes(cId))
            )
          );
        }
      }
    }

    return filtered;
  }, [staff, modality, selectedServices, schedulingMode, currentServiceIndex]);

  const isFormValid =
    guestName.trim() !== '' &&
    emailRegex.test(guestEmail) &&
    guestPhone.length >= (selectedCountry as any).minLen &&
    (modality !== 'domicilio' || (guestAddress.trim() !== '' && selectedZone !== null && (!homeServiceTermsEnabled || agreedToTerms)));

  const getTransferInfo = (bks = cartBookings) => {
    if (modality !== 'domicilio' || !selectedZone || bks.length === 0) return { total: 0, blocks: 0 };

    const zoneFee = parsePrice(selectedZone.fee);
    let transferBlocks = 1;

    const sortedBookings = [...bks].sort((a, b) => {
      const timeA = new Date(`${a.date}T${formatTimeToMilitary(a.time!)}`).getTime();
      const timeB = new Date(`${b.date}T${formatTimeToMilitary(b.time!)}`).getTime();
      return timeA - timeB;
    });

    for (let i = 1; i < sortedBookings.length; i++) {
      const prev = sortedBookings[i - 1];
      const curr = sortedBookings[i];

      const prevStartTime = new Date(`${prev.date}T${formatTimeToMilitary(prev.time!)}`).getTime();
      const prevEndTime = prevStartTime + (prev.service.durationMinutes * 60000);
      const currStartTime = new Date(`${curr.date}T${formatTimeToMilitary(curr.time!)}`).getTime();

      const isDifferentDay = prev.date !== curr.date;
      const isDifferentStaff = prev.staff?.id !== curr.staff?.id;
      const hasGap = currStartTime > prevEndTime;
      // Simultaneous domicilio: services at same time need different staff (each makes a separate trip)
      const isSimultaneous = currStartTime === prevStartTime && prev.service.allowSimultaneous && curr.service.allowSimultaneous;

      if (isSimultaneous || isDifferentDay || isDifferentStaff || hasGap) {
        transferBlocks++;
      }
    }

    return { total: transferBlocks * zoneFee, blocks: transferBlocks };
  };

  // Preview bookings: incluye la selección actual para actualizar el total en tiempo real
  // Solo aplica en step 3 (selección de horario); en step 4+ el cart ya está completo
  const previewCartBookings = useMemo(() => {
    if (step !== 3 || schedulingMode !== 'separate' || !selectedDate || !selectedTime) return cartBookings;
    return [...cartBookings, {
      service: selectedServices[currentServiceIndex],
      staff: selectedStaff,
      date: selectedDate,
      time: selectedTime,
    }];
  }, [step, cartBookings, selectedDate, selectedTime, schedulingMode, currentServiceIndex, selectedServices, selectedStaff]);

  const transferInfo = getTransferInfo();
  const transferTotal = transferInfo.total;

  const sidebarTransferInfo = getTransferInfo(previewCartBookings);
  const sidebarTransferTotal = sidebarTransferInfo.total;


  const servicesTotal = selectedServices.reduce((acc, s) => acc + parsePrice(s.price), 0);
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

          const durationToQuery = (() => {
            if (schedulingMode === 'separate') return serviceToQuery.durationMinutes;
            if (schedulingMode === 'bulk' && simultaneousMode && simulGroups) {
              // Simultáneo: la duración real del bloque es la suma de max(duración de cada grupo)
              return simulGroups.reduce((total, group) =>
                total + Math.max(...group.map(i => selectedServices[i]?.durationMinutes ?? 0)), 0);
            }
            return totalDuration;
          })();

          // Cuando no hay staff específico seleccionado, restringir al equipo filtrado por categorías
          const allowedStaffIds = !selectedStaff ? displayStaff.map(s => s.id) : undefined;

          // En modo simultáneo bulk: necesitamos tantos staff disponibles como servicios en el grupo mayor
          // En modo separate con servicio simultáneo: contamos cuántos simultáneos ya están confirmados + 1
          const simCount = (() => {
            if (schedulingMode === 'bulk' && simultaneousMode && simulGroups) {
              return Math.max(...simulGroups.map(g => g.length));
            }
            if (schedulingMode === 'separate' && selectedServices[currentServiceIndex]?.allowSimultaneous) {
              const confirmedSimul = cartBookings.filter(b => b.service.allowSimultaneous).length;
              return confirmedSimul + 1;
            }
            return 1;
          })();

          const res = await getAvailableSlots(
            selectedDate || '',
            serviceToQuery?.id || '',
            selectedBranch?.id || branches[0]?.id || '',
            selectedStaff?.id,
            durationToQuery,
            modality === 'domicilio',
            !!isAdmin,
            allowedStaffIds,
            simCount,
            sessionToken
          );

          const slots = res.slots || [];
          setErrorType(res.errorType || null);

          if (slots.filter((s: any) => s.available).length === 0 && selectedDate && schedulingMode === 'bulk') {
            const findNextAvailable = async () => {
              for (const day of nextDays) {
                if (day.fullDate <= (selectedDate || '')) continue;
                const nextRes = await getAvailableSlots(
                  day.fullDate,
                  serviceToQuery?.id || '',
                  selectedBranch?.id || branches[0]?.id || '',
                  selectedStaff?.id,
                  durationToQuery,
                  modality === 'domicilio',
                  !!isAdmin,
                  allowedStaffIds
                );
                if (nextRes.slots?.some((s: any) => s.available)) {
                  setSelectedDate(day.fullDate);
                  return;
                }
              }
            };
            findNextAvailable();
          }

          const currentAllowSimult = res.allowSimultaneous ?? false;

          if (schedulingMode === 'separate' && cartBookings.length > 0) {
            const filteredSlots = slots.map((slot: any) => {
              if (!slot.available) return slot;

              const slotTime24 = (slot.time?.includes('AM') || slot.time?.includes('PM')) ? formatTimeToMilitary(slot.time) : slot.time;
              const slotStartTime = new Date(`${selectedDate}T${slotTime24}`);
              const slotEndTime = new Date(slotStartTime.getTime() + serviceToQuery.durationMinutes * 60000);

              const overlappingEntries = cartBookings.filter(prev => {
                if (!prev.date || !prev.time) return false;
                const prevTime24 = (prev.time?.includes('AM') || prev.time?.includes('PM')) ? formatTimeToMilitary(prev.time) : prev.time;
                const prevStart = new Date(`${prev.date}T${prevTime24}`);
                const prevEnd = new Date(prevStart.getTime() + prev.service.durationMinutes * 60000);
                return slotStartTime < prevEnd && slotEndTime > prevStart;
              });

              let hasConflict = false;

              // Regla 13: domicilio+separate con tag simultáneo SÍ puede coincidir (se cobran 2 traslados)
              // Regla 12: domicilio+bulk nunca simultáneo (ese caso no llega aquí, se controla en step 2.5)
              // Regla 14: domicilio+separate sin tag simultáneo NO puede coincidir
              const currentAllowSimult = res.allowSimultaneous ?? false;
              const someParticipantDisallows = overlappingEntries.length > 0 && (!currentAllowSimult || overlappingEntries.some(e => !e.service.allowSimultaneous));

              if (someParticipantDisallows) {
                hasConflict = true;
              } else {
                const staffInCartForThisSlot = overlappingEntries.map(e => e.staff?.id).filter(id => !!id);

                if (selectedStaff?.id) {
                  if (staffInCartForThisSlot.includes(selectedStaff.id)) {
                    hasConflict = true;
                  }
                } else {
                  const availableForAnyone = slot.availableStaffIds || (slot.staffId ? [slot.staffId] : []);
                  const trulyFreeStaff = availableForAnyone.filter((id: string) => !staffInCartForThisSlot.includes(id as string));
                  if (trulyFreeStaff.length === 0) {
                    hasConflict = true;
                  }
                }
              }

              return {
                ...slot,
                available: !hasConflict
              };
            });
            setAvailableTimes(filteredSlots);
          } else {
            setAvailableTimes(slots);
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
      else if (nextDays.length > 0) {
        // Check against the actual branch closing time for today
        const todayEntry = nextDays[0];
        const schedule = getBranchSchedule(todayEntry.date);
        let todayIsClosed = !schedule.isOpen;

        if (!todayIsClosed && schedule.slots.length > 0) {
          const lastSlot = schedule.slots[schedule.slots.length - 1];
          const [h, m] = lastSlot.close.split(':').map(Number);
          const closingTime = new Date();
          closingTime.setHours(h, m, 0, 0);
          if (new Date() >= closingTime) todayIsClosed = true;
        } else if (!todayIsClosed && schedule.slots.length === 0) {
          // No schedule data — fall back to 18:00
          todayIsClosed = new Date().getHours() >= 18;
        }

        setSelectedDate((todayIsClosed && nextDays.length > 1) ? nextDays[1].fullDate : nextDays[0].fullDate);
      }
    }
  }, [step, selectedDate, selectedServices, selectedStaff, selectedBranch, branches, totalDuration, schedulingMode, currentServiceIndex]);

  const handleSelectModality = (mod: 'local' | 'domicilio', branch: Branch | null = null) => {
    setModality(mod);
    setSelectedBranch(branch);
    if (mod === 'domicilio') {
      setStep(1.1);
    } else {
      setStep(2);
    }
  };

  const handleSelectZone = (zone: CoverageZone) => {
    setSelectedZone(zone);
    setStep(2);
  };

  const handleToggleService = (service: Service) => {
    setPlanLimitWarning(null);
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);

      const features = getPlanFeatures(tenantPlan);
      if (prev.length >= 1 && !features.multiServiceBooking) {
        setTimeout(() => setPlanLimitWarning('Tu plan actual solo permite seleccionar 1 servicio por cita. Actualiza a Plan PRO para agendar más servicios en una sola sesión.'), 0);
        return prev;
      }
      return [...prev, service];
    });
  };

  const handleSelectStaff = (member: Staff | null) => {
    setSelectedStaff(member);
    setSelectedTime(null);
  };

  // Liberar todos los locks al desmontar el widget
  useEffect(() => {
    return () => { releaseSlotLocksAction(sessionToken); };
  }, [sessionToken]);

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    // Soft lock: reservar este slot temporalmente para evitar doble-booking
    if (!isAdmin && selectedDate && time) {
      const serviceId = schedulingMode === 'separate'
        ? selectedServices[currentServiceIndex]?.id
        : selectedServices[0]?.id;
      if (serviceId) {
        lockSlotAction({
          tenantId,
          branchId: selectedBranch?.id || branches[0]?.id || '',
          serviceId,
          staffId: selectedStaff?.id || null,
          date: selectedDate,
          time,
          sessionToken,
        });
      }
    }
  };

  const handleConfirmTimes = () => {
    setStep(4);
  };

  const handleFinalCheckout = async () => {
    if (cartBookings.length === 0) {
      console.warn("Cannot checkout: cart is empty");
      return;
    }

    setIsFinishing(true);
    try {
      const militaryTime = formatTimeToMilitary(cartBookings[0].time!);
      const baseStartTime = new Date(`${cartBookings[0].date}T${militaryTime}`);

      let sessionBookingsData: ReturnType<typeof buildBookingEntry>[];

      const buildBookingEntry = (item: typeof cartBookings[0], start: Date) => {
        const end = new Date(start.getTime() + item.service.durationMinutes * 60000);
        return {
          branchId: selectedBranch?.id || branches[0]?.id || '',
          serviceId: item.service.id,
          staffId: item.staff?.id || '',
          startTime: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
          endTime: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
          price: item.service.price,
          isSimultaneous: !!item.service.allowSimultaneous,
          ...(!item.staff?.id ? { allowedStaffIds: displayStaff.map(s => s.id) } : {})
        };
      };

      if (schedulingMode === 'bulk' && simultaneousMode && simulGroups) {
        // Modo simultáneo: agrupar servicios en parejas, luego los no-simultáneos
        const entries: ReturnType<typeof buildBookingEntry>[] = [];
        let groupStart = baseStartTime;
        for (const group of simulGroups) {
          const maxDur = Math.max(...group.map(i => cartBookings[i].service.durationMinutes));
          for (const i of group) {
            entries.push(buildBookingEntry(cartBookings[i], groupStart));
          }
          groupStart = new Date(groupStart.getTime() + maxDur * 60000);
        }
        sessionBookingsData = entries;
      } else {
        // Modo secuencial (bulk o separate): uno tras otro
        let currentStartTime: Date | null = null;
        sessionBookingsData = cartBookings.map((item) => {
          const itemMilitary = formatTimeToMilitary(item.time!);
          const itemBase = new Date(`${item.date}T${itemMilitary}`);
          const actualStart = (schedulingMode === 'bulk' && currentStartTime) ? currentStartTime : itemBase;
          const entry = buildBookingEntry(item, actualStart);
          if (schedulingMode === 'bulk') currentStartTime = new Date(actualStart.getTime() + item.service.durationMinutes * 60000);
          return entry;
        });
      }

      const result = await createBookingSessionAction({
        tenantId: tenantId,
        customerName: guestName,
        customerEmail: guestEmail,
        customerPhone: guestPhone ? `${selectedCountry.prefix} ${guestPhone}` : undefined,
        zoneId: selectedZone?.id,
        notes: guestAddress ? `Dirección: ${guestAddress}\n${guestNotes}` : guestNotes,
        isHomeService: modality === 'domicilio',
        sessionToken,
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
          // Movemos la lógica de redirección al Paso 5 para mostrar primero la confirmación manual
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


  const today = new Date();
  const nextDays = Array.from({ length: 30 }).map((_, i) => {
    const leadDays = modality === 'domicilio' ? (homeServiceLeadDays ?? 7) : 0;
    const d = new Date(today);
    d.setDate(today.getDate() + i + leadDays);

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

  const formatShortDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getBranchSchedule = (date: Date) => {
    const targetBranch = selectedBranch || branches[0];
    const defaultSchedule = { isOpen: true, slots: [] as { open: string; close: string }[] };
    if (!targetBranch?.businessHours) return defaultSchedule;

    try {
      const bh = JSON.parse(targetBranch.businessHours);
      const dateStr = format(date, "yyyy-MM-dd");
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[date.getDay()];

      if (bh.special?.[dateStr]) {
        return {
          isOpen: bh.special[dateStr].isOpen,
          slots: bh.special[dateStr].slots || []
        };
      }

      if (bh.regular?.[dayOfWeek]) {
        return {
          isOpen: bh.regular[dayOfWeek].isOpen,
          slots: bh.regular[dayOfWeek].slots || []
        };
      }

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
    const minDate = isAdmin ? new Date(0) : addDays(todayStart, leadDays);
    const maxDate = addDays(todayStart, (isAdmin ? 365 : 30) + leadDays);

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "yyyy-MM-dd");

        let isPast = isBefore(day, minDate);
        let isTooFar = isAfter(day, maxDate);
        const isOpen = isBranchOpen(day);

        const isToday = formattedDate === format(todayStart, "yyyy-MM-dd");
        if (!isAdmin && !isPast && isToday && leadDays === 0) {
          const schedule = getBranchSchedule(day);
          if (schedule.isOpen && schedule.slots.length > 0) {
            const lastSlot = schedule.slots[schedule.slots.length - 1];
            const [h, m] = lastSlot.close.split(':').map(Number);

            const closingTime = new Date();
            closingTime.setHours(h, m, 0, 0);

            const now = new Date();
            if (now >= closingTime) {
              isPast = true;
            }
          } else {
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
  }, [currentMonth, selectedDate, selectedBranch, branches, modality, homeServiceLeadDays, selectedServices, totalDuration, isAdmin]);

  const brand = primaryColor || '#9333ea';

  return (
    <main
      id={`widget-${tenantId}`}
      className={`flex flex-col items-center justify-start relative overflow-x-hidden ${isAdmin ? 'min-h-screen bg-slate-50 dark:bg-zinc-950' : 'min-h-screen bg-slate-50 dark:bg-black/95'}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
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

      {!isAdmin && coverUrl && (
        <div className="absolute top-0 left-0 w-full h-[30vh] sm:h-[40vh] z-0 overflow-hidden">
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-slate-50 dark:to-black/95"></div>
        </div>
      )}

      {!isAdmin && !coverUrl && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10 mix-blend-screen" style={{ backgroundColor: `${brand}33` }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
        </>
      )}

      <div className={`z-10 w-full max-w-[1400px] flex flex-col ${step < 5 ? 'lg:flex-row' : 'items-center'} gap-8 lg:gap-12 items-start justify-center p-4 sm:p-6 md:p-8 mt-4`}>

        {/* ===== LEFT SIDE ===== */}
        {step < 5 && (
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
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    {heroTitle || tenantName}
                  </h1>
                )}
                {!isAdmin && (
                  <div className="flex gap-2 self-start sm:self-auto bg-white/5 dark:bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-slate-200 dark:border-white/10">
                    <ThemeToggle />
                    <LangToggle />
                  </div>
                )}
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-lg leading-relaxed max-w-xl">
                {heroSubtitle || t("hero_subtitle")}
              </p>

              {/* Redes Sociales */}
              {(instagramUrl || facebookUrl || tiktokUrl) && (
                <div className="flex items-center gap-3 mt-4">
                  {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:text-purple-600 transition-all text-slate-400 shadow-sm"><Instagram className="w-5 h-5" /></a>}
                  {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 transition-all text-slate-400 shadow-sm"><Facebook className="w-5 h-5" /></a>}
                  {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all text-slate-400 shadow-sm"><Music className="w-5 h-5" /></a>}
                </div>
              )}
            </div>

            {/* Appointment Summary Card */}
            {(modality || selectedServices.length > 0) && (
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-xl">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">{t("your_appointment")}</h3>
                  
                  {modality && (
                    <div className="flex items-start gap-3 text-slate-900 dark:text-white animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        {modality === 'domicilio' ? <Truck className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-0.5">
                          {modality === 'domicilio' ? t("home_address") : "Sucursal"}
                        </p>
                        <p className="font-bold text-sm leading-tight">
                          {modality === 'domicilio' ? "Servicio a domicilio" : (selectedBranch?.name || "Seleccionar sucursal")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedServices.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Servicios seleccionados</h3>
                    <div className="space-y-3">
                      {selectedServices.map((s, idx) => {
                        const booking = cartBookings[idx];
                        return (
                          <div key={`${s.id}-${idx}`} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <Check className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{s.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-400">{s.durationMinutes} min</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resumen Box matches the screenshot exactly */}
                {selectedServices.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-4">
                    <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-inner">
                      <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-[0.2em] mb-3 text-center uppercase">{t("resume")}</p>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                          ${(servicesTotal + sidebarTransferTotal).toFixed(2)}
                        </p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {totalDuration} min · {selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          // ===== END LEFT SIDE =====
        )}

        {/* ===== RIGHT SIDE: Interactive Booking Widget ===== */}
        <div className={`w-full ${step < 5 ? 'flex-[1.5]' : 'max-w-5xl text-center'} bg-white/95 dark:bg-zinc-950/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-5 sm:p-7 shadow-2xl relative min-h-[550px] flex flex-col rounded-3xl overflow-hidden text-left`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 rounded-3xl pointer-events-none"></div>

          {/* STEP 1: Branch & Modality */}
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
                        <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("home_service_desc", { days: homeServiceLeadDays ?? 7 })}</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 1.1: Zone Selection (Home Service only) */}
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
                  <p className="text-xs text-slate-500 mt-1">{t('home_service_desc', { days: homeServiceLeadDays ?? 7 })}</p>
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
                          <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">{zone.description || "COBERTURA DISPONIBLE"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-emerald-500 text-xl font-black tracking-tighter">+${zone.fee}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Traslado</p>
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

          {/* STEP 2: Select Service */}
          {step === 2 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setStep(1);
                    releaseSlotLocksAction(sessionToken);
                    // Limpiar servicios al volver para evitar servicios incompatibles con la nueva modalidad
                    setSelectedServices([]);
                    setCartBookings([]);
                    setSchedulingMode(null);
                    setSimultaneousMode(null);
                    setShowSimultaneousPrompt(false);
                    setSimulGroups(null);
                  }}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {bookingSettings?.step2Title || t("title_service")}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">
                    {t("select_multiple_services")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-2 custom-scrollbar items-start content-start w-full">
                {displayServices.map((srv) => {
                  const isSelected = selectedServices.some(s => s.id === srv.id);
                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleToggleService(srv)}
                      className={`w-full p-6 bg-white dark:bg-white/5 border-2 rounded-3xl text-left transition-all duration-300 group shadow-lg flex flex-col relative ${isSelected
                        ? 'border-purple-500 bg-purple-500/10 shadow-[0_15px_40px_rgba(139,92,246,0.15)] ring-1 ring-purple-500/20'
                        : 'border-slate-100 dark:border-white/5 hover:border-purple-500/40 hover:shadow-xl'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-5 right-5 bg-purple-600 text-white p-1 rounded-full shadow-lg animate-in zoom-in-50 duration-300">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1 mb-5">
                        <h3 className={`text-xl font-black transition-colors tracking-tight ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white group-hover:text-purple-500'}`}>
                          {srv.name}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-purple-500 dark:text-purple-400 font-black text-xl">${parsePrice(srv.price).toFixed(2)}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800"></span>
                          <span className="flex items-center gap-1.5 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" /> {srv.durationMinutes} min
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5 pt-5 border-t border-slate-100 dark:border-white/5 w-full">
                        {srv.includes && srv.includes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-zinc-500">{t("includes")}</span>
                            </div>
                            <ul className="grid grid-cols-1 gap-2 pl-1">
                              {srv.includes.map((inc, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-300 leading-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0"></span>
                                  {inc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {srv.excludes && srv.excludes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-rose-500" />
                              </div>
                              <span className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-zinc-500">{t("excludes")}</span>
                            </div>
                            <ul className="grid grid-cols-1 gap-2 pl-1">
                              {srv.excludes.map((exc, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-slate-500/60 dark:text-zinc-400/60 leading-tight italic">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500/30 mt-1.5 shrink-0"></span>
                                  {exc}
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
                            setStep(2.5);
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

          {/* STEP 2.5: Choose Scheduling Mode */}
          {step === 2.5 && (
            <div className="relative z-10 flex flex-col w-full flex-1 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 mb-8">
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

              <div className="flex-1 flex flex-col justify-center gap-5">
                {/* Opción: Todo seguido */}
                <button
                  onClick={() => {
                    setSchedulingMode('bulk');
                    if (hasSomeSimultaneous && modality !== 'domicilio') {
                      setShowSimultaneousPrompt(true);
                    } else {
                      setSimultaneousMode(false);
                      setStep(3);
                    }
                  }}
                  className={`w-full p-7 bg-white dark:bg-white/5 border shadow-lg text-left flex items-center gap-5 transition-all duration-300 group rounded-2xl ${
                    showSimultaneousPrompt
                      ? 'border-purple-500/50 bg-purple-500/5 dark:bg-purple-500/10'
                      : 'hover:bg-purple-500/10 border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                  }`}
                >
                  <div className="bg-purple-500/20 p-4 rounded-full text-purple-400 group-hover:scale-110 transition-transform shrink-0"><Layers className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-purple-400">Todo seguido (Recomendado)</h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-sm mt-1">Realiza todos tus servicios en una sola visita, uno tras otro.</p>
                  </div>
                </button>

                {/* Sub-prompt: ¿servicios en simultaneo? */}
                {showSimultaneousPrompt && (
                  <div className="animate-in slide-in-from-top-2 duration-300 p-5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-2xl space-y-4">
                    <div className="flex items-start gap-3">
                      <Layers className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                          ¡Tenemos una opción para ahorrarte tiempo!
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          Algunos de tus servicios pueden realizarse al mismo tiempo con diferentes especialistas. ¿Deseas programarlos de forma simultánea?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSimultaneousMode(true);
                          setSimulGroups(computeSimulGroups(selectedServices));
                          setShowSimultaneousPrompt(false);
                          setStep(3);
                        }}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-black tracking-wide transition-all active:scale-95"
                      >
                        Sí, al mismo tiempo
                      </button>
                      <button
                        onClick={() => {
                          setSimultaneousMode(false);
                          setSimulGroups(null);
                          setShowSimultaneousPrompt(false);
                          setStep(3);
                        }}
                        className="flex-1 py-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-black tracking-wide transition-all active:scale-95"
                      >
                        No, uno tras otro
                      </button>
                    </div>
                  </div>
                )}

                {/* Opción: En días u horas distintas */}
                <button
                  onClick={() => { setSchedulingMode('separate'); setShowSimultaneousPrompt(false); setSimultaneousMode(null); setStep(3); setCurrentServiceIndex(0); }}
                  className="w-full p-7 bg-white dark:bg-white/5 hover:bg-blue-500/10 border border-slate-200 dark:border-white/10 hover:border-blue-500/40 rounded-2xl flex items-center gap-5 transition-all duration-300 group shadow-lg text-left"
                >
                  <div className="bg-blue-500/20 p-4 rounded-full text-blue-400 group-hover:scale-110 transition-transform shrink-0"><CalendarRange className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-400">En días u horas distintas</h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-sm mt-1">Elige una fecha y especialista diferente para cada servicio.</p>
                  </div>
                </button>

                {!canUseFeature(tenantPlan, 'separateServiceScheduling') && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      El agendamiento dividido es una función PRO. Actualiza tu suscripción para activarla.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Select Date & Time (and STAFF) */}
          {step === 3 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => {
                    if (schedulingMode === 'separate' && currentServiceIndex > 0) {
                      const prevIndex = currentServiceIndex - 1;
                      const prevBooking = cartBookings[prevIndex];
                      const removedBooking = cartBookings[cartBookings.length - 1];
                      if (removedBooking) releaseServiceSlotLockAction(sessionToken, removedBooking.service.id);
                      setCurrentServiceIndex(prevIndex);
                      setSelectedDate(prevBooking.date);
                      setSelectedTime(prevBooking.time);
                      setSelectedStaff(prevBooking.staff);
                      setCartBookings(prev => prev.slice(0, -1));
                    } else {
                      setStep(2);
                      setSelectedTime(null);
                      setSelectedStaff(null);
                    }
                  }}
                  className="p-2 bg-white dark:bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {schedulingMode === 'separate'
                    ? `Cita ${currentServiceIndex + 1} de ${selectedServices.length}`
                    : (bookingSettings?.step3Title || t("title_specialist"))
                  }
                </h2>
              </div>

              {/* Service context banner — always visible so the client knows exactly what they're booking */}
              {selectedServices.length > 0 && (
                <div className="w-full mb-6 p-1.5 bg-purple-500/5 dark:bg-white/5 border border-purple-500/10 dark:border-white/10 rounded-2xl flex items-center gap-2">
                  <div className="bg-purple-600 px-4 py-1.5 rounded-xl shadow-lg shadow-purple-500/20">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">AGENDANDO:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-2">
                    {schedulingMode === 'separate' ? (
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {selectedServices[currentServiceIndex]?.name}
                      </span>
                    ) : (
                      selectedServices.map((s, i) => (
                        <span key={s.id} className="flex items-center gap-1.5 text-sm font-bold text-purple-600 dark:text-purple-400">
                          {i > 0 && <span className="text-slate-300 dark:text-zinc-600 font-normal">+</span>}
                          {s.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 flex-1">
                {/* STAFF SELECTION */}
                {showStaffSelection !== false && (
                <div>
                  <div className="flex flex-wrap gap-4 pb-2 px-0.5">
                    <button
                      onClick={() => handleSelectStaff(null)}
                      className={`flex flex-col items-center gap-2 group transition-all duration-300 ${selectedStaff === null
                        ? 'scale-105'
                        : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all duration-300 ${selectedStaff === null
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-4 ring-amber-500/20'
                        : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400'
                        }`}>
                        ✨
                      </div>
                      <span className={`text-xs font-black tracking-tight ${selectedStaff === null ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {t("anyone")}
                      </span>
                    </button>

                    {displayStaff.map((member) => {
                      const isSelected = selectedStaff?.id === member.id;
                      return (
                        <button
                          key={member.id}
                          onClick={() => handleSelectStaff(member)}
                          className={`flex flex-col items-center gap-2 group transition-all duration-300 ${isSelected
                            ? 'scale-105'
                            : 'opacity-60 hover:opacity-100'
                            }`}
                        >
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-black shadow-lg transition-all duration-300 ${isSelected
                            ? 'bg-purple-600 text-white ring-4 ring-purple-500/20'
                            : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500'
                            }`}>
                            {member.name.charAt(0)}
                          </div>
                          <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                            {member.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8 w-full">
                  {/* DATE SELECTION - Interactive Calendar */}
                  <div className="w-full lg:w-[320px] flex flex-col shrink-0">
                    <p className="text-xs font-black text-slate-400 dark:text-zinc-500 tracking-widest mb-3 uppercase">
                      {modality === 'domicilio' ? t("dates_home", { days: homeServiceLeadDays ?? 7 }) : t("dates")}
                    </p>

                    <div className="bg-white dark:bg-white/5 rounded-[32px] border border-slate-200 dark:border-white/10 p-4 sm:p-7 shadow-xl relative group w-full overflow-hidden">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-base font-black capitalize text-slate-900 dark:text-white truncate pr-2 tracking-tight">
                          {format(currentMonth, "MMMM yyyy", { locale: es })}
                        </h3>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={prevMonth} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-100 dark:border-white/10">
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <button onClick={nextMonth} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-100 dark:border-white/10">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 mb-6">
                        {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(d => (
                          <div key={d} className="text-[10px] font-black text-slate-400 dark:text-zinc-500 text-center tracking-[0.1em]">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {calendarDays.flat().map((d, i) => (
                          <button
                            key={i}
                            disabled={d.isDisabled}
                            onClick={() => {
                              setSelectedDate(d.formattedDate);
                              if (!d.isCurrentMonth) {
                                setCurrentMonth(startOfMonth(d.day));
                              }
                            }}
                            className={`
                              h-10 sm:h-12 text-sm font-bold rounded-2xl transition-all duration-300 relative flex items-center justify-center
                              ${d.isDisabled ? 'text-slate-200 dark:text-zinc-800 cursor-not-allowed opacity-30 shadow-none' : ''}
                              ${!d.isCurrentMonth ? 'opacity-20' : ''}
                              ${d.isClosed ? 'bg-rose-500/5 text-rose-500/30' : ''}
                              ${d.isSelected
                                ? '!text-white scale-105 z-10'
                                : d.isDisabled ? '' : 'bg-transparent text-slate-700 dark:text-zinc-200 hover:bg-purple-500/5'}
                            `}
                            style={d.isSelected ? { backgroundColor: brand, boxShadow: `0 10px 25px ${brand}50` } : {}}
                          >
                            {format(d.day, "d")}
                            {d.isClosed && !d.isSelected && <div className="absolute bottom-2 w-1 h-1 bg-rose-400 rounded-full"></div>}
                            {!d.isDisabled && !d.isSelected && <div className="absolute bottom-2 w-1 h-1 bg-purple-500/20 rounded-full"></div>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Buttons - desktop only, mobile version is below the time slots */}
                    <div className="hidden lg:grid grid-cols-2 gap-2 sm:gap-4 mt-6 sm:mt-8">
                      <button
                        onClick={() => {
                          if (schedulingMode === 'separate' && currentServiceIndex > 0) {
                            const prevIndex = currentServiceIndex - 1;
                            const prevBooking = cartBookings[prevIndex];
                            setCurrentServiceIndex(prevIndex);
                            setSelectedDate(prevBooking.date);
                            setSelectedTime(prevBooking.time);
                            setSelectedStaff(prevBooking.staff);
                            setCartBookings(prev => prev.slice(0, -1));
                          } else {
                            setStep(2);
                            setSelectedTime(null);
                            setSelectedStaff(null);
                          }
                        }}
                        className="py-4 px-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-2 border-slate-100 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl font-black tracking-widest uppercase transition-all text-xs shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4 shrink-0" /> {t("back")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (schedulingMode === 'separate') {
                            const newBooking = { service: selectedServices[currentServiceIndex], staff: selectedStaff, date: selectedDate, time: selectedTime };
                            setCartBookings(prev => [...prev, newBooking]);
                            if (currentServiceIndex < selectedServices.length - 1) {
                              setCurrentServiceIndex(prev => prev + 1);
                              setSelectedDate(null); setSelectedTime(null); setSelectedStaff(null);
                            } else { setStep(4); }
                          } else {
                            const bookingsInBulk = selectedServices.map((s) => ({ service: s, staff: selectedStaff, date: selectedDate, time: selectedTime }));
                            setCartBookings(bookingsInBulk); setStep(4);
                          }
                        }}
                        disabled={!selectedTime || !selectedDate}
                        className="py-4 px-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-zinc-700 text-white rounded-2xl font-black tracking-widest uppercase transition-all shadow-2xl active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                      >
                        {schedulingMode === 'separate' && currentServiceIndex < selectedServices.length - 1 ? 'Siguiente' : t("continue")} <ChevronRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* TIME SELECTION */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex flex-col bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-4 sm:p-6 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Horarios Disponibles
                      </h3>

                      <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar pr-1 space-y-6">
                        {isLoadingTimes ? (
                          <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculando...</p>
                          </div>
                        ) : errorType || (selectedDate && availableTimes.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-rose-500/5 dark:bg-rose-500/10 border-2 border-dashed border-rose-500/20 rounded-3xl">
                            <XCircle className="w-10 h-10 mb-4 text-rose-500/30" />
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Sin disponibilidad</p>
                          </div>
                        ) : !selectedDate ? (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-zinc-800 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-3xl">
                            <Calendar className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Elige una fecha</p>
                          </div>
                        ) : (
                          <>
                            {[
                              { label: "MAÑANA", icon: "🌅", range: [0, 11] },
                              { label: "TARDE", icon: "☀️", range: [12, 17] },
                              { label: "NOCHE", icon: "🌙", range: [18, 23] }
                            ].map((section) => {
                              const sectionTimes = (availableTimes as any[]).filter(t => { 
                                const h = parseInt(t.time.split(':')[0], 10); 
                                const isPM = t.time.includes('PM');
                                const militaryH = (isPM && h !== 12) ? h + 12 : (!isPM && h === 12) ? 0 : h;
                                return militaryH >= section.range[0] && militaryH <= section.range[1]; 
                              });
                              if (sectionTimes.length === 0) return null;
                              const isOpen = openTimeSections.has(section.label);
                              const availableCount = sectionTimes.filter((t: any) => t.available).length;

                              return (
                                <div key={section.label} className="space-y-4">
                                  <button
                                    onClick={() => setOpenTimeSections(prev => {
                                      const next = new Set(prev);
                                      if (next.has(section.label)) next.delete(section.label);
                                      else next.add(section.label);
                                      return next;
                                    })}
                                    className="w-full flex items-center justify-between group transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black tracking-widest text-slate-900 dark:text-white uppercase">{section.label}</span>
                                      <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{availableCount} libres</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                                  </button>
                                  
                                  {isOpen && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                      {sectionTimes.map(({ time, available }: { time: string, available: boolean }) => (
                                        <button
                                          key={time}
                                          onClick={() => available && setSelectedTime(time)}
                                          disabled={!available}
                                          className={`
                                            py-2.5 px-4 rounded-xl transition-all duration-200 border-2 font-black text-sm
                                            ${!available ? "hidden" : 
                                              selectedTime === time 
                                              ? "text-white border-transparent shadow-lg shadow-purple-500/30 scale-[1.02]" 
                                              : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:border-purple-500/30 hover:bg-purple-500/5"}
                                          `}
                                          style={selectedTime === time ? { backgroundColor: brand } : {}}
                                        >
                                          {formatTo12h(time)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
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

              {/* Mobile-only nav buttons - appear below time slots */}
              <div className="lg:hidden grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => {
                    if (schedulingMode === 'separate' && currentServiceIndex > 0) {
                      const prevIndex = currentServiceIndex - 1;
                      const prevBooking = cartBookings[prevIndex];
                      const removedBooking = cartBookings[cartBookings.length - 1];
                      if (removedBooking) releaseServiceSlotLockAction(sessionToken, removedBooking.service.id);
                      setCurrentServiceIndex(prevIndex);
                      setSelectedDate(prevBooking.date);
                      setSelectedTime(prevBooking.time);
                      setSelectedStaff(prevBooking.staff);
                      setCartBookings(prev => prev.slice(0, -1));
                    } else {
                      setStep(2);
                      setSelectedTime(null);
                      setSelectedStaff(null);
                    }
                  }}
                  className="py-4 px-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-2 border-slate-100 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl font-black tracking-widest uppercase transition-all text-xs shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" /> {t("back")}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (schedulingMode === 'separate') {
                      const newBooking = { service: selectedServices[currentServiceIndex], staff: selectedStaff, date: selectedDate, time: selectedTime };
                      setCartBookings(prev => [...prev, newBooking]);
                      if (currentServiceIndex < selectedServices.length - 1) {
                        setCurrentServiceIndex(prev => prev + 1);
                        setSelectedDate(null); setSelectedTime(null); setSelectedStaff(null);
                      } else { setStep(4); }
                    } else {
                      const bookingsInBulk = selectedServices.map((s) => ({ service: s, staff: selectedStaff, date: selectedDate, time: selectedTime }));
                      setCartBookings(bookingsInBulk); setStep(4);
                    }
                  }}
                  disabled={!selectedTime || !selectedDate}
                  className="py-4 px-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-zinc-700 text-white rounded-2xl font-black tracking-widest uppercase transition-all shadow-2xl active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                >
                  {schedulingMode === 'separate' && currentServiceIndex < selectedServices.length - 1 ? 'Siguiente' : t("continue")} <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Guest Form */}
          {step === 4 && (
            <div className="relative z-10 flex flex-col w-full items-start animate-in fade-in slide-in-from-right-8 duration-500 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setStep(3);
                    setCartBookings(prev => prev.slice(0, -1));
                  }}
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
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre y Apellido" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">{t("email")}</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={t("email_placeholder")} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
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
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value.replace(/\D/g, ''))} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                    </div>
                  </div>
                </div>

                {modality === 'domicilio' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-2">
                      {t("address")}
                    </label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        value={guestAddress}
                        onChange={e => setGuestAddress(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                )}

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
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                      <button
                        type="button"
                        onClick={() => setTermsExpanded(prev => !prev)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                      >
                        Términos y condiciones del servicio a domicilio
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${termsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {termsExpanded && (
                        <p className="text-sm text-slate-600 dark:text-zinc-300 italic whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                          {homeServiceTerms || t("home_service_terms_default")}
                        </p>
                      )}
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div
                            className="w-6 h-6 border-2 border-slate-300 dark:border-white/20 rounded-md transition-all"
                            style={agreedToTerms ? { backgroundColor: brand, borderColor: brand } : {}}
                          ></div>
                          <Check className="w-4 h-4 absolute inset-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
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
                  {modality === 'domicilio' ? t("finish_booking") : t("finish_booking")}
                </button>
              </div>
            </div>
          )}

           {/* STEP 5: Success Screen */}
           {step === 5 && (
            <div className="relative z-10 flex flex-col w-full items-center justify-start text-center animate-in fade-in zoom-in-95 duration-700 pt-2">
              <div className={`w-16 h-16 ${modality === 'domicilio' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] text-purple-400'} border rounded-full flex items-center justify-center mb-3`}>
                <Check className="w-10 h-10" />
              </div>

              <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                {modality === 'domicilio' ? "¡Reserva exitosa!" : t("success")}
              </h1>

              <div className="space-y-4 text-slate-600 dark:text-zinc-300 mb-6 max-w-5xl w-full">
                <p className="text-sm px-4">
                  {modality === 'domicilio'
                    ? `Hola ${guestName.split(' ')[0]}, tu cita a domicilio está confirmada. En caso de alguna duda nos estaremos contactando contigo.`
                    : t("success_desc", { name: guestName.split(' ')[0], branch: selectedBranch?.name || '', service: selectedServices.map(s => s.name).join(", ") })
                  }
                </p>

                <div className="flex flex-col md:flex-row gap-6 items-stretch w-full mt-6 px-4 text-left">
                  {/* Summary Side */}
                  <div className="flex-[1.5] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <h2 className="text-xs uppercase font-black tracking-widest text-slate-400">{t("selected_services")}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {cartBookings.map((b, idx) => {
                        // Compute actual start time considering sequential or simultaneous grouping
                        let actualStartTime: Date;
                        if (schedulingMode === 'bulk') {
                          actualStartTime = getSimulStartTime(idx);
                        } else {
                          actualStartTime = new Date(`${b.date}T${formatTimeToMilitary(b.time!)}`);
                        }

                        // Badge: is this service part of a simultaneous group?
                        const isInSimulGroup = simultaneousMode && simulGroups
                          ? simulGroups.some(g => g.length > 1 && g.includes(idx))
                          : false;

                        // Logic to check if this service starts a new transfer block
                        let showsTransferInCard = false;
                        if (modality === 'domicilio' && selectedZone) {
                          if (idx === 0) showsTransferInCard = true;
                          else {
                            const prev = cartBookings[idx - 1];
                            const prevEndTime = new Date(`${prev.date}T${formatTimeToMilitary(prev.time!)}`).getTime() + (prev.service.durationMinutes * 60000);
                            const currStartTime = new Date(`${b.date}T${formatTimeToMilitary(b.time!)}`).getTime();
                            if (prev.date !== b.date || prev.staff?.id !== b.staff?.id || currStartTime > prevEndTime) {
                              showsTransferInCard = true;
                            }
                          }
                        }

                        // In bulk mode: only show calendar button on first card; it covers total duration
                        const isBulkSession = schedulingMode === 'bulk' && cartBookings.length > 1;
                        const showCalendarBtn = !isBulkSession || idx === 0;
                        const calStart = isBulkSession && idx === 0
                          ? new Date(`${cartBookings[0].date}T${formatTimeToMilitary(cartBookings[0].time!)}`)
                          : actualStartTime;
                        const calEnd = isBulkSession && idx === 0
                          ? (() => {
                              const totalMs = (simultaneousMode && simulGroups)
                                ? simulGroups.reduce((t, g) => t + Math.max(...g.map(i => cartBookings[i]?.service.durationMinutes ?? 0)) * 60000, 0)
                                : cartBookings.reduce((acc, bk) => acc + bk.service.durationMinutes * 60000, 0);
                              return new Date(calStart.getTime() + totalMs);
                            })()
                          : new Date(actualStartTime.getTime() + b.service.durationMinutes * 60000);
                        const calTitle = isBulkSession && idx === 0
                          ? `${cartBookings.map(bk => bk.service.name).join(' + ')} @ ${tenantName}`
                          : `${b.service.name} @ ${tenantName}`;

                        return (
                          <div key={idx} className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-3 hover:border-purple-500/30 transition-all shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-black text-purple-500">{idx + 1}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">{b.service.name}</h3>
                                    {isInSimulGroup && (
                                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
                                        Simultáneo
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <div className="flex items-center gap-1 text-xs font-bold text-purple-500">
                                      <Calendar className="w-3 h-3" />
                                      {formatShortDate(b.date!)}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-zinc-400">
                                      <Clock className="w-3 h-3 text-slate-400" /> {formatTo12h(format(actualStartTime, 'HH:mm') + ':00')}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                      <User className="w-3 h-3" /> {b.staff?.name || t("any_staff")}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400/70">
                                      <Clock className="w-3 h-3" /> {b.service.durationMinutes} min
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <p className="text-sm font-black text-slate-900 dark:text-white">${parsePrice(b.service.price).toFixed(2)}</p>
                                {showsTransferInCard && (
                                  <div className="flex items-center gap-1 text-emerald-500">
                                    <Truck className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                                      +${parsePrice(selectedZone?.fee).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {showCalendarBtn && (
                                  <div className="relative group/sync">
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white/10 hover:bg-purple-600 dark:hover:bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                                      <Download className="w-3 h-3" />
                                      <span className="hidden sm:inline">{t("sync_calendar")}</span>
                                    </button>
                                    <div className="absolute right-0 bottom-full mb-3 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover/sync:opacity-100 group-hover/sync:visible transition-all z-[99] p-2 ring-1 ring-black/5">
                                      <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 mb-1">{t("choose_platform")}</p>
                                      <a
                                        href={getGoogleCalendarUrl({ title: calTitle, description: `Especialista: ${b.staff?.name || 'Cualquiera'}\nCliente: ${guestName}`, location: guestAddress || (selectedBranch as any)?.address || 'Servicio a domicilio', startTime: calStart, endTime: calEnd })}
                                        target="_blank"
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-500/10 hover:text-purple-500 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors"
                                      >
                                        <Globe className="w-4 h-4" /> Google Calendar
                                      </a>
                                      <a
                                        href={getOutlookCalendarUrl({ title: calTitle, description: `Especialista: ${b.staff?.name || 'Cualquiera'}\nCliente: ${guestName}`, location: guestAddress || (selectedBranch as any)?.address || 'Servicio a domicilio', startTime: calStart, endTime: calEnd })}
                                        target="_blank"
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors"
                                      >
                                        <Mail className="w-4 h-4" /> Outlook (Web)
                                      </a>
                                      <button
                                        onClick={() => {
                                          const icsContent = [
                                            'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
                                            `DTSTART:${calStart.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                                            `DTEND:${calEnd.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                                            `SUMMARY:${calTitle}`,
                                            `DESCRIPTION:Especialista: ${b.staff?.name || 'Cualquiera'}`,
                                            `LOCATION:${guestAddress || (selectedBranch as any)?.address || 'Servicio a domicilio'}`,
                                            'END:VEVENT', 'END:VCALENDAR'
                                          ].join('\n');
                                          const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                          const link = document.createElement('a');
                                          link.href = window.URL.createObjectURL(blob);
                                          link.setAttribute('download', `cita-${tenantName.toLowerCase()}.ics`);
                                          document.body.appendChild(link); link.click(); document.body.removeChild(link);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 text-left transition-colors"
                                      >
                                        <Download className="w-4 h-4" /> Apple / iOS
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pricing Breakdown Card */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 mt-3 shadow-sm">
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-slate-500">
                          <p className="text-xs font-black uppercase tracking-[0.2em]">{t("subtotal_services")}</p>
                          <p className="text-sm font-black">${servicesTotal.toFixed(2)}</p>
                        </div>
                        {transferTotal > 0 && (
                          <div className="flex flex-col gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                              <p className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Truck className="w-4 h-4" /> {t("transfer_fee")}
                              </p>
                              <p className="text-sm font-black">${transferTotal.toFixed(2)}</p>
                            </div>
                            {transferInfo.blocks > 1 && (
                              <div className="pt-2 border-t border-emerald-500/10">
                                <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest leading-relaxed">
                                  {t("transfer_fee_detail", { count: transferInfo.blocks, fee: parsePrice(selectedZone?.fee).toFixed(2) })}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-5 border-t border-slate-200 dark:border-white/10">
                        <div>
                          <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase mb-1">{t("total_to_pay")}</p>
                          <p className="text-[10px] font-bold text-slate-400 opacity-60 uppercase">{t("tax_included")}</p>
                        </div>
                        <p className="text-4xl font-black text-purple-600 dark:text-purple-400 tracking-tighter">${totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Side */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCircle className="w-4 h-4 text-emerald-500" />
                      <h2 className="text-xs uppercase font-black tracking-widest text-slate-400">{t("title_data")}</h2>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs uppercase font-black tracking-widest text-slate-400">{t("customer")}</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{guestName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs uppercase font-black tracking-widest text-slate-400">{t("contact")}</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{`${selectedCountry.prefix} ${guestPhone}`}</p>
                          </div>
                        </div>

                        {guestEmail && (
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs uppercase font-black tracking-widest text-slate-400">{t("email_label")}</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight break-all">{guestEmail}</p>
                            </div>
                          </div>
                        )}

                        {modality === 'domicilio' && guestAddress && (
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs uppercase font-black tracking-widest text-slate-400">{t("address")}</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{guestAddress}</p>
                              <p className="text-xs font-bold text-emerald-500 mt-1 uppercase tracking-tighter">Zona: {selectedZone?.name}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-300" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {modality === 'domicilio' ? 'Servicio a domicilio' : selectedBranch?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-5xl px-4 mt-2">
                <button
                  onClick={() => {
                    if (isAdmin && onBookingCreated) {
                      onBookingCreated();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="flex-1 py-5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl font-black tracking-[0.2em] uppercase transition-all text-xs shadow-sm shadow-black/5 active:scale-[0.98]"
                >
                  {isAdmin ? 'Volver al Calendario' : t("back_to_start")}
                </button>
              </div>
            </div>
          )}

          {/* Persistent Widget Footer */}
          {bookingSettings?.footerText && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 text-center">
              <p className="text-xs text-slate-500 dark:text-zinc-500 whitespace-pre-wrap leading-relaxed opacity-80 max-w-2xl mx-auto">
                {bookingSettings.footerText}
              </p>
            </div>
          )}

        </div>
        {/* ===== END RIGHT SIDE ===== */}

      </div>
    </main>
  );
}