"use client";

import { useState } from "react";
import { 
  Calendar, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Scissors, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Clock3
} from 'lucide-react';
import { updateBookingAction, deleteBookingAction, createBookingAction } from "@/app/actions/booking";
import { useRouter } from "next/navigation";
import { format, parse, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from 'lucide-react';

export default function BookingsClient({ 
  initialBookings,
  services,
  staff,
  tenantId
}: { 
  initialBookings: any[],
  services: any[],
  staff: any[],
  tenantId: string
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Todas");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    status: "CONFIRMED",
    serviceId: services[0]?.id || "",
    staffId: staff[0]?.id || "",
    branchId: staff[0]?.branchId || "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    durationMinutes: services[0]?.durationMinutes || 30
  });

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setFormData({
      customerName: "",
      customerEmail: "",
      status: "CONFIRMED",
      serviceId: services[0]?.id || "",
      staffId: staff[0]?.id || "",
      branchId: staff[0]?.branchId || "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      durationMinutes: services[0]?.durationMinutes || 30
    });
    setIsEditModalOpen(true);
  };

  const filteredBookings = initialBookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "Todas" || 
      (activeTab === "Confirmadas" && b.status === "CONFIRMED") ||
      (activeTab === "Pendientes" && b.status === "PENDING") ||
      (activeTab === "Canceladas" && b.status === "CANCELLED");
    return matchesSearch && matchesTab;
  });

  const handleOpenEdit = (booking: any) => {
    setEditingBooking(booking);
    setFormData({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail || "",
      status: booking.status,
      serviceId: booking.serviceId,
      staffId: booking.staffId,
      branchId: booking.branchId,
      date: format(new Date(booking.startTime), "yyyy-MM-dd"),
      time: format(new Date(booking.startTime), "HH:mm"),
      durationMinutes: Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)
    });
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
      alert("Error al guardar la cita");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de cancelar esta cita?")) return;
    
    const result = await deleteBookingAction(id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert("Error al eliminar la cita");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Citas / Reservas</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Control de agenda y seguimiento de clientes.</p>
        </div>
        <div className="flex gap-3">
             <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-300 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95">
                <Filter className="w-4 h-4" />
                Filtrar
            </button>
            <button 
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
            >
                <Calendar className="w-5 h-5" />
                Agendar Cita
            </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
            {['Todas', 'Pendientes', 'Confirmadas', 'Finalizadas', 'Canceladas'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-bold whitespace-nowrap px-6 py-3 rounded-2xl transition-all ${
                    activeTab === tab 
                    ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20 scale-105' 
                    : 'bg-white dark:bg-zinc-900 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}>
                    {tab}
                </button>
            ))}
        </div>
        <div className="lg:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
            />
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">No se encontraron citas.</p>
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
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
                                    booking.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' :
                                    'bg-rose-500/10 text-rose-500'
                                }`}>
                                    {booking.status === 'CONFIRMED' ? 'Confirmada' : (booking.status === 'PENDING' ? 'Pendiente' : 'Cancelada')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 flex-1">
                        <div className="space-y-1 min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servicio</p>
                            <div className="flex items-center gap-2">
                                < Scissors className="w-4 h-4 text-purple-500" />
                                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{booking.service?.name}</span>
                            </div>
                        </div>
                        <div className="space-y-1 min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                                  {format(new Date(booking.startTime), "d MMM yyyy · hh:mm a", { locale: es })}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1 min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atendido por</p>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-600 font-bold border border-purple-500/20">
                                    {booking.staff?.name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{booking.staff?.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-xl font-bold">Editar Cita</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Nombre del Cliente</label>
                <input 
                  required
                  type="text" 
                  value={formData.customerName}
                  onChange={e => setFormData({...formData, customerName: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Estado de la Cita</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm appearance-none"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="CONFIRMED">Confirmada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Servicio</label>
                  <select 
                    value={formData.serviceId}
                    onChange={e => setFormData({...formData, serviceId: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm appearance-none"
                  >
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Personal</label>
                  <select 
                    value={formData.staffId}
                    onChange={e => {
                      const s = staff.find(st => st.id === e.target.value);
                      setFormData({...formData, staffId: e.target.value, branchId: s?.branchId || formData.branchId})
                    }}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm appearance-none"
                  >
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Duración (min)</label>
                <div className="relative">
                  <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 0})}
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Fecha</label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Hora</label>
                  <input 
                    required
                    type="time" 
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

