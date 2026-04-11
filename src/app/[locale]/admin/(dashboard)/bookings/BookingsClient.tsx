"use client";

import { useState, useEffect } from "react";
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
  Check
} from 'lucide-react';
import { updateBookingAction, deleteBookingAction, createBookingAction } from "@/app/actions/booking";
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
import { Loader2 } from 'lucide-react';
import PhoneInput from "@/components/PhoneInput";
import { useTranslations, useLocale } from "next-intl";
import { Portal } from "@/components/Portal";

export default function BookingsClient({ 
  initialBookings,
  services,
  staff,
  branches,
  tenantId
}: { 
  initialBookings: any[],
  services: any[],
  staff: any[],
  branches: any[],
  tenantId: string
}) {
  const t = useTranslations('Dashboard.bookings');
  const localeStr = useLocale();
  const dateLocale = localeStr === 'es' ? es : enUS;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Todas");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

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
    durationMinutes: services[0]?.durationMinutes || 30
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
  
  // Algoritmo para posicionar citas solapadas lado a lado
  const getEventLayout = (events: any[]) => {
    if (events.length === 0) return [];
    
    // 1. Ordenar por tiempo de inicio, luego por duración (más larga primero)
    const sorted = [...events].sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      if (aStart !== bStart) return aStart - bStart;
      const aEnd = new Date(a.endTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return (bEnd - bStart) - (aEnd - aStart);
    });

    const columns: any[][] = [];
    
    sorted.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (new Date(event.startTime) >= new Date(lastInCol.endTime)) {
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

    return sorted.map(event => ({
      ...event,
      totalCols: columns.length
    }));
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

  // Reemplazar el anterior handleOpenCreate para resetear estados
  const handleOpenCreateInternal = () => {
    setEditingBooking(null);
    setOverlapInfo(null);
    setAllowOverlap(false);
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
      durationMinutes: services[0]?.durationMinutes || 30
    });
    setDurationInput((services[0]?.durationMinutes || 30).toString());
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = handleOpenCreateInternal;

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
      durationMinutes: Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)
    });
    setDurationInput(Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000).toString());
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Calcular startTime y endTime
    const start = parse(`${formData.date} ${formData.time}`, "yyyy-MM-dd HH:mm", new Date());
    const end = addMinutes(start, formData.durationMinutes);

    let result;
    if (editingBooking) {
      result = await updateBookingAction({
        id: editingBooking.id,
        tenantId,
        ...formData,
        startTime: start,
        endTime: end
      });
    } else {
      result = await createBookingAction({
        tenantId,
        branchId: formData.branchId,
        serviceId: formData.serviceId,
        staffId: formData.staffId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        startTime: start,
        endTime: end
      });
    }

    if (result.success) {
      setIsEditModalOpen(false);
      router.refresh();
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmCancel'))) return;
    
    const result = await deleteBookingAction(id, tenantId);
    if (result.success) {
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
             <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-300 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95">
                <Filter className="w-4 h-4" />
                {t('filter')}
            </button>
            <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                >
                  <LayoutList className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                >
                  <Calendar className="w-5 h-5" />
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

      {/* Filters & Search */}
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
                              <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{booking.customerName}</h3>
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
                      
                      return layoutEvents.map((booking: any) => {
                        const start = new Date(booking.startTime);
                        const end = new Date(booking.endTime);
                        const startMinutes = (start.getHours() - calendarStartHour) * 60 + start.getMinutes();
                        const duration = (end.getTime() - start.getTime()) / 60000;
                        const top = (startMinutes * 96) / 60;
                        const height = (duration * 96) / 60;
                        
                        const width = 100 / booking.totalCols;
                        const left = booking.colIndex * width;

                        const isCancelled = booking.status === 'CANCELLED';

                        return (
                          <button
                            key={booking.id}
                            onClick={() => handleOpenEdit(booking)}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`, 
                              left: `calc(${left}% + 4px)`, 
                              width: `calc(${width}% - 8px)` 
                            }}
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
                              {/* Fila Cliente y Horario */}
                              <div className="flex items-center justify-between gap-4 mb-0.5">
                                <h4 className={`font-extrabold text-[14px] truncate flex-1 leading-tight ${
                                  isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                }`} title={booking.customerName}>
                                  {booking.customerName}
                                </h4>
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                  {format(start, "h:mm")} - {format(end, "h:mm a")}
                                </span>
                              </div>

                              {/* Fila Staff - Servicio */}
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 truncate">
                                  {booking.staff?.name} <span className="mx-1 text-slate-300 dark:text-white/10">-</span> 
                                  <span className="text-purple-600 dark:text-purple-400 font-black">{booking.service?.name}</span>
                                </p>
                              </div>

                              {/* Fila Sucursal */}
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
                                <div key={`h-${hour}`} className="row-span-1" style={{ gridColumn: 1, gridRow: i + 1, height: '96px', borderBottom: '1px solid', borderColor: 'rgba(148,163,184,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px', backgroundColor: 'rgba(248,250,252,0.3)' }}>
                                  <span className="text-xs font-black text-slate-400 dark:text-zinc-500 tracking-tighter whitespace-nowrap uppercase">
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
                          
                          return layoutEvents.map((booking: any) => {
                            const start = new Date(booking.startTime);
                            const end = new Date(booking.endTime);
                            const startMinutes = (start.getHours() - calendarStartHour) * 60 + start.getMinutes();
                            const duration = (end.getTime() - start.getTime()) / 60000;
                            const top = (startMinutes * 80) / 60;
                            const height = Math.max((duration * 80) / 60, 28);
                            
                            const colWidth = 100 / booking.totalCols;
                            const colLeft = `calc(64px + ${di} * (100% - 64px) / 7 + (${booking.colIndex} * (100% - 64px) / 7 / ${booking.totalCols}) + 2px)`;
                            const finalWidth = `calc((100% - 64px) / 7 / ${booking.totalCols} - 4px)`;

                            const isCancelled = booking.status === 'CANCELLED';

                            return (
                              <button
                                key={booking.id}
                                onClick={() => handleOpenEdit(booking)}
                                style={{ 
                                  position: 'absolute', 
                                  top: `${top}px`, 
                                  height: `${height}px`, 
                                  left: colLeft, 
                                  width: finalWidth
                                }}
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
                                    <p className={`font-black text-xs truncate flex-1 leading-tight ${
                                      isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {booking.customerName}
                                    </p>
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

      {/* Edit Modal */}
      {isEditModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             {/* Backdrop con Blur Dinámico - Fixed para cubrir todo */}
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h3 className="text-xl font-black tracking-tight">{editingBooking ? t('form.titleEdit') : t('form.titleNew')}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 ml-1">{t('form.duration')}</label>
                  <div className="relative">
                    <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="number" 
                      min="1"
                      value={durationInput}
                      onChange={e => {
                        const val = e.target.value;
                        setDurationInput(val);
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) {
                          setFormData({...formData, durationMinutes: parsed});
                        }
                      }}
                      className="w-full p-3 pl-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                    />
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

                {/* Advertencia de Solapamiento */}
                {overlapInfo && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
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

                {isPastBooking && (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p>Atención: Esta cita está siendo programada en el PASADO.</p>
                      <p className="mt-1 font-medium opacity-80 underline">Se guardará de todas formas para tu gestión interna.</p>
                    </div>
                  </div>
                )}

                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 shrink-0 -mx-7 -mb-7 mt-4 flex gap-3">
                  {editingBooking && (
                    <button 
                      type="button"
                      onClick={() => handleDelete(editingBooking.id)}
                      className="px-6 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                      {t('form.delete')}
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={isLoading || (!!overlapInfo && !allowOverlap)}
                    className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingBooking ? t('form.save') : t('form.create'))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
    </>
  );
}


