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
  GripVertical,
  Info
} from 'lucide-react';
import { Portal } from "@/components/Portal";
import { createServiceAction, updateServiceAction, deleteServiceAction, reorderServicesAction } from "@/app/actions/services";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ServicesClient({ 
  initialServices,
  branches,
  tenantId 
}: { 
  initialServices: any[],
  branches: any[],
  tenantId: string 
}) {
  const t = useTranslations('Dashboard.services');
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
    excludes: [] as string[],
    allowsHomeService: true,
    branchIds: [] as string[]
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
      
      setFormData({
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        description: service.description || "",
        includes: service.includes || [],
        excludes: service.excludes || [],
        allowsHomeService: service.allowsHomeService ?? true,
        branchIds: serviceBranchIds
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
        branchIds: []
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
        branchIds: finalBranchIds
      });
    } else {
      result = await createServiceAction({
        tenantId,
        ...formData,
        branchIds: finalBranchIds,
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t('new')}
        </button>
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
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
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

                  <div className="flex items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
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
    </div>
  );
}
