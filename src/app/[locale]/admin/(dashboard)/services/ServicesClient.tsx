"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Scissors, 
  Clock, 
  DollarSign, 
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { createServiceAction, updateServiceAction, deleteServiceAction, reorderServicesAction } from "@/app/actions/services";
import { useRouter } from "next/navigation";

export default function ServicesClient({ 
  initialServices,
  tenantId 
}: { 
  initialServices: any[],
  tenantId: string 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    durationMinutes: 45,
    price: "20.00",
    description: "",
    includes: [] as string[],
    excludes: [] as string[]
  });

  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");

  const filteredServices = initialServices
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleOpenModal = (service?: any) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        description: service.description || "",
        includes: service.includes || [],
        excludes: service.excludes || []
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        durationMinutes: 45,
        price: "20.00",
        description: "",
        includes: [],
        excludes: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let result;
    if (editingService) {
      result = await updateServiceAction({
        id: editingService.id,
        tenantId,
        ...formData
      });
    } else {
      result = await createServiceAction({
        tenantId,
        ...formData,
        sortOrder: initialServices.length
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert("Error al guardar el servicio");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;
    
    const result = await deleteServiceAction(id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert("Error al eliminar el servicio");
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = filteredServices.findIndex(s => s.id === id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === filteredServices.length - 1) return;

    const newOrder = [...filteredServices];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    const orderedIds = newOrder.map(s => s.id);
    await reorderServicesAction(tenantId, orderedIds);
    router.refresh();
  };

  const addTag = (type: 'includes' | 'excludes') => {
    const val = type === 'includes' ? newInclude : newExclude;
    if (!val.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], val.trim()]
    }));
    
    if (type === 'includes') setNewInclude("");
    else setNewExclude("");
  };

  const removeTag = (type: 'includes' | 'excludes', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Servicios</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Gestiona el catálogo de servicios, inclusiones y el orden de aparición.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo servicio
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest w-12">Orden</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Servicio</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Inclusiones / Exclusiones</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Precio</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-600 dark:text-zinc-300">
            {filteredServices.map((service, idx) => (
              <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-6">
                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => handleReorder(service.id, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:text-purple-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleReorder(service.id, 'down')}
                      disabled={idx === filteredServices.length - 1}
                      className="p-1 hover:text-purple-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{service.name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.durationMinutes} min
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex flex-col gap-2">
                    {service.includes && service.includes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {service.includes.map((inc: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {inc}
                          </span>
                        ))}
                      </div>
                    )}
                    {service.excludes && service.excludes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {service.excludes.map((exc: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" /> {exc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>{service.price}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(service)}
                      className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
              <h3 className="text-xl font-bold">{editingService ? 'Editar servicio' : 'Nuevo servicio'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Nombre del servicio</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                    placeholder="Ej: Corte básico"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Duración (min)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.durationMinutes}
                      onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Precio ($)</label>
                    <input 
                      required
                      type="text" 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">Descripción (Opcional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm min-h-[80px] resize-none"
                  placeholder="Describe qué incluye el servicio..."
                />
              </div>

              {/* Inclusiones / Exclusiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Inclusiones
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newInclude}
                      onChange={e => setNewInclude(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('includes'))}
                      className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-emerald-500/50"
                      placeholder="Nueva inclusión..."
                    />
                    <button type="button" onClick={() => addTag('includes')} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.includes.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold">
                        {tag}
                        <button type="button" onClick={() => removeTag('includes', i)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-rose-500 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Exclusiones
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newExclude}
                      onChange={e => setNewExclude(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('excludes'))}
                      className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-rose-500/50"
                      placeholder="Nueva exclusión..."
                    />
                    <button type="button" onClick={() => addTag('excludes')} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.excludes.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold">
                        {tag}
                        <button type="button" onClick={() => removeTag('excludes', i)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    editingService ? 'Guardar cambios' : 'Crear servicio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
