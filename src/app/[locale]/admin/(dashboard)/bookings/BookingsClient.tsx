"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
const BookingWidget = lazy(() => import('@/components/BookingWidget'));
import { 
  Calendar, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Sparkles, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Clock3,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MapPin,
  Copy,
  Check,
  Loader2,
  Plus,
  Minus,
  Briefcase,
  FileText,
  Truck,
  Layers,
  CalendarRange,
  MessageSquare
} from 'lucide-react';
import { updateBookingAction, deleteBookingAction, createBookingAction, createBookingSessionAction, getAvailableSlots } from "@/app/actions/booking";
import { useRouter } from "next/navigation";
import { 
  format, 
  parse, 
  addMinutes, 
  startOfDay, 
  endOfDay, 
  isSameDay, 
  addDays, 
  subDays, 
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval 
} from "date-fns";
import { es, enUS } from "date-fns/locale";

import PhoneInput from "@/components/PhoneInput";
import { useTranslations, useLocale } from "next-intl";
import { Portal } from "@/components/Portal";

export default function BookingsClient({ 
  initialBookings,
  services,
  staff,
  branches,
  coverageZones = [],
  tenantId,
  tenantSettings
}: { 
  initialBookings: any[],
  services: any[],
  staff: any[],
  branches: any[],
  coverageZones?: any[],
  tenantId: string,
  tenantSettings: any
}) {
  const t = useTranslations('Dashboard.bookings');
  const localeStr = useLocale();
  const dateLocale = localeStr === 'es' ? es : enUS;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Todas");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const travelTime: number = (tenantSettings as any)?.homeServiceTravelTime ?? 0;

  // Auto-refresh: actualiza las citas cada 20 segundos sin que el admin tenga que recargar
  useEffect(() => {
    const interval = setInterval(() => { router.refresh(); }, 20000);
    return () => clearInterval(interval);
  }, [router]);

  // Helper: separa la dirección del domicilio de los comentarios reales del cliente
  const parseBookingNotes = (notes: string | null | undefined): { address: string; clientNotes: string } => {
    if (!notes) return { address: '', clientNotes: '' };
    if (notes.startsWith('Dirección: ')) {
      const newlineIdx = notes.indexOf('\n');
      if (newlineIdx === -1) return { address: notes.slice('Dirección: '.length), clientNotes: '' };
      return { address: notes.slice('Dirección: '.length, newlineIdx), clientNotes: notes.slice(newlineIdx + 1) };
    }
    return { address: '', clientNotes: notes };
  };

  // Helper: ¿tiene comentarios reales del cliente (no solo dirección)?
  const bookingHasClientNotes = (booking: any): boolean => {
    if (!booking.notes || !booking.notes.trim()) return false;
    if (booking.isHomeService) return parseBookingNotes(booking.notes).clientNotes.trim().length > 0;
    return booking.notes.trim().length > 0;
  };

  // Pre-calcula el contexto de buffer de traslado por booking.
  // Dos citas son "consecutivas" (mismo viaje) si: mismo staff, mismo día y sin hueco entre ellas.
  // Si NO son consecutivas, cada cita necesita buffer antes (ir) Y después (volver) de forma independiente.
  const homeServiceBufferCtx = (() => {
    const map = new Map<string, { showPre: boolean; showPost: boolean }>();
    const groups = new Map<string, any[]>();
    initialBookings.forEach(b => {
      if (!b.isHomeService) return;
      const key = b.sessionId || b.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    groups.forEach(group => {
      const sorted = [...group].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      sorted.forEach((b, i) => {
        const prev = i > 0 ? sorted[i - 1] : null;
        const next = i < sorted.length - 1 ? sorted[i + 1] : null;
        const sameDay = (a: any, b: any) =>
          new Date(a.startTime).toISOString().slice(0, 10) === new Date(b.startTime).toISOString().slice(0, 10);
        const isConsecutiveWith = (a: any, b: any) =>
          sameDay(a, b) &&
          a.staffId === b.staffId &&
          new Date(a.endTime).getTime() >= new Date(b.startTime).getTime() - travelTime * 60000;
        map.set(b.id, {
          showPre:  !prev || !isConsecutiveWith(prev, b),
          showPost: !next || !isConsecutiveWith(b, next),
        });
      });
    });
    return map;
  })();

  // Hora más temprana de apertura entre todas las sucursales
  const calendarStartHour = (() => {
    let earliest = 8; // fallback
    for (const branch of branches) {
      try {
        const bh = JSON.parse(branch.businessHours || '{}');
        const regular: Record<string, any> = bh.regular || {};
        for (const day of Object.values(regular)) {
          if ((day as any).isOpen && (day as any).slots?.length > 0) {
            const openHour = parseInt((day as any).slots[0].open.split(':')[0], 10);
            if (!isNaN(openHour) && openHour < earliest) earliest = openHour;
          }
        }
      } catch { /* ignore */ }
    }
    return earliest;
  })();

  // Hora más tardía de cierre entre todas las sucursales
  const calendarEndHour = (() => {
    let latest = 22; // fallback
    for (const branch of branches) {
      try {
        const bh = JSON.parse(branch.businessHours || '{}');
        const regular: Record<string, any> = bh.regular || {};
        for (const day of Object.values(regular)) {
          const slots: any[] = (day as any).slots || [];
          if ((day as any).isOpen && slots.length > 0) {
            const lastSlot = slots[slots.length - 1];
            const closeHour = parseInt(lastSlot.close.split(':')[0], 10);
            if (!isNaN(closeHour) && closeHour > latest) latest = closeHour;
          }
        }
      } catch { /* ignore */ }
    }
    return latest;
  })();

  // Total de horas visibles en el calendario
  const calendarHours = calendarEndHour - calendarStartHour;

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    status: "CONFIRMED",
    serviceId: services[0]?.id || "",
    staffId: staff[0]?.id || "",
    branchId: staff[0]?.branchId || "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    durationMinutes: services[0]?.durationMinutes || 30,
    notes: "",
    homeAddress: "" // Dirección de atención (solo para servicio a domicilio, read-only)
  });

  const isPastBooking = (() => {
    try {
      const start = parse(`${formData.date} ${formData.time}`, "yyyy-MM-dd HH:mm", new Date());
      return start < new Date();
    } catch {
      return false;
    }
  })();

  const [durationInput, setDurationInput] = useState(formData.durationMinutes.toString());
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [overlapInfo, setOverlapInfo] = useState<any | null>(null);
  
  // -- NUEVOS ESTADOS PARA MULTI-SERVICIO Y DOMICILIO --
  const [modalStep, setModalStep] = useState(1); // 1: Cliente info, 2: Servicios, 3: Modalidad, 4: Agendamiento, 5: Resumen
  const [selectedServicesList, setSelectedServicesList] = useState<any[]>([]); // Servicios seleccionados en el Paso 2
  const [modality, setModality] = useState<'local' | 'domicilio'>('local');
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null); // Sucursal seleccionada en modo local
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [schedulingMode, setSchedulingMode] = useState<'bulk' | 'separate'>('bulk');
  const [cart, setCart] = useState<any[]>([]); // [{ service, staff, date, time, duration }]
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [availableSlots, setAvailableSlots] = useState<{time: string, available: boolean}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // -- MODO SIMULTÁNEO (réplica widget) --
  const [simultaneousMode, setSimultaneousMode] = useState<boolean | null>(null);
  const [showSimultaneousPrompt, setShowSimultaneousPrompt] = useState(false);
  const [simulGroups, setSimulGroups] = useState<number[][] | null>(null);
  // -- FIN NUEVOS ESTADOS --

  // Regla 25: el prompt de simultáneos solo aplica si HAY AL MENOS 2 servicios con el tag
  const hasSomeSimultaneous = selectedServicesList.filter(s => s.allowSimultaneous).length >= 2;

  // Calcula grupos de simultaneidad: pares de servicios allowSimultaneous primero, luego los no-simultáneos
  const computeSimulGroups = (svcs: any[]): number[][] => {
    const simulIdx = svcs.map((s, i) => s.allowSimultaneous ? i : null).filter(i => i !== null) as number[];
    const nonSimulIdx = svcs.map((s, i) => !s.allowSimultaneous ? i : null).filter(i => i !== null) as number[];
    const groups: number[][] = [];
    for (let i = 0; i < simulIdx.length; i += 2) groups.push(simulIdx.slice(i, i + 2));
    for (const i of nonSimulIdx) groups.push([i]);
    return groups;
  };

  // Filtrar staff según modalidad + sucursal seleccionada + categorías de los servicios seleccionados
  const filteredStaff = useMemo(() => {
    // Paso 1: filtrar por modalidad y sucursal
    const byModality = staff.filter(s => {
      if (modality === 'domicilio') return s.allowsHomeService !== false;
      if (modality === 'local' && selectedBranch) return s.branchId === selectedBranch.id;
      return true;
    });

    if (selectedServicesList.length === 0) return byModality;

    // Paso 2: filtrar por categorías requeridas
    const targetService = schedulingMode === 'separate'
      ? selectedServicesList[currentServiceIndex]
      : null;

    let requiredCategoryIds: string[];
    if (schedulingMode === 'bulk') {
      // Bulk: el staff debe cubrir TODAS las categorías de todos los servicios
      requiredCategoryIds = [...new Set(selectedServicesList.flatMap(s => s.categoryIds || []))];
    } else if (targetService) {
      // Separate: el staff debe cubrir las categorías del servicio actual
      requiredCategoryIds = targetService.categoryIds || [];
    } else {
      requiredCategoryIds = [];
    }

    if (requiredCategoryIds.length === 0) return byModality;

    const categoryFiltered = byModality.filter(s => {
      const staffCats: string[] = s.categoryIds || [];
      return requiredCategoryIds.every(catId => staffCats.includes(catId));
    });

    // Si ningún staff cumple las categorías, mostrar todos los de la modalidad como fallback
    return categoryFiltered.length > 0 ? categoryFiltered : byModality;
  }, [staff, modality, selectedBranch, selectedServicesList, schedulingMode, currentServiceIndex]);

  // Filtrar servicios según modalidad + regla isExclusive (reglas 18/19)
  const filteredServices = services.filter(s => {
    if (modality === 'domicilio') return s.allowsHomeService !== false && !s.isExclusive;
    if (modality === 'local' && selectedBranch) {
      if (s.isExclusive) {
        // Regla 18: exclusivos solo en su sucursal asignada
        return (s.branches || []).some((b: any) => b.branchId === selectedBranch.id);
      }
      // No-exclusivos: sin restricción = aparecen en todas; con restricción = filtrar por sucursal
      if (!s.branches || s.branches.length === 0) return true;
      return s.branches.some((b: any) => b.branchId === selectedBranch.id);
    }
    return true;
  });
  
  // Algoritmo para posicionar citas solapadas lado a lado
  // Algoritmo para posicionar citas solapadas lado a lado (estilo Outlook/Google Calendar)
  const getEventLayout = (events: any[]) => {
    if (events.length === 0) return [];
    
    // 1. Clonar y ordenar por tiempo de inicio, luego por duración (más larga primero)
    const sorted = [...events].sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      if (aStart !== bStart) return aStart - bStart;
      const aEnd = new Date(a.endTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return bEnd - bStart - (aEnd - aStart);
    });

    const results: any[] = [];
    let currentCluster: any[] = [];
    let clusterEnd = 0;

    const processCluster = (cluster: any[]) => {
      if (cluster.length === 0) return;

      const columns: any[][] = [];
      cluster.forEach(event => {
        let placed = false;
        const eStart = new Date(event.startTime).getTime();

        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          const lastEnd = new Date(lastInCol.endTime).getTime();
          
          if (eStart >= lastEnd) {
            columns[i].push(event);
            event.colIndex = i;
            placed = true;
            break;
          }
        }

        if (!placed) {
          event.colIndex = columns.length;
          columns.push([event]);
        }
      });

      // El ancho total de cada evento en el cluster depende del número total de columnas
      cluster.forEach(event => {
        event.totalCols = columns.length;
      });
    };

    sorted.forEach(event => {
      const eStart = new Date(event.startTime).getTime();
      const eEnd = new Date(event.endTime).getTime();

      if (eStart >= clusterEnd) {
        processCluster(currentCluster);
        currentCluster = [event];
        clusterEnd = eEnd;
      } else {
        currentCluster.push(event);
        if (eEnd > clusterEnd) clusterEnd = eEnd;
      }
    });

    processCluster(currentCluster);

    return sorted;
  };

  // Detección de solapamiento (Overlap)
  const checkOverlap = () => {
    try {
      const start = parse(`${formData.date} ${formData.time}`, "yyyy-MM-dd HH:mm", new Date());
      const end = addMinutes(start, formData.durationMinutes);
      
      const conflict = initialBookings.find(b => {
        if (editingBooking && b.id === editingBooking.id) return false;
        if (b.status === 'CANCELLED') return false;
        if (b.staffId !== formData.staffId) return false;
        
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        
        return start < bEnd && end > bStart;
      });

      setOverlapInfo(conflict || null);
      if (!conflict) setAllowOverlap(false);
    } catch {
      setOverlapInfo(null);
    }
  };

  // Efecto para re-validar solapamiento cuando cambia el form
  useEffect(() => {
    checkOverlap();
  }, [formData.date, formData.time, formData.durationMinutes, formData.staffId, editingBooking]);

  // Nuevo Efecto para cargar slots en tiempo real
  useEffect(() => {
    const fetchSlots = async () => {
      // Solo cargar si estamos en el paso 4 de creación
      const isSimulBulk = schedulingMode === 'bulk' && simultaneousMode && simulGroups;
      if (modalStep !== 4 || !formData.date || (!formData.staffId && !isSimulBulk) || editingBooking) return;

      setLoadingSlots(true);
      try {
        const currentService = selectedServicesList[currentServiceIndex];

        // Calcular duración a validar: En modo bulk, sumamos todos los servicios seleccionados
        // para asegurar que el bloque completo quepa sin traslapes.
        const durationToValidate = schedulingMode === 'bulk'
          ? selectedServicesList.reduce((acc, s) => acc + s.durationMinutes, 0)
          : currentService.durationMinutes;

        const simCount = isSimulBulk
          ? Math.max(...(simulGroups || [[1]]).map(g => g.length))
          : 1;
        const staffIdParam = isSimulBulk ? undefined : formData.staffId;
        const allowedStaffParam = isSimulBulk ? filteredStaff.map((s: any) => s.id) : undefined;

        const res = await getAvailableSlots(
          formData.date,
          currentService.id,
          selectedBranch?.id || formData.branchId || staff[0]?.branchId,
          staffIdParam,
          durationToValidate,
          modality === 'domicilio',
          true, // allowPast: true para el administrador
          allowedStaffParam,
          simCount
        );
        
        if (res.slots) {
          const inMemoryFiltered = res.slots.map(slot => {
            let isAvailable = slot.available;
            if (isAvailable && schedulingMode === 'separate') {
              const slotStart = parse(`${formData.date} ${slot.time}`, "yyyy-MM-dd HH:mm", new Date());
              const slotEnd = addMinutes(slotStart, currentService.durationMinutes);

              // Encontrar entradas del carrito que se solapan con este slot (mismo día)
              const overlappingAppts = cart.filter(appt => {
                if (appt.date !== formData.date) return false;
                const apptStart = parse(`${appt.date} ${appt.time}`, "yyyy-MM-dd HH:mm", new Date());
                const apptEnd = addMinutes(apptStart, appt.duration);
                return slotStart < apptEnd && slotEnd > apptStart;
              });

              if (overlappingAppts.length > 0) {
                const currentAllowSimult = currentService.allowSimultaneous ?? false;
                // Regla 13/14: si el servicio actual O algún servicio solapado NO permite simultáneo → bloquear
                const someParticipantDisallows = !currentAllowSimult ||
                  overlappingAppts.some(a => !(a.service.allowSimultaneous ?? false));

                if (someParticipantDisallows) {
                  isAvailable = false;
                } else {
                  // Todos permiten simultáneo: solo bloquear si el mismo staff ya está ocupado
                  if (overlappingAppts.some(a => a.staff?.id === formData.staffId)) {
                    isAvailable = false;
                  }
                }
              }
            }
            return { ...slot, available: isAvailable };
          });
          setAvailableSlots(inMemoryFiltered);
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [modalStep, formData.date, formData.staffId, currentServiceIndex, modality, simultaneousMode, simulGroups]);

  // Reemplazar el anterior handleOpenCreate para resetear estados
  const handleOpenCreateInternal = () => {
    setEditingBooking(null);
    setOverlapInfo(null);
    setAllowOverlap(false);
    setModalStep(1);
    setSelectedServicesList([]);
    setCart([]);
    setModality('local');
    setSelectedBranch(null);
    setSelectedZone(null);
    setSchedulingMode('bulk');
    setCurrentServiceIndex(0);
    setIsSuccess(false);
    setSimultaneousMode(null);
    setShowSimultaneousPrompt(false);
    setSimulGroups(null);
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      status: "CONFIRMED",
      serviceId: services[0]?.id || "",
      staffId: staff[0]?.id || "",
      branchId: staff[0]?.branchId || "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      durationMinutes: services[0]?.durationMinutes || 30,
      notes: "",
      homeAddress: ""
    });
    setDurationInput((services[0]?.durationMinutes || 30).toString());
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => setIsWidgetModalOpen(true);

  const filteredBookings = initialBookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "Todas" || 
      (activeTab === "Confirmadas" && b.status === "CONFIRMED") ||
      (activeTab === "Pendientes" && b.status === "PENDING") ||
      (activeTab === "Finalizadas" && b.status === "FINALIZADA") ||
      (activeTab === "Canceladas" && b.status === "CANCELLED");
    return matchesSearch && matchesTab;
  });

  const handleOpenEdit = (booking: any) => {
    setEditingBooking(booking);
    const { address, clientNotes } = parseBookingNotes(booking.notes);
    setFormData({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail || "",
      customerPhone: booking.customerPhone || "",
      status: booking.status,
      serviceId: booking.serviceId,
      staffId: booking.staffId,
      branchId: booking.branchId,
      date: format(new Date(booking.startTime), "yyyy-MM-dd"),
      time: format(new Date(booking.startTime), "HH:mm"),
      durationMinutes: Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000),
      notes: clientNotes,
      homeAddress: address
    });
    setDurationInput(Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000).toString());
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      if (editingBooking) {
        // Calcular startTime y endTime para edición de cita individual
        const start = parse(`${formData.date} ${formData.time}`, "yyyy-MM-dd HH:mm", new Date());
        const end = addMinutes(start, formData.durationMinutes);

        // Reconstruir notes preservando la dirección si existía
        const fullNotes = formData.homeAddress
          ? `Dirección: ${formData.homeAddress}${formData.notes ? '\n' + formData.notes : ''}`
          : formData.notes;

        result = await updateBookingAction({
          id: editingBooking.id,
          tenantId,
          ...formData,
          notes: fullNotes,
          startTime: start,
          endTime: end
        });
      } else {
        // CREACIÓN DE NUEVA SESIÓN (Multi-servicio / Remota)
        const formatLocalIso = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm:ss");
        let sessionBookings: any[];

        if (schedulingMode === 'bulk' && simultaneousMode && simulGroups) {
          // Modo simultáneo: agrupar servicios según simulGroups, los del mismo grupo comparten start
          const baseStart = parse(`${cart[0].date} ${cart[0].time}`, "yyyy-MM-dd HH:mm", new Date());
          const entries: any[] = [];
          let groupStart = baseStart;
          for (const group of simulGroups) {
            const maxDur = Math.max(...group.map(i => cart[i]?.service.durationMinutes ?? 0));
            for (const i of group) {
              const item = cart[i];
              if (!item) continue;
              const end = addMinutes(groupStart, item.service.durationMinutes);
              const entry: any = {
                branchId: selectedBranch?.id || item.staff?.branchId || formData.branchId,
                serviceId: item.service.id,
                staffId: item.staff?.id || '',
                startTime: formatLocalIso(groupStart),
                endTime: formatLocalIso(end),
                price: item.service.price.toString()
              };
              if (!item.staff?.id) entry.allowedStaffIds = filteredStaff.map((s: any) => s.id);
              entries.push(entry);
            }
            groupStart = addMinutes(groupStart, maxDur);
          }
          sessionBookings = entries;
        } else {
          // Modo secuencial: bulk → uno tras otro desde el mismo inicio; separate → cada uno su propio inicio
          let currentStart: Date | null = null;
          sessionBookings = cart.map(item => {
            const itemBase = parse(`${item.date} ${item.time}`, "yyyy-MM-dd HH:mm", new Date());
            const actualStart = (schedulingMode === 'bulk' && currentStart) ? currentStart : itemBase;
            const dur = item.duration || item.service.durationMinutes;
            const end = addMinutes(actualStart, dur);
            if (schedulingMode === 'bulk') currentStart = end;
            const entry: any = {
              branchId: item.staff?.branchId || formData.branchId,
              serviceId: item.service.id,
              staffId: item.staff?.id || '',
              startTime: formatLocalIso(actualStart),
              endTime: formatLocalIso(end),
              price: item.service.price.toString()
            };
            if (!item.staff?.id) entry.allowedStaffIds = filteredStaff.map((s: any) => s.id);
            return entry;
          });
        }

        result = await createBookingSessionAction({
          tenantId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          zoneId: selectedZone?.id,
          notes: formData.notes, 
          bookings: sessionBookings
        });
      }

      if (result.success) {
        if (editingBooking) {
          setIsEditModalOpen(false);
          setEditingBooking(null);
        } else {
          setIsSuccess(true);
        }
        router.refresh();
      } else {
        alert(t('errorSave') + (result.error ? `: ${result.error}` : ""));
      }
    } catch (err) {
      console.error("Error during booking save:", err);
      alert(t('errorSave'));
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmCancel'))) return;
    
    const result = await deleteBookingAction(id, tenantId);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingBooking(null);
      router.refresh();
    } else {
      alert(t('errorDelete'));
    }
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          {viewMode === 'list' && (
             <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-300 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95">
                <Filter className="w-4 h-4" />
                {t('filter')}
            </button>
          )}
            <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                >
                  <LayoutList className="w-5 h-5" />
                </button>
            </div>
            <button 
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
            >
                <Calendar className="w-5 h-5" />
                {t('new')}
            </button>
        </div>
      </div>

      {/* Filters & Search - Only in List Mode */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 flex items-center gap-4 overflow-x-auto no-scrollbar py-4 -my-4 px-4 -mx-4">
              {['Todas', 'Pendientes', 'Confirmadas', 'Finalizadas', 'Canceladas'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`text-sm font-bold whitespace-nowrap px-6 py-3 rounded-2xl transition-all ${
                      activeTab === tab 
                      ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20 scale-105' 
                      : 'bg-white dark:bg-zinc-900 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                  }`}>
                      {t(`tabs.${tab}`)}
                  </button>
              ))}
          </div>
          <div className="lg:col-span-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                  type="text" 
                  placeholder={t('searchPlaceholder')} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
              />
          </div>
        </div>
      )}

       {/* Bookings View */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">{t('noBookings')}</p>
            </div>
          ) : filteredBookings.map((booking: any) => (
              <div key={booking.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-purple-500/50 transition-all group relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 lg:w-1/4">
                          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                              <User className="w-7 h-7" />
                          </div>
                           <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{booking.customerName}</h3>
                                {booking.notes && (
                                  <div className="group relative">
                                    <FileText className="w-4 h-4 text-purple-500 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
                                      {booking.notes}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 mt-1">
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full inline-block w-fit ${
                                      booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
                                      booking.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' :
                                      booking.status === 'FINALIZADA' ? 'bg-purple-500/10 text-purple-500' :
                                      'bg-rose-500/10 text-rose-500'
                                  }`}>
                                      {t(`status.${booking.status}`)}
                                  </span>
                                  {booking.customerPhone && (
                                    <span className="text-xs text-slate-400 font-bold">{booking.customerPhone}</span>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-wrap gap-8 flex-1">
                          <div className="space-y-1 min-w-[140px]">
                              <p className="text-xs font-bold text-slate-400 tracking-widest">{t('table.service')}</p>
                              <div className="flex items-center gap-2">
                                  < Sparkles className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{booking.service?.name}</span>
                              </div>
                          </div>
                          <div className="space-y-1 min-w-[140px]">
                              <p className="text-xs font-bold text-slate-400 tracking-widest">{t('table.dateTime')}</p>
                              <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                                  {format(new Date(booking.startTime), "d MMM yyyy · hh:mm a", { locale: dateLocale })}
                                  </span>
                              </div>
                          </div>
                          <div className="space-y-1 min-w-[140px]">
                              <p className="text-xs font-bold text-slate-400 tracking-widest">{t('table.branch')}</p>
                              <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                                      {booking.branch?.name || '---'}
                                  </span>
                              </div>
                          </div>
                          <div className="space-y-1 min-w-[140px]">
                              <p className="text-xs font-bold text-slate-400 tracking-widest">{t('table.staff')}</p>
                              <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-600 font-bold border border-purple-500/20">
                                      {booking.staff?.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{booking.staff?.name}</span>
                              </div>
                          </div>
                      </div>

                        <div className="flex items-center gap-2">
                          {booking.status === 'FINALIZADA' && (
                            <button 
                              onClick={() => {
                                const url = `${window.location.origin}/${localeStr}/review/${booking.id}`;
                                navigator.clipboard.writeText(url);
                                setCopiedId(booking.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              title={t('copySurveyLink')}
                              className={`p-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center ${
                                copiedId === booking.id 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-purple-500 hover:text-white'
                              }`}
                            >
                                {copiedId === booking.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenEdit(booking)}
                            className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-purple-500 hover:text-white rounded-2xl text-slate-400 transition-all active:scale-95"
                          >
                              <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(booking.id)}
                            className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl text-slate-400 transition-all active:scale-95"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[700px] shadow-sm animate-in fade-in zoom-in-95 duration-500">
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between gap-4">
            {/* Fecha — fija a la izquierda */}
            <h2 className="text-xl font-black text-slate-900 dark:text-white first-letter:uppercase min-w-0 truncate">
              {calendarView === 'week'
                ? (() => {
                    const ws = startOfWeek(calendarDate, { weekStartsOn: 1 });
                    const we = endOfWeek(calendarDate, { weekStartsOn: 1 });
                    return `${format(ws, "d MMM", { locale: dateLocale })} – ${format(we, "d MMM yyyy", { locale: dateLocale })}`;
                  })()
                : format(calendarDate, localeStr === 'es' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM do", { locale: dateLocale })
              }
            </h2>

            {/* Controles — fijos a la derecha */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle Día / Semana */}
              <div className="flex bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'day'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {t('day')}
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'week'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {t('week')}
                </button>
              </div>

              {/* Navegación */}
              <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                <button 
                  onClick={() => calendarView === 'week'
                    ? setCalendarDate(subWeeks(calendarDate, 1))
                    : setCalendarDate(subDays(calendarDate, 1))
                  }
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCalendarDate(new Date())}
                  className="px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                >
                  {t('today')}
                </button>
                <button 
                  onClick={() => calendarView === 'week'
                    ? setCalendarDate(addWeeks(calendarDate, 1))
                    : setCalendarDate(addDays(calendarDate, 1))
                  }
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Body */}
          <div className="flex-1 overflow-y-auto relative min-h-[800px] custom-scrollbar">
            {calendarView === 'day' ? (
              /* ── VISTA DÍA ── */
              <div className="absolute inset-0 grid grid-cols-[80px_1fr] divide-x divide-slate-100 dark:divide-white/5">
                {/* Hours Column */}
                <div className="bg-slate-50/30 dark:bg-white/[0.02]">
                  {Array.from({ length: calendarHours }).map((_, i) => {
                    const hour = i + calendarStartHour;
                    return (
                      <div key={hour} className="h-24 border-b border-slate-100 dark:border-white/5 p-4 text-center flex items-start justify-center">
                        <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 tracking-tighter whitespace-nowrap uppercase">
                          {format(parse(hour.toString(), "H", new Date()), "h:mm a")}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Grid Content */}
                <div className="relative group/grid">
                  {Array.from({ length: calendarHours }).map((_, i) => (
                    <div key={i} className="h-24 border-b border-slate-100 dark:border-white/5" />
                  ))}
                  <div className="absolute inset-0 p-4">
                    {(() => {
                      const dayEvents = initialBookings.filter(b => isSameDay(new Date(b.startTime), calendarDate));
                      const layoutEvents = getEventLayout(dayEvents);
                      
                      return layoutEvents.flatMap((booking: any) => {
                        const start = new Date(booking.startTime);
                        const end = new Date(booking.endTime);
                        const startMinutes = (start.getHours() - calendarStartHour) * 60 + start.getMinutes();
                        const duration = (end.getTime() - start.getTime()) / 60000;
                        const top = (startMinutes * 96) / 60;
                        const height = (duration * 96) / 60;
                        const width = 100 / booking.totalCols;
                        const left = booking.colIndex * width;
                        const isCancelled = booking.status === 'CANCELLED';
                        const bufferPx = travelTime > 0 && booking.isHomeService ? (travelTime * 96) / 60 : 0;
                        const bufCtx = homeServiceBufferCtx.get(booking.id);

                        const items: JSX.Element[] = [];

                        if (bufferPx > 0 && !isCancelled) {
                          if (bufCtx?.showPre) {
                            items.push(
                              <div
                                key={`${booking.id}-buf-pre`}
                                style={{ top: `${top - bufferPx}px`, height: `${bufferPx}px`, left: `calc(${left}% + 4px)`, width: `calc(${width}% - 8px)` }}
                                className="absolute z-[9] rounded-t-xl bg-amber-400/10 border border-dashed border-amber-400/30 flex items-center justify-center"
                                title={`Traslado: ${travelTime} min antes`}
                              >
                                <Truck className="w-3 h-3 text-amber-400/60" />
                              </div>
                            );
                          }
                          if (bufCtx?.showPost) {
                            items.push(
                              <div
                                key={`${booking.id}-buf-post`}
                                style={{ top: `${top + height}px`, height: `${bufferPx}px`, left: `calc(${left}% + 4px)`, width: `calc(${width}% - 8px)` }}
                                className="absolute z-[9] rounded-b-xl bg-amber-400/10 border border-dashed border-amber-400/30 flex items-center justify-center"
                                title={`Traslado: ${travelTime} min después`}
                              >
                                <Truck className="w-3 h-3 text-amber-400/60" />
                              </div>
                            );
                          }
                        }

                        items.push(
                          <button
                            key={booking.id}
                            onClick={() => handleOpenEdit(booking)}
                            style={{ top: `${top}px`, height: `${height}px`, left: `calc(${left}% + 4px)`, width: `calc(${width}% - 8px)` }}
                            className={`absolute z-10 p-3 rounded-2xl border transition-all text-left group overflow-hidden ${
                              isCancelled
                                ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-60 grayscale-[0.5]'
                                : booking.status === 'CONFIRMED'
                                  ? 'bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20'
                                  : booking.status === 'PENDING'
                                  ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                                  : booking.status === 'FINALIZADA'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                          >
                            <div className="flex flex-col h-full gap-0.5">
                              <div className="flex items-center justify-between gap-4 mb-0.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <h4 className={`font-extrabold text-[14px] truncate leading-tight ${
                                    isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                  }`} title={booking.customerName}>
                                    {booking.customerName}
                                  </h4>
                                  {bookingHasClientNotes(booking) && (
                                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${
                                      booking.session?.zoneId
                                        ? 'text-purple-500 fill-purple-500/20'
                                        : 'text-orange-500 fill-orange-500/20'
                                    }`} />
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                  {format(start, "h:mm")} - {format(end, "h:mm a")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 truncate">
                                  {booking.staff?.name} <span className="mx-1 text-slate-300 dark:text-white/10">-</span>
                                  <span className="text-purple-600 dark:text-purple-400 font-black">{booking.service?.name}</span>
                                </p>
                              </div>
                              {booking.branch?.name && (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 truncate">
                                    {booking.branch.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          </button>
                        );

                        return items;
                      });
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* ── VISTA SEMANA ── */
              (() => {
                const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
                const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
                return (
                  <div className="absolute inset-0 flex flex-col">
                    {/* Day headers */}
                    <div className="grid shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.03]" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
                      <div />
                      {weekDays.map(day => (
                        <div
                          key={day.toISOString()}
                          onClick={() => { setCalendarDate(day); setCalendarView('day'); }}
                          className={`py-2 text-center cursor-pointer transition-colors hover:bg-purple-500/5 ${
                            isSameDay(day, new Date()) ? 'border-b-2 border-purple-500' : ''
                          }`}
                        >
                          <p className="text-[11px] font-black tracking-widest text-slate-400">
                            {format(day, 'EEE', { locale: dateLocale })}
                          </p>
                          <p className={`text-sm font-black mt-0.5 ${
                            isSameDay(day, new Date()) ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-zinc-300'
                          }`}>
                            {format(day, 'd')}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="relative" style={{ height: `${calendarHours * 96}px` }}>
                        {/* Hour rows */}
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
                          {Array.from({ length: calendarHours }).map((_, i) => {
                            const hour = i + calendarStartHour;
                            return (
                              <>
                                <div key={`h-${hour}`} className="row-span-1 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02] flex items-start justify-center pt-2" style={{ gridColumn: 1, gridRow: i + 1, height: '96px' }}>
                                  <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 tracking-tighter whitespace-nowrap uppercase">
                                    {format(parse(hour.toString(), "H", new Date()), "h:mm a")}
                                  </span>
                                </div>
                                {weekDays.map((day, di) => (
                                  <div key={`cell-${hour}-${di}`} style={{ gridColumn: di + 2, gridRow: i + 1, height: '96px', borderBottom: '1px solid', borderRight: di < 6 ? '1px solid' : 'none', borderColor: 'rgba(148,163,184,0.1)' }} />
                                ))}
                              </>
                            );
                          })}
                        </div>

                        {/* Booking blocks */}
                        {weekDays.map((day, di) => {
                          const dayBookings = initialBookings.filter(b => isSameDay(new Date(b.startTime), day));
                          const layoutEvents = getEventLayout(dayBookings);
                          
                          return layoutEvents.flatMap((booking: any) => {
                            const start = new Date(booking.startTime);
                            const end = new Date(booking.endTime);
                            const startMinutes = (start.getHours() - calendarStartHour) * 60 + start.getMinutes();
                            const duration = (end.getTime() - start.getTime()) / 60000;
                            const top = (startMinutes * 96) / 60;
                            const height = Math.max((duration * 96) / 60, 28);
                            const colLeft = `calc(64px + ${di} * (100% - 64px) / 7 + (${booking.colIndex} * (100% - 64px) / 7 / ${booking.totalCols}) + 2px)`;
                            const finalWidth = `calc((100% - 64px) / 7 / ${booking.totalCols} - 4px)`;
                            const isCancelled = booking.status === 'CANCELLED';
                            const bufferPx = travelTime > 0 && booking.isHomeService ? (travelTime * 96) / 60 : 0;
                            const bufCtx = homeServiceBufferCtx.get(booking.id);

                            const items: JSX.Element[] = [];

                            if (bufferPx > 0 && !isCancelled) {
                              if (bufCtx?.showPre) {
                                items.push(
                                  <div key={`${booking.id}-wbuf-pre`} style={{ position: 'absolute', top: `${top - bufferPx}px`, height: `${bufferPx}px`, left: colLeft, width: finalWidth }} className="z-[9] rounded-t-xl bg-amber-400/10 border border-dashed border-amber-400/30 flex items-center justify-center" title={`Traslado: ${travelTime} min antes`}>
                                    <Truck className="w-2.5 h-2.5 text-amber-400/60" />
                                  </div>
                                );
                              }
                              if (bufCtx?.showPost) {
                                items.push(
                                  <div key={`${booking.id}-wbuf-post`} style={{ position: 'absolute', top: `${top + height}px`, height: `${bufferPx}px`, left: colLeft, width: finalWidth }} className="z-[9] rounded-b-xl bg-amber-400/10 border border-dashed border-amber-400/30 flex items-center justify-center" title={`Traslado: ${travelTime} min después`}>
                                    <Truck className="w-2.5 h-2.5 text-amber-400/60" />
                                  </div>
                                );
                              }
                            }

                            items.push(
                              <button
                                key={booking.id}
                                onClick={() => handleOpenEdit(booking)}
                                style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: colLeft, width: finalWidth }}
                                className={`z-10 p-1.5 rounded-xl border transition-all text-left overflow-hidden ${
                                  isCancelled
                                    ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-60 grayscale-[0.5]'
                                    : booking.status === 'CONFIRMED'
                                      ? 'bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20'
                                      : booking.status === 'PENDING'
                                      ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                                      : booking.status === 'FINALIZADA'
                                      ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                                }`}
                              >
                                <div className="flex flex-col h-full gap-0.5">
                                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <p className={`font-black text-xs truncate leading-tight ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                        {booking.customerName}
                                      </p>
                                      {bookingHasClientNotes(booking) && (
                                        <MessageSquare className={`w-3 h-3 shrink-0 ${booking.session?.zoneId ? 'text-purple-500 fill-purple-500/20' : 'text-orange-500 fill-orange-500/20'}`} />
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap opacity-60">{format(start, "h:mm a")}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-bold truncate">
                                    {booking.staff?.name} - <span className="text-purple-500">{booking.service?.name}</span>
                                  </p>
                                  {booking.branch?.name && (
                                    <p className="text-[11px] text-slate-400 font-bold truncate flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5 shrink-0" /> {booking.branch.name}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );

                            return items;
                          });
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Widget Modal - Nueva Cita */}
      {isWidgetModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsWidgetModalOpen(false)} />
            <div className="relative z-10 w-full min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={() => setIsWidgetModalOpen(false)}
                className="fixed top-4 right-4 z-[10000] p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xl transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
                <BookingWidget
                  isAdmin
                  onBookingCreated={() => { setIsWidgetModalOpen(false); router.refresh(); }}
                  branches={branches}
                  services={services}
                  staff={staff}
                  tenantId={tenantId}
                  tenantName={tenantSettings?.name || ''}
                  tenantLogo={tenantSettings?.logoUrl || undefined}
                  whatsappNumber={tenantSettings?.whatsappNumber || ''}
                  homeServiceTerms={tenantSettings?.homeServiceTerms || ''}
                  homeServiceTermsEnabled={tenantSettings?.homeServiceTermsEnabled}
                  waMessageTemplate={tenantSettings?.waMessageTemplate}
                  bookingSettings={tenantSettings?.bookingSettings}
                  primaryColor={tenantSettings?.primaryColor}
                  allowsHomeService={tenantSettings?.allowsHomeService}
                  homeServiceLeadDays={tenantSettings?.homeServiceLeadDays}
                  coverageZones={coverageZones}
                  tenantPlan={tenantSettings?.plan}
                />
              </Suspense>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             {/* Backdrop con Blur Dinámico - Fixed para cubrir todo */}
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h3 className="text-xl font-black tracking-tight">{editingBooking ? t('form.titleEdit') : t('form.titleNew')}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {editingBooking ? (
                /* MODO EDICIÓN (LEGACY) */
                <form onSubmit={handleSaveEdit} className="flex flex-col h-full overflow-hidden">
                  <div className="p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerName')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.customerName}
                        onChange={e => setFormData({...formData, customerName: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                        placeholder={t('form.customerName')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerEmail')}</label>
                        <input 
                          type="email" 
                          value={formData.customerEmail}
                          onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                          placeholder={t('form.customerEmail')}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.status')}</label>
                        <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-900 dark:text-white"
                        >
                          <option value="PENDING">{t('status.PENDING')}</option>
                          <option value="CONFIRMED">{t('status.CONFIRMED')}</option>
                          <option value="FINALIZADA">{t('status.FINALIZADA')}</option>
                          <option value="CANCELLED">{t('status.CANCELLED')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerPhone')}</label>
                      <PhoneInput 
                        value={formData.customerPhone}
                        onChange={val => setFormData({...formData, customerPhone: val})}
                        placeholder={t('form.customerPhone')}
                      />
                    </div>

                    {formData.homeAddress && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Dirección de atención
                        </label>
                        <div className="w-full p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm font-medium text-slate-900 dark:text-white opacity-80 select-text">
                          {formData.homeAddress}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 ml-1">{t('form.notes')}</label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder={t('form.notesPlaceholder')}
                        className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium text-slate-900 dark:text-white min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.service')}</label>
                        <select 
                          value={formData.serviceId}
                          onChange={e => setFormData({...formData, serviceId: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-900 dark:text-white"
                        >
                          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.staff')}</label>
                        <select 
                          value={formData.staffId}
                          onChange={e => {
                            const s = staff.find(st => st.id === e.target.value);
                            setFormData({...formData, staffId: e.target.value, branchId: s?.branchId || formData.branchId})
                          }}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-900 dark:text-white"
                        >
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.date')}</label>
                        <input 
                          required
                          type="date" 
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-bold cursor-pointer text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.time')}</label>
                        <input 
                          required
                          type="time" 
                          value={formData.time}
                          onChange={e => setFormData({...formData, time: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-bold cursor-pointer text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {isPastBooking && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            {t('pastBookingWarning')}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {t('pastBookingDetail')}
                          </p>
                        </div>
                      </div>
                    )}

                    {overlapInfo && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                              {t('overlapWarning', { staff: staff.find(s => s.id === formData.staffId)?.name })}
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                              {t('overlapDetail', { 
                                customer: overlapInfo.customerName,
                                start: format(new Date(overlapInfo.startTime), "hh:mm a"),
                                end: format(new Date(overlapInfo.endTime), "hh:mm a")
                              })}
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-xl cursor-pointer hover:bg-white/80 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={allowOverlap}
                            onChange={e => setAllowOverlap(e.target.checked)}
                            className="w-4 h-4 rounded border-orange-300 transform scale-125 accent-orange-500"
                          />
                          <span className="text-xs font-bold text-orange-800 dark:text-orange-300">
                            {t('allowOverlap')}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0 flex gap-3 sticky bottom-0 z-30">
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => { handleDelete(editingBooking.id); setIsEditModalOpen(false); }}
                      className="px-6 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                      {t('form.delete')}
                    </button>
                    <button 
                      type="submit" 
                      disabled={isLoading || (!!overlapInfo && !allowOverlap)}
                      className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('form.save')}
                    </button>
                  </div>
                </form>
              ) : (
                /* MODO CREACIÓN (PASO A PASO) */
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-7 py-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex gap-2">
                    {[1, 2, 3, 4, 5].map(step => (
                      <div 
                        key={step} 
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${modalStep >= step ? 'bg-purple-500' : 'bg-slate-200 dark:bg-white/10'}`} 
                      />
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                    {modalStep === 1 && (
                      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                        <div className="p-7 space-y-6 flex-1">
                          <h4 className="text-lg font-black">{t('form.customerInfo')}</h4>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerName')} *</label>
                              <input 
                                required
                                type="text" 
                                value={formData.customerName}
                                onChange={e => setFormData({...formData, customerName: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                                placeholder={t('form.customerName')}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerEmail')} *</label>
                              <input 
                                required
                                type="email" 
                                value={formData.customerEmail}
                                onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                                placeholder={t('form.customerEmail')}
                                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 ml-1">{t('form.customerPhone')} *</label>
                              <PhoneInput 
                                value={formData.customerPhone}
                                onChange={val => setFormData({...formData, customerPhone: val})}
                                placeholder={t('form.customerPhone')}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 ml-1">{t('form.notes')}</label>
                              <textarea 
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                placeholder={t('form.notesPlaceholder')}
                                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-20 shrink-0 w-full mt-auto">
                          <button 
                            onClick={() => setModalStep(2)}
                            disabled={!formData.customerName || !formData.customerEmail || !formData.customerPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black disabled:opacity-50 transition-all"
                          >
                            {t('continue')}
                          </button>
                        </div>
                      </div>
                    )}

                    {modalStep === 2 && (
                      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                        <div className="p-7 space-y-4 flex-1">
                          <h4 className="text-lg font-black">{t('form.selectServices')}</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {filteredServices.map(srv => {
                              const isSelected = selectedServicesList.some(s => s.id === srv.id);
                              return (
                                <button
                                  key={srv.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedServicesList(selectedServicesList.filter(s => s.id !== srv.id));
                                    } else {
                                      setSelectedServicesList([...selectedServicesList, srv]);
                                    }
                                  }}
                                  className={`p-4 rounded-2xl border text-left transition-all ${
                                    isSelected 
                                      ? 'bg-purple-500/10 border-purple-500 shadow-lg shadow-purple-500/5' 
                                      : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-purple-500/30'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <div>
                                        <p className="font-bold text-sm">{srv.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{srv.durationMinutes} min</p>
                                      </div>
                                    </div>
                                    <p className="font-black text-emerald-500">${srv.price}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="p-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-20 shrink-0 w-full mt-auto flex gap-3">
                          <button onClick={() => setModalStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black">{t('back')}</button>
                          <button 
                            onClick={() => {
                              if (selectedServicesList.length > 1 && (tenantSettings?.allowsHomeService)) {
                                setModalStep(3);
                              } else if (selectedServicesList.length > 1) {
                                setModalStep(3); // Aún step 3 para modalidad local vs domicilio (si el negocio lo permite)
                              } else {
                                setSchedulingMode('bulk');
                                setModalStep(3);
                              }
                            }}
                            disabled={selectedServicesList.length === 0}
                            className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black disabled:opacity-50"
                          >
                            {t('continue')}
                          </button>
                        </div>
                      </div>
                    )}

                    {modalStep === 3 && (
                      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                        <div className="p-7 space-y-6 flex-1">
                           <h4 className="text-lg font-black">{t('form.modalityTitle')}</h4>
                           <div className="grid grid-cols-2 gap-4">
                              <button
                                onClick={() => {
                                  setModality('local');
                                  setSelectedZone(null);
                                  setSelectedBranch(null);
                                  // Re-evaluar servicios al volver a local (pueden volver servicios que se ocultaron)
                                  setSelectedServicesList(prev => prev.filter(s => {
                                    if (!s.isExclusive) return true;
                                    // Exclusivos sin sucursal seleccionada: mantener, se filtrará al elegir sucursal
                                    return true;
                                  }));
                                }}
                                className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${modality === 'local' ? 'bg-purple-500/10 border-purple-500' : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60'}`}
                              >
                                <Sparkles className={`w-8 h-8 ${modality === 'local' ? 'text-purple-500' : 'text-slate-400'}`} />
                                <span className="font-bold text-sm">{t('modality.local')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setModality('domicilio');
                                  setSelectedBranch(null);
                                  // Quitar servicios exclusivos o sin domicilio que ya no aplican
                                  setSelectedServicesList(prev =>
                                    prev.filter(s => s.allowsHomeService !== false && !s.isExclusive)
                                  );
                                }}
                                disabled={!tenantSettings?.allowsHomeService}
                                className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${modality === 'domicilio' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60'} ${!tenantSettings?.allowsHomeService ? 'cursor-not-allowed grayscale' : ''}`}
                              >
                                <Truck className={`w-8 h-8 ${modality === 'domicilio' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <span className="font-bold text-sm">{t('modality.home')}</span>
                                {!tenantSettings?.allowsHomeService && <span className="text-[8px] text-rose-500 font-black uppercase">NO ACTIVADO</span>}
                              </button>
                           </div>

                           {/* Selector de sucursal para modo local (regla 18: exclusivos por sucursal) */}
                           {modality === 'local' && branches.length > 1 && (
                             <div className="space-y-3 p-5 bg-purple-500/5 rounded-[24px] border border-purple-500/10 animate-in zoom-in-95">
                               <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Sucursal</label>
                               <div className="space-y-2">
                                 <button
                                   onClick={() => setSelectedBranch(null)}
                                   className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${!selectedBranch ? 'bg-purple-500 text-white border-purple-400 shadow-lg' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                 >
                                   <p className="font-bold text-sm">Todas las sucursales</p>
                                 </button>
                                 {branches.map((branch: any) => (
                                   <button
                                     key={branch.id}
                                     onClick={() => {
                                       setSelectedBranch(branch);
                                       // Quitar servicios exclusivos que no pertenecen a esta sucursal
                                       setSelectedServicesList(prev => prev.filter(s => {
                                         if (!s.isExclusive) return true;
                                         return (s.branches || []).some((b: any) => b.branchId === branch.id);
                                       }));
                                     }}
                                     className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${selectedBranch?.id === branch.id ? 'bg-purple-500 text-white border-purple-400 shadow-lg' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                   >
                                     <p className="font-bold text-sm">{branch.name}</p>
                                   </button>
                                 ))}
                               </div>
                             </div>
                           )}

                           {modality === 'domicilio' && (
                             <div className="space-y-4 p-5 bg-emerald-500/5 rounded-[24px] border border-emerald-500/10 animate-in zoom-in-95">
                                <label className="text-xs font-black text-slate-500">{t('form.zoneInfo')}</label>
                                <div className="space-y-2">
                                  {coverageZones.map(zone => (
                                    <button
                                      key={zone.id}
                                      onClick={() => setSelectedZone(zone)}
                                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${selectedZone?.id === zone.id ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                    >
                                      <div><p className="font-bold text-sm">{zone.name}</p></div>
                                      <p className="font-black">+${zone.fee}</p>
                                    </button>
                                  ))}
                                </div>
                             </div>
                           )}

                           {selectedServicesList.length > 1 && (
                             <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-6">
                               <label className="text-xs font-black text-slate-500">{t('form.schedulingMode')}</label>
                               <div className="grid grid-cols-1 gap-3">
                                  <button
                                    onClick={() => {
                                      setSchedulingMode('bulk');
                                      if (hasSomeSimultaneous && modality !== 'domicilio') {
                                        setShowSimultaneousPrompt(true);
                                      } else {
                                        setSimultaneousMode(false);
                                        setShowSimultaneousPrompt(false);
                                      }
                                    }}
                                    className={`p-4 rounded-xl border flex items-center gap-4 text-left transition-all ${schedulingMode === 'bulk' ? 'bg-purple-500/10 border-purple-500' : 'border-slate-100 dark:border-white/5'}`}
                                  >
                                    <Layers className="w-5 h-5 text-purple-500" />
                                    <div><p className="font-bold text-sm">{t('schedulingMode.bulk')}</p></div>
                                  </button>

                                  {/* Sub-prompt: ¿servicios en simultáneo? */}
                                  {showSimultaneousPrompt && schedulingMode === 'bulk' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300 p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl space-y-3">
                                      <div className="flex items-start gap-3">
                                        <Layers className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                                            ¡Algunos servicios pueden realizarse al mismo tiempo!
                                          </p>
                                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                            Servicios con diferentes especialistas pueden ejecutarse en simultáneo. ¿Deseas programarlos así?
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSimultaneousMode(true);
                                            setSimulGroups(computeSimulGroups(selectedServicesList));
                                            setShowSimultaneousPrompt(false);
                                          }}
                                          className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                                        >
                                          Sí, en simultáneo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSimultaneousMode(false);
                                            setSimulGroups(null);
                                            setShowSimultaneousPrompt(false);
                                          }}
                                          className="flex-1 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-black transition-all active:scale-95"
                                        >
                                          No, uno tras otro
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => {
                                      setSchedulingMode('separate');
                                      setShowSimultaneousPrompt(false);
                                      setSimultaneousMode(null);
                                      setSimulGroups(null);
                                    }}
                                    className={`p-4 rounded-xl border flex items-center gap-4 text-left transition-all ${schedulingMode === 'separate' ? 'bg-blue-500/10 border-blue-500' : 'border-slate-100 dark:border-white/5'}`}
                                  >
                                    <CalendarRange className="w-5 h-5 text-blue-500" />
                                    <div><p className="font-bold text-sm">{t('schedulingMode.separate')}</p></div>
                                  </button>
                               </div>
                             </div>
                           )}
                        </div>
                        <div className="p-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-20 shrink-0 w-full mt-auto flex gap-3">
                          <button
                            onClick={() => {
                              setModalStep(2);
                              setSimultaneousMode(null);
                              setShowSimultaneousPrompt(false);
                              setSimulGroups(null);
                              setSchedulingMode('bulk');
                            }}
                            className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black"
                          >
                            {t('back')}
                          </button>
                          <button
                            onClick={() => setModalStep(4)}
                            disabled={showSimultaneousPrompt}
                            className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('continue')}
                          </button>
                        </div>
                      </div>
                    )}

                    {modalStep === 4 && (
                      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                        <div className="p-7 space-y-4 flex-1">
                           <h4 className="text-lg font-black">{schedulingMode === 'separate' ? `${t('form.scheduling')} - ${selectedServicesList[currentServiceIndex]?.name} (${currentServiceIndex + 1}/${selectedServicesList.length})` : t('form.schedulingBulk')}</h4>
                            <div className="space-y-6 bg-slate-50 dark:bg-white/5 p-6 rounded-[24px] border border-slate-100 dark:border-white/5">
                              {schedulingMode === 'bulk' && simultaneousMode ? (
                                <div className="p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl flex items-start gap-3">
                                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-bold text-purple-900 dark:text-purple-200">Modo simultáneo activo</p>
                                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">El sistema asignará automáticamente especialistas disponibles para cada servicio simultáneo.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('form.staff')}</label>
                                     <select value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold text-sm appearance-none shadow-sm">
                                       {filteredStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                     </select>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('form.date')}</label>
                                     <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-black text-sm" />
                                  </div>
                                </div>
                              )}
                              {(schedulingMode === 'bulk' && simultaneousMode) && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('form.date')}</label>
                                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-black text-sm" />
                                </div>
                              )}
                              
                              {isPastBooking && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95">
                                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                      {t('pastBookingWarning')}
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                      {t('pastBookingDetail')}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                  {loadingSlots ? 'Cargando horarios...' : 'Selecciona un horario'}
                                </label>
                                
                                {loadingSlots ? (
                                  <div className="grid grid-cols-4 gap-2 animate-pulse">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-10 bg-slate-200 dark:bg-white/5 rounded-xl" />)}
                                  </div>
                                ) : availableSlots.length > 0 ? (
                                  <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSlots.map((slot) => (
                                      <button
                                        key={slot.time}
                                        disabled={!slot.available}
                                        onClick={() => setFormData({...formData, time: slot.time})}
                                        className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                                          formData.time === slot.time 
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                            : slot.available 
                                              ? 'bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:border-purple-500 border-2 border-transparent'
                                              : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                                        }`}
                                      >
                                        {slot.time}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                                    <p className="text-xs font-bold text-rose-500">No hay horarios disponibles para este día.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                        </div>
                        <div className="p-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-20 shrink-0 w-full mt-auto flex gap-3">
                          <button 
                            onClick={() => {
                              if (schedulingMode === 'separate' && currentServiceIndex > 0) {
                                setCurrentServiceIndex(currentServiceIndex - 1);
                                const prevAppt = cart[currentServiceIndex - 1];
                                if (prevAppt) {
                                  setFormData({...formData, date: prevAppt.date, time: prevAppt.time, staffId: prevAppt.staff?.id || ''});
                                }
                              } else {
                                setModalStep(3);
                              }
                            }} 
                            className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black"
                          >
                            {t('back')}
                          </button>
                          <button 
                            onClick={() => {
                              const currentService = selectedServicesList[currentServiceIndex];
                              if (schedulingMode === 'bulk') {
                                let currentStartTime = parse(`${formData.date} ${formData.time}`, "yyyy-MM-dd HH:mm", new Date());
                                const assignedStaff = (simultaneousMode) ? null : staff.find(s => s.id === formData.staffId);
                                const bulkCart = selectedServicesList.map(srv => {
                                   const appt = { service: srv, staff: assignedStaff, date: formData.date, time: format(currentStartTime, "HH:mm"), duration: srv.durationMinutes };
                                   currentStartTime = addMinutes(currentStartTime, srv.durationMinutes);
                                   return appt;
                                });
                                setCart(bulkCart);
                                setModalStep(5);
                              } else {
                                const newAppt = { service: currentService, staff: staff.find(s => s.id === formData.staffId), date: formData.date, time: formData.time, duration: currentService.durationMinutes };
                                const updatedCart = [...cart]; updatedCart[currentServiceIndex] = newAppt; setCart(updatedCart);
                                if (currentServiceIndex < selectedServicesList.length - 1) {
                                  setCurrentServiceIndex(currentServiceIndex + 1);
                                  setFormData({...formData, time: ""}); // Resetear tiempo para obligar a seleccionar el del siguiente servicio
                                } else {
                                  setModalStep(5);
                                }
                              }
                            }}
                            disabled={!formData.time || !formData.date || (!(schedulingMode === 'bulk' && simultaneousMode) && !formData.staffId) || loadingSlots || !availableSlots.find(s => s.time === formData.time)?.available}
                            className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >{schedulingMode === 'separate' && currentServiceIndex < selectedServicesList.length - 1 ? t('nextService') : t('continue')}</button>
                        </div>
                      </div>
                    )}

                    {modalStep === 5 && !isSuccess && (
                      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                        <div className="p-7 space-y-6 flex-1">
                           <h4 className="text-lg font-black">{t('form.summaryTitle')}</h4>
                           <div className="space-y-3">
                              {cart.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between gap-4">
                                   <div className="flex items-center gap-3 truncate">
                                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center font-black text-purple-500 shrink-0 shadow-sm">{item.service.name.charAt(0)}</div>
                                      <div className="truncate"><p className="font-bold text-sm truncate">{item.service.name}</p><p className="text-[10px] text-slate-500 font-bold truncate">{item.staff?.name || 'Auto-asignado'} • {item.date} • {item.time}</p></div>
                                   </div>
                                   <p className="font-black text-sm shrink-0">${item.service.price}</p>
                                </div>
                              ))}
                           </div>
                           
                           <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-200 dark:border-white/10 space-y-3">
                              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                <span>Subtotal servicios</span>
                                <span>${cart.reduce((acc, curr) => acc + Number(curr.service.price), 0).toFixed(2)}</span>
                              </div>
                              {modality === 'domicilio' && selectedZone && (
                                <div className="flex justify-between items-center text-sm font-bold text-emerald-500">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    <span>Tarifa de traslado ({selectedZone.name})</span>
                                  </div>
                                  <span>+${Number(selectedZone.fee).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-end">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total a pagar</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                      ${(cart.reduce((acc, curr) => acc + Number(curr.service.price), 0) + (selectedZone?.fee ? Number(selectedZone.fee) : 0)).toFixed(2)}
                                    </p>
                                 </div>
                                 <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900">
                                    <Sparkles className="w-6 h-6" />
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="p-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-20 shrink-0 w-full mt-auto flex gap-3">
                          <button 
                            onClick={() => {
                              if (schedulingMode === 'separate' && cart.length > 0) {
                                const lastAppt = cart[selectedServicesList.length - 1];
                                if (lastAppt) {
                                  setFormData({...formData, date: lastAppt.date, time: lastAppt.time, staffId: lastAppt.staff?.id || ''});
                                }
                              }
                              setModalStep(4);
                            }} 
                            className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black"
                          >
                            {t('back')}
                          </button>
                          <button onClick={handleSaveEdit} disabled={isLoading} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('confirmAndSave')}
                          </button>
                        </div>
                      </div>
                    )}

                    {isSuccess && (
                      <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border-4 border-emerald-500/20">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black text-slate-900 dark:text-white">¡Reserva Exitosa!</h4>
                          <p className="text-slate-500 dark:text-zinc-400 font-medium px-6">
                            La cita ha sido agendada correctamente. El cliente recibirá un correo de confirmación en breve.
                          </p>
                        </div>
                        <div className="flex flex-col w-full gap-3 pt-4">
                          <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black shadow-xl transition-all active:scale-95"
                          >
                            Volver al Calendario
                          </button>
                          <button 
                            onClick={handleOpenCreateInternal}
                            className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 rounded-2xl font-bold transition-all"
                          >
                            Agendar otra cita
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
    </>
  );
}


