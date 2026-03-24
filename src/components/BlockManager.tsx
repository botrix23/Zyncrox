"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, User, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { createBlockAction, getBlocksAction, deleteBlockAction } from "@/app/actions/blocks";
import { format, parseISO, isAfter } from "date-fns";
import { es } from "date-fns/locale";

interface BlockManagerProps {
  branchId: string;
  branchName: string;
  tenantId: string;
  staff: any[];
  onClose: () => void;
}

export default function BlockManager({ branchId, branchName, tenantId, staff, onClose }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    staffId: "", // Empty means entire branch
    reason: "",
    date: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    isRange: false,
    startTime: "08:00",
    endTime: "18:00"
  });

  const branchStaff = staff.filter(s => s.branchId === branchId);

  const fetchBlocks = async () => {
    setIsLoading(true);
    const result = await getBlocksAction(branchId, tenantId);
    if (result.success) {
      setBlocks(result.blocks || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBlocks();
  }, [branchId]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    const start = new Date(`${formData.date}T${formData.startTime}:00Z`);
    const end = formData.isRange 
      ? new Date(`${formData.endDate}T${formData.endTime}:00Z`)
      : new Date(`${formData.date}T${formData.endTime}:00Z`);

    if (!isAfter(end, start)) {
      setError("La fecha/hora de fin debe ser posterior a la de inicio");
      setIsCreating(false);
      return;
    }

    const result = await createBlockAction({
      tenantId,
      branchId,
      staffId: formData.staffId || null,
      reason: formData.reason,
      startTime: start,
      endTime: end
    });

    if (result.success) {
      setFormData({ ...formData, reason: "", isRange: false });
      fetchBlocks();
    } else {
      setError(result.error || "Error al crear el bloqueo");
    }
    setIsCreating(false);
  };

  const handleDeleteBlock = async (id: string) => {
    const result = await deleteBlockAction(id, tenantId);
    if (result.success) {
      fetchBlocks();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold">Gestionar Bloqueos</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Sucursal: {branchName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Formulario de Creación */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/5">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Nuevo Bloqueo</h4>
                
                <form onSubmit={handleCreateBlock} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">¿A quién aplica?</label>
                    <select
                      value={formData.staffId}
                      onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all appearance-none"
                    >
                      <option value="">Toda la sucursal</option>
                      {branchStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-4 p-1 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-white/10">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isRange: false})}
                      className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isRange ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    >
                      Día Único
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isRange: true})}
                      className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isRange ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    >
                      Rango / Varias Días
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        {formData.isRange ? 'Fecha Inicio' : 'Fecha'}
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                      />
                    </div>
                    {formData.isRange && (
                      <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fecha Fin</label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Desde</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hasta</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Motivo (Opcional)</label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={e => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Ej: Vacaciones, Mantenimiento..."
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-500 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Crear bloqueo
                  </button>
                </form>
              </div>
            </div>

            {/* Lista de Bloqueos existentes */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Bloqueos Activos</h4>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-400">Cargando bloqueos...</p>
                </div>
              ) : blocks.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5">
                  <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">No hay bloqueos activos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {blocks.map(block => (
                    <div key={block.id} className="group p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-purple-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {format(new Date(block.startTime), "d 'de' MMM", { locale: es })}
                              {format(new Date(block.startTime), "yyyy-MM-dd") !== format(new Date(block.endTime), "yyyy-MM-dd") && (
                                <span className="mx-1 text-slate-400">al {format(new Date(block.endTime), "d 'de' MMM", { locale: es })}</span>
                              )}
                            </p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                              {format(new Date(block.startTime), "HH:mm")} - {format(new Date(block.endTime), "HH:mm")}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {block.staffId ? (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded-full">
                                  <User className="w-3 h-3" />
                                  {staff.find(s => s.id === block.staffId)?.name}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full">
                                  Toda la sucursal
                                </span>
                              )}
                              {block.reason && (
                                <span className="text-[10px] text-slate-500 font-medium italic">
                                  "{block.reason}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-end">
           <button onClick={onClose} className="px-8 py-3 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-white rounded-2xl text-sm font-bold transition-all hover:bg-slate-300 dark:hover:bg-zinc-700">
              Cerrar
           </button>
        </div>

      </div>
    </div>
  );
}
