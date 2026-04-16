"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Sparkles,
  Clock,
  DollarSign,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Info,
  Tag,
  Truck,
  Save
} from 'lucide-react';
import { Portal } from "@/components/Portal";
import { createServiceAction, updateServiceAction, deleteServiceAction, reorderServicesAction } from "@/app/actions/services";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import { updateHomeServiceTravelTimeAction } from "@/app/actions/tenant";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const PRESET_COLORS = [
  '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
];

export default function ServicesClient({
  initialServices,
  branches,
  categories = [],
  tenantId,
  initialTravelTime = 0
}: {
  initialServices: any[],
  branches: any[],
  categories?: any[],
  tenantId: string,
  initialTravelTime?: number
}) {
  const t = useTranslations('Dashboard.services');
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Travel time state — empty string means "no override set", 0 kept as number for the action
  const [travelTimeStr, setTravelTimeStr] = useState(initialTravelTime > 0 ? String(initialTravelTime) : '');
  const [savingTravelTime, setSavingTravelTime] = useState(false);
  const [travelTimeSaved, setTravelTimeSaved] = useState(false);

  const handleSaveTravelTime = async () => {
    setSavingTravelTime(true);
    const result = await updateHomeServiceTravelTimeAction(tenantId, parseInt(travelTimeStr) || 0);
    if (result.success) {
      setTravelTimeSaved(true);
      setTimeout(() => setTravelTimeSaved(false), 2000);
    }
    setSavingTravelTime(false);
  };

  // Category CRUD state
  const [catSearchTerm, setCatSearchTerm] = useState("");
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [catFormData, setCatFormData] = useState({ name: "", color: '#8b5cf6' });

  const handleOpenCatModal = (cat?: any) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({ name: cat.name, color: cat.color });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: "", color: '#8b5cf6' });
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return;
    setIsCatLoading(true);
    const result = editingCategory
      ? await updateCategoryAction({ id: editingCategory.id, tenantId, ...catFormData })
      : await createCategoryAction({ tenantId, ...catFormData });
    if (result.success) { setIsCatModalOpen(false); router.refresh(); }
    else alert("Error al guardar la categoría");
    setIsCatLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Se desvinculará de todos los servicios y personal asociados.")) return;
    const result = await deleteCategoryAction(id, tenantId);
    if (result.success) router.refresh();
    else alert("Error al eliminar la categoría");
  };

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    durationMinutes: 45,
    price: "20.00",
    description: "",
    includes: [] as string[],
    excludes: [] as string[],
    allowsHomeService: true,
    allowSimultaneous: false,
    branchIds: [] as string[],
    categoryIds: [] as string[]
  });

  const [availabilityType, setAvailabilityType] = useState<"all" | "specific">("all");
  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");

  const filteredServices = initialServices
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleOpenModal = (service?: any) => {
    if (service) {
      setEditingService(service);
      const serviceBranchIds = (service.branches || []).map((b: any) => b.branchId);
      const serviceCategoryIds = (service.categories || []).map((c: any) => c.categoryId);

      setFormData({
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        description: service.description || "",
        includes: service.includes || [],
        excludes: service.excludes || [],
        allowsHomeService: service.allowsHomeService ?? true,
        allowSimultaneous: service.allowSimultaneous ?? false,
        branchIds: serviceBranchIds,
        categoryIds: serviceCategoryIds
      });
      setAvailabilityType(serviceBranchIds.length > 0 ? "specific" : "all");
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        durationMinutes: 45,
        price: "20.00",
        description: "",
        includes: [],
        excludes: [],
        allowsHomeService: true,
        allowSimultaneous: false,
        branchIds: [],
        categoryIds: []
      });
      setAvailabilityType("all");
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const finalBranchIds = availabilityType === "all" ? [] : formData.branchIds;

    let result;
    if (editingService) {
      result = await updateServiceAction({
        id: editingService.id,
        tenantId,
        ...formData,
        branchIds: finalBranchIds,
        categoryIds: formData.categoryIds
      });
    } else {
      result = await createServiceAction({
        tenantId,
        ...formData,
        branchIds: finalBranchIds,
        categoryIds: formData.categoryIds,
        sortOrder: initialServices.length
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    
    const result = await deleteServiceAction(id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert(t('errorDelete'));
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

  const filteredCats = categories.filter(c =>
    c.name.toLowerCase().includes(catSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => activeTab === 'services' ? handleOpenModal() : handleOpenCatModal()}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'services' ? t('new') : 'Nueva categoría'}
        </button>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-white/5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
        >
          <Sparkles className="w-4 h-4" /> Servicios
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
        >
          <Tag className="w-4 h-4" /> Categorías
        </button>
      </div>

      {/* ---- SERVICES TAB ---- */}
      {activeTab === 'services' && (<>

      {/* Tiempo de traslado a domicilio */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Tiempo de traslado a domicilio</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Minutos de buffer antes y después de cada cita a domicilio para cubrir el desplazamiento del especialista.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5">
              <input
                type="number"
                min={0}
                max={120}
                step={5}
                value={travelTimeStr}
                onChange={e => setTravelTimeStr(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                className="w-16 bg-transparent text-center font-black text-slate-900 dark:text-white text-lg outline-none"
              />
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">min</span>
            </div>
            <button
              onClick={handleSaveTravelTime}
              disabled={savingTravelTime}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${travelTimeSaved ? 'bg-emerald-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'} disabled:opacity-60`}
            >
              {savingTravelTime ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : travelTimeSaved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {travelTimeSaved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
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

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-widest w-12">{t('table.order')}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-widest">{t('table.service')}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-widest">{t('table.inclusions')}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-widest w-32">{t('table.price')}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-widest w-24 text-center">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-600 dark:text-zinc-300">
            {filteredServices.map((service, idx) => (
              <tr 
                key={service.id} 
                onClick={() => handleOpenModal(service)}
                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(service.id, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 hover:text-purple-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(service.id, 'down');
                      }}
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
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block tracking-tight">{service.name}</span>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {service.durationMinutes} min
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {service.allowsHomeService && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold rounded-md uppercase tracking-wider border border-purple-500/20">
                            <Sparkles className="w-3 h-3" /> {t('form.badgeHomeService')}
                          </span>
                        )}
                        {(service.branches || []).length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-md uppercase tracking-widest border border-blue-500/10">
                            {t('form.badgeGlobal')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold rounded-md uppercase tracking-widest border border-amber-500/10">
                            {t('form.badgeExclusive')}
                          </span>
                        )}
                        {(service.categories || []).map((sc: any) => (
                          <span
                            key={sc.categoryId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider"
                            style={{ backgroundColor: sc.category?.color + '22', color: sc.category?.color }}
                          >
                            <Tag className="w-2.5 h-2.5" /> {sc.category?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex flex-col gap-2">
                    {service.includes && service.includes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {service.includes.map((inc: string, i: number) => (
                          <span key={i} className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {inc}
                          </span>
                        ))}
                      </div>
                    )}
                    {service.excludes && service.excludes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {service.excludes.map((exc: string, i: number) => (
                          <span key={i} className="text-xs font-bold bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full flex items-center gap-1.5">
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
                <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(service.id);
                      }}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                      title={t('confirmDelete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h3 className="text-xl font-black tracking-tight">{editingService ? t('form.edit') : t('form.new')}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.nameLabel')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                        placeholder={t('form.nameLabel')}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.durationLabel')}</label>
                      <input 
                        required
                        type="number" 
                        value={formData.durationMinutes}
                        onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.priceLabel')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 pr-4">
                         <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.allowsHomeServiceLabel')}</p>
                         <div className="group relative shrink-0">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-purple-500" />
                          <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-[11px] text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                            {t('form.allowsHomeServiceHint')}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, allowsHomeService: !formData.allowsHomeService})}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${formData.allowsHomeService ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.allowsHomeService ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-white/5 w-full" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 pr-4">
                         <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.allowSimultaneousLabel')}</p>
                         <div className="group relative shrink-0">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-purple-500" />
                          <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-[11px] text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                            {t('form.allowSimultaneousHint')}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, allowSimultaneous: !formData.allowSimultaneous})}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${formData.allowSimultaneous ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.allowSimultaneous ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-slate-200 dark:border-white/10">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('form.availabilityTypeLabel')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAvailabilityType("all")}
                        className={`p-3.5 rounded-xl text-xs font-bold transition-all border ${availabilityType === "all" ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-white/5'}`}
                      >
                        {t('form.allBranchesOption')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailabilityType("specific")}
                        className={`p-3.5 rounded-xl text-xs font-bold transition-all border ${availabilityType === "specific" ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-white/5'}`}
                      >
                        {t('form.specificBranchesOption')}
                      </button>
                    </div>

                    {availabilityType === "specific" && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-[11px] font-bold text-slate-400 mb-3 ml-1 uppercase tracking-wider">{t('form.exclusiveBranchesLabel')}</p>
                        <div className="flex flex-col gap-2">
                          {branches.map(branch => {
                            const isSelected = formData.branchIds.includes(branch.id);
                            return (
                              <button
                                key={branch.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    branchIds: isSelected 
                                      ? prev.branchIds.filter(id => id !== branch.id)
                                      : [...prev.branchIds, branch.id]
                                  }));
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/5 text-slate-500'}`}
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-300 dark:border-white/20'}`}>
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-xs font-bold">{branch.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="space-y-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-slate-200 dark:border-white/10 col-span-full">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-500" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Categorías de especialidad</p>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium -mt-2">Solo el personal con las mismas categorías aparecerá al reservar este servicio.</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat: any) => {
                        const isSelected = formData.categoryIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              categoryIds: isSelected
                                ? prev.categoryIds.filter(id => id !== cat.id)
                                : [...prev.categoryIds, cat.id]
                            }))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${isSelected ? 'text-white border-transparent shadow-md' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-500'}`}
                            style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                          >
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : cat.color }} />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.descriptionLabel')}</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium min-h-[100px] resize-none"
                    placeholder={t('form.descriptionPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {t('form.includesLabel')}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newInclude}
                        onChange={e => setNewInclude(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('includes'))}
                        className="flex-1 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500"
                        placeholder={t('form.newIncludePlaceholder')}
                      />
                      <button type="button" onClick={() => addTag('includes')} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.includes.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold">
                          {tag}
                          <button type="button" onClick={() => removeTag('includes', i)} className="hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-rose-600 flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> {t('form.excludesLabel')}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newExclude}
                        onChange={e => setNewExclude(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('excludes'))}
                        className="flex-1 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-rose-500"
                        placeholder={t('form.newExcludePlaceholder')}
                      />
                      <button type="button" onClick={() => addTag('excludes')} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.excludes.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold">
                          {tag}
                          <button type="button" onClick={() => removeTag('excludes', i)} className="hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                      editingService ? t('form.save') : t('form.create')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      </>)}

      {/* ---- CATEGORIES TAB ---- */}
      {activeTab === 'categories' && (<>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={catSearchTerm}
            onChange={e => setCatSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {filteredCats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-zinc-600">
            <Tag className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm font-black uppercase tracking-widest">Sin categorías</p>
            <p className="text-xs mt-2 text-slate-400">Crea categorías para organizar tu equipo y servicios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCats.map((cat: any) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: cat.color + '22', color: cat.color }}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{cat.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-slate-400 font-mono">{cat.color}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenCatModal(cat)}
                    className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-500/5 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCatModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCatModalOpen(false)} />
              <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                  <h3 className="text-xl font-black tracking-tight">
                    {editingCategory ? "Editar categoría" : "Nueva categoría"}
                  </h3>
                  <button onClick={() => setIsCatModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSaveCategory} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Nombre</label>
                    <input
                      required
                      type="text"
                      value={catFormData.name}
                      onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                      placeholder="Ej: Uñas, Cabello, Masajes..."
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCatFormData({ ...catFormData, color })}
                          className={`w-8 h-8 rounded-xl transition-all ${catFormData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-zinc-900 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-xl shrink-0" style={{ backgroundColor: catFormData.color }} />
                      <input
                        type="text"
                        value={catFormData.color}
                        onChange={e => setCatFormData({ ...catFormData, color: e.target.value })}
                        className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCatLoading}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm"
                    >
                      {isCatLoading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        : (editingCategory ? "Guardar cambios" : "Crear categoría")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}
      </>)}
    </div>
  );
}
