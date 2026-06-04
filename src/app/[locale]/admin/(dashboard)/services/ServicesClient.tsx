"use client";

import { useState, useEffect } from "react";
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
  Save,
  Users,
  Power,
  PowerOff,
  Home,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { canUseFeature } from "@/core/plans";
import { Portal } from "@/components/Portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createServiceAction, updateServiceAction, deleteServiceAction, reorderServicesAction, toggleServiceActiveAction } from "@/app/actions/services";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import { updateHomeServiceTravelTimeAction, updateHomeServiceSettingsAction } from "@/app/actions/tenant";
import { createCoverageZoneAction, deleteCoverageZoneAction, updateCoverageZoneAction } from "@/app/actions/zones";
import { useRouter, useParams } from "next/navigation";
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
  initialTravelTime = 0,
  planLimit,
  plan,
  allowsHomeService: initialAllowsHomeService = true,
  homeServiceTermsEnabled: initialTermsEnabled = false,
  homeServiceTerms: initialTerms = '',
  homeServiceLeadDays: initialLeadDays = 0,
  initialZones = [],
}: {
  initialServices: any[],
  branches: any[],
  categories?: any[],
  tenantId: string,
  initialTravelTime?: number,
  planLimit?: number,
  plan?: string,
  allowsHomeService?: boolean,
  homeServiceTermsEnabled?: boolean,
  homeServiceTerms?: string,
  homeServiceLeadDays?: number,
  initialZones?: any[],
}) {
  const limit = planLimit ?? 999;

  // Local list state — synced via useEffect when router.refresh() pushes new props
  const [serviceList, setServiceList] = useState<any[]>(initialServices);
  useEffect(() => { setServiceList(initialServices); }, [initialServices]);

  const activeServices = serviceList.filter(s => s.isActive !== false);
  const atLimit = activeServices.length >= limit;
  const t = useTranslations('Dashboard.services');
  const tPortal = useTranslations('Dashboard.portal');
  const [activeTab, setActiveTab] = useState<'services' | 'categories' | 'domicilio'>('services');
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Card expansion state
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const MAX_CAT = 2;
  const toggleDetails = (id: string) => setExpandedDetails(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleCats = (id: string) => setExpandedCats(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'es';

  // Domicilio tab state
  const [domAllowsHomeService, setDomAllowsHomeService] = useState(initialAllowsHomeService);
  const [domTermsEnabled, setDomTermsEnabled] = useState(initialTermsEnabled);
  const [domTerms, setDomTerms] = useState(initialTerms);
  const [domLeadDays, setDomLeadDays] = useState(initialLeadDays);
  const [zones, setZones] = useState<any[]>(initialZones);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', fee: '0', description: '' });
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [domMessage, setDomMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSavingDom, setIsSavingDom] = useState(false);

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

  // Domicilio handlers
  const handleSaveDomicilio = async () => {
    setIsSavingDom(true);
    setDomMessage(null);
    const result = await updateHomeServiceSettingsAction({
      tenantId,
      allowsHomeService: domAllowsHomeService,
      homeServiceTermsEnabled: domTermsEnabled,
      homeServiceTerms: domTerms,
      homeServiceLeadDays: domLeadDays,
    });
    if (result.success) {
      setDomMessage({ type: 'success', text: tPortal('successSave') });
      router.refresh();
    } else {
      setDomMessage({ type: 'error', text: tPortal('errorSave') });
    }
    setIsSavingDom(false);
  };

  const handleAddZone = async () => {
    if (!newZone.name) return;
    const res = await createCoverageZoneAction({ tenantId, ...newZone });
    if (res.success) {
      setZones([...zones, (res as any).zone]);
      setNewZone({ name: '', fee: '0', description: '' });
      setIsAddingZone(false);
    }
  };

  const handleDeleteZone = (id: string) => {
    setDeleteZoneId(id);
  };

  const handleToggleZone = (zone: any) => setPendingToggleZone(zone);

  const confirmToggleZone = async () => {
    if (!pendingToggleZone) return;
    const zone = pendingToggleZone;
    setPendingToggleZone(null);
    const newActive = zone.isActive === false ? true : false;
    const res = await updateCoverageZoneAction({ id: zone.id, isActive: newActive });
    if (res.success) {
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: newActive } : z));
    }
  };

  const confirmDeleteZone = async () => {
    if (!deleteZoneId) return;
    const id = deleteZoneId;
    setDeleteZoneId(null);
    const res = await deleteCoverageZoneAction(id);
    if (res.success) {
      setZones(zones.filter(z => z.id !== id));
    }
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

  const [deleteCatIdSvc, setDeleteCatIdSvc] = useState<string | null>(null);

  const handleDeleteCategory = (id: string) => {
    setDeleteCatIdSvc(id);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatIdSvc) return;
    const id = deleteCatIdSvc;
    setDeleteCatIdSvc(null);
    await deleteCategoryAction(id, tenantId);
    router.refresh();
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
    isExclusive: false,
    branchIds: [] as string[],
    categoryIds: [] as string[]
  });

  const [availabilityType, setAvailabilityType] = useState<"all" | "specific">("all");
  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");

  const handleToggleActive = (service: any) => setPendingToggleService(service);

  const confirmToggleService = async () => {
    if (!pendingToggleService) return;
    const service = pendingToggleService;
    setPendingToggleService(null);
    const newActive = service.isActive === false;
    const result = await toggleServiceActiveAction(service.id, tenantId, service.isActive !== false);
    if (!result.success) {
      if (result.error === 'PLAN_LIMIT_EXCEEDED') {
        alert(t('planLimitReactivate'));
      } else {
        alert(t('toggleError'));
      }
    } else {
      setServiceList(prev => prev.map(s =>
        s.id === service.id ? { ...s, isActive: newActive } : s
      ));
    }
  };

  const filteredServices = serviceList
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
        isExclusive: service.isExclusive ?? false,
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
        isExclusive: false,
        branchIds: [],
        categoryIds: []
      });
      setNewInclude("");
      setNewExclude("");
      setAvailabilityType("all");
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.durationMinutes < 15) {
      alert(t('form.durationMinError'));
      return;
    }

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
        sortOrder: serviceList.length
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else if ((result as any).error === 'PLAN_LIMIT_EXCEEDED') {
      alert(t('planLimitReactivate'));
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [pendingToggleService, setPendingToggleService] = useState<any | null>(null);
  const [pendingToggleZone, setPendingToggleZone] = useState<any | null>(null);

  const handleDelete = (id: string) => {
    setDeleteServiceId(id);
  };

  const confirmDeleteService = async () => {
    if (!deleteServiceId) return;
    const id = deleteServiceId;
    setDeleteServiceId(null);
    const result = await deleteServiceAction(id, tenantId);
    if (result.success) {
      setServiceList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = filteredServices.findIndex(s => s.id === id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === filteredServices.length - 1) return;

    const newOrder = [...filteredServices];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    const reindexed = newOrder.map((s, i) => ({ ...s, sortOrder: i }));
    setServiceList(prev => {
      const filteredIds = new Set(reindexed.map(s => s.id));
      const unchanged = prev.filter(s => !filteredIds.has(s.id));
      return [...unchanged, ...reindexed].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });

    const orderedIds = newOrder.map(s => s.id);
    await reorderServicesAction(tenantId, orderedIds);
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
    <>
    <ConfirmDialog
      open={!!deleteServiceId}
      title={t('confirmDelete')}
      message={t('deleteServiceMsg')}
      confirmLabel={t('deleteConfirmLabel')}
      variant="danger"
      onConfirm={confirmDeleteService}
      onCancel={() => setDeleteServiceId(null)}
    />
    <ConfirmDialog
      open={!!deleteCatIdSvc}
      title={t('confirmDeleteCategory')}
      message={t('deleteCategoryMsg')}
      confirmLabel={t('deleteConfirmLabel')}
      variant="danger"
      onConfirm={confirmDeleteCategory}
      onCancel={() => setDeleteCatIdSvc(null)}
    />
    <ConfirmDialog
      open={!!deleteZoneId}
      title={tPortal('form.deleteZoneConfirm')}
      message="La zona de cobertura se eliminará. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      variant="danger"
      onConfirm={confirmDeleteZone}
      onCancel={() => setDeleteZoneId(null)}
    />
    <ConfirmDialog
      open={!!pendingToggleService}
      title={pendingToggleService?.isActive === false ? t('confirmActivateTitle') : t('confirmDeactivateTitle')}
      message={(pendingToggleService?.isActive === false ? t('confirmActivateMsg') : t('confirmDeactivateMsg')).replace('{name}', pendingToggleService?.name ?? '')}
      confirmLabel={t('confirmToggleBtn')}
      cancelLabel={locale === 'es' ? 'Cancelar' : 'Cancel'}
      variant="warning"
      onConfirm={confirmToggleService}
      onCancel={() => setPendingToggleService(null)}
    />
    <ConfirmDialog
      open={!!pendingToggleZone}
      title={pendingToggleZone?.isActive === false ? (locale === 'es' ? 'Activar zona' : 'Activate zone') : (locale === 'es' ? 'Desactivar zona' : 'Deactivate zone')}
      message={pendingToggleZone?.isActive === false
        ? (locale === 'es' ? `"${pendingToggleZone?.name}" volverá a estar disponible.` : `"${pendingToggleZone?.name}" will be available again.`)
        : (locale === 'es' ? `"${pendingToggleZone?.name}" no aparecerá en el widget.` : `"${pendingToggleZone?.name}" will not appear in the widget.`)}
      confirmLabel={locale === 'es' ? 'Confirmar' : 'Confirm'}
      cancelLabel={locale === 'es' ? 'Cancelar' : 'Cancel'}
      variant="warning"
      onConfirm={confirmToggleZone}
      onCancel={() => setPendingToggleZone(null)}
    />
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'services' && limit < 999 && (
            <span className={`text-sm font-bold px-4 py-3 rounded-2xl border ${
              atLimit
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : serviceList.length >= limit - 1
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400'
            }`}>
              {activeServices.length} / {limit}
            </span>
          )}
          {activeTab !== 'domicilio' && (
            <button
              onClick={() => activeTab === 'services' ? (!atLimit && handleOpenModal()) : handleOpenCatModal()}
              disabled={activeTab === 'services' && atLimit}
              title={activeTab === 'services' && atLimit ? `Límite de ${limit} servicios alcanzado. Actualiza tu plan para agregar más.` : undefined}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${
                activeTab === 'services' && atLimit
                  ? 'bg-slate-200 dark:bg-zinc-700 text-slate-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95'
              }`}
            >
              <Plus className="w-5 h-5" />
              {activeTab === 'services' ? t('new') : 'Nueva categoría'}
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher — desktop */}
      <div className="hidden md:flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === 'services' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
        >
          <Sparkles className="w-4 h-4 shrink-0" /> {t('tabServices')}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === 'categories' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
        >
          <Tag className="w-4 h-4 shrink-0" /> {t('tabCategories')}
        </button>
        <button
          onClick={() => setActiveTab('domicilio')}
          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === 'domicilio' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
        >
          <Home className="w-4 h-4 shrink-0" /> {t('tabDomicilio')}
        </button>
      </div>
      {/* Tab switcher — mobile */}
      <div className="md:hidden relative">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value as any)}
          className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        >
          <option value="services">{t('tabServices')}</option>
          <option value="categories">{t('tabCategories')}</option>
          <option value="domicilio">{t('tabDomicilio')}</option>
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* ---- SERVICES TAB ---- */}
      {activeTab === 'services' && (<>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>
        <div className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            {searchTerm ? `Encontrados: ${filteredServices.length}` : `Total servicios: ${serviceList.length}`}
          </p>
        </div>
      </div>

      {/* Mobile cards — solo en pantallas pequeñas */}
      <div className="md:hidden space-y-3">
        {filteredServices.map((service, idx) => {
          const isInactive = service.isActive === false;
          return (
          <div
            key={service.id}
            onClick={() => !isInactive && handleOpenModal(service)}
            className={`border rounded-2xl p-4 shadow-sm transition-all ${isInactive ? 'bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-white/5 opacity-60 cursor-default' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/5 hover:border-purple-500/50 cursor-pointer'}`}
          >
            {isInactive && (
              <span className="inline-block mb-2 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {t('deactivated')}
              </span>
            )}
            <div className="flex items-start gap-3">
              {/* Reorder + icono */}
              <div className="flex flex-col items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => { e.stopPropagation(); if (!isInactive) handleReorder(service.id, 'up'); }}
                  disabled={idx === 0 || isInactive}
                  className="p-1 text-slate-400 hover:text-purple-500 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isInactive ? 'bg-slate-200 dark:bg-zinc-700 text-slate-400' : 'bg-purple-500/10 text-purple-600'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (!isInactive) handleReorder(service.id, 'down'); }}
                  disabled={idx === filteredServices.length - 1 || isInactive}
                  className="p-1 text-slate-400 hover:text-purple-500 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white leading-tight">{service.name}</span>
                  <div className="flex items-center gap-0.5 font-bold text-slate-900 dark:text-white shrink-0 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    {service.price}
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" /> {service.durationMinutes} min
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {service.allowsHomeService && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-md uppercase tracking-wider border border-purple-500/20">
                      <Sparkles className="w-2.5 h-2.5" /> {t('form.badgeHomeService')}
                    </span>
                  )}
                  {service.allowSimultaneous && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-md uppercase tracking-widest border border-emerald-500/10">
                      <Users className="w-2.5 h-2.5" /> {t('form.badgeSimultaneous')}
                    </span>
                  )}
                  {service.isExclusive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-md uppercase tracking-widest border border-amber-500/10">
                      {t('form.badgeExclusive')}
                    </span>
                  )}
                  {/* Categories: max 2 visible + overflow chip */}
                  {!service.isExclusive && (() => {
                    const cats: any[] = service.categories || [];
                    const allExpanded = expandedCats.has(service.id);
                    const visible = allExpanded ? cats : cats.slice(0, MAX_CAT);
                    const overflow = cats.length - MAX_CAT;
                    return (
                      <>
                        {visible.map((sc: any) => (
                          <span
                            key={sc.categoryId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md uppercase tracking-wider"
                            style={{ backgroundColor: sc.category?.color + '22', color: sc.category?.color }}
                          >
                            <Tag className="w-2 h-2" /> {sc.category?.name}
                          </span>
                        ))}
                        {!allExpanded && overflow > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleCats(service.id); }}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                          >
                            +{overflow} {t('moreCategories')}
                          </button>
                        )}
                        {allExpanded && overflow > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleCats(service.id); }}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                          >
                            {t('fewerCategories')}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* Branch info — always visible, no GLOBAL badge */}
                {!service.isExclusive && (
                  (service.branches || []).length === 0 ? (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-bold text-blue-500 dark:text-blue-400">{t('form.globalServiceNote')}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400">{t('form.specificServiceNote')}</p>
                    </div>
                  )
                )}
                {/* Inclusiones / exclusiones — chips con acordeón separado */}
                {((service.includes?.length > 0) || (service.excludes?.length > 0)) && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {service.includes?.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleDetails(service.id + '-incl'); }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${expandedDetails.has(service.id + '-incl') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {service.includes.length} {t('includedChip')}
                          <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${expandedDetails.has(service.id + '-incl') ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      {service.excludes?.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleDetails(service.id + '-excl'); }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${expandedDetails.has(service.id + '-excl') ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}
                        >
                          <XCircle className="w-2.5 h-2.5" />
                          {service.excludes.length} {t('excludedChip')}
                          <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${expandedDetails.has(service.id + '-excl') ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {expandedDetails.has(service.id + '-incl') && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(service.includes || []).map((inc: string, i: number) => (
                          <span key={i} className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {inc}
                          </span>
                        ))}
                      </div>
                    )}
                    {expandedDetails.has(service.id + '-excl') && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(service.excludes || []).map((exc: string, i: number) => (
                          <span key={i} className="text-xs font-bold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" /> {exc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => { e.stopPropagation(); handleToggleActive(service); }}
                  className={`p-2 rounded-xl transition-all ${isInactive ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                  title={isInactive ? t('reactivate') : t('inactive')}
                >
                  {isInactive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(service.id); }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                  title={t('confirmDelete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Desktop table — oculta en móvil */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
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
            {filteredServices.map((service, idx) => {
              const isInactiveSvc = service.isActive === false;
              return (
              <tr
                key={service.id}
                onClick={() => !isInactiveSvc && handleOpenModal(service)}
                className={`transition-colors group ${isInactiveSvc ? 'opacity-55 cursor-default bg-slate-50/60 dark:bg-zinc-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer'}`}
              >
                <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReorder(service.id, 'up'); }}
                      disabled={idx === 0}
                      className="p-1 hover:text-purple-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReorder(service.id, 'down'); }}
                      disabled={idx === filteredServices.length - 1}
                      className="p-1 hover:text-purple-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInactiveSvc ? 'bg-slate-200 dark:bg-zinc-700 text-slate-400' : 'bg-purple-500/10 text-purple-600'}`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white block tracking-tight">{service.name}</span>
                        {isInactiveSvc && (
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {t('deactivated')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {service.durationMinutes} min
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {service.allowsHomeService && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-md uppercase tracking-wider border border-purple-500/20">
                            <Sparkles className="w-3 h-3" /> {t('form.badgeHomeService')}
                          </span>
                        )}
                        {service.allowSimultaneous && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-md uppercase tracking-widest border border-emerald-500/10">
                            <Users className="w-3 h-3" /> {t('form.badgeSimultaneous')}
                          </span>
                        )}
                        {service.isExclusive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-md uppercase tracking-widest border border-amber-500/10">
                            {t('form.badgeExclusive')}
                          </span>
                        )}
                        {/* Categories: max 2 + overflow chip */}
                        {!service.isExclusive && (() => {
                          const cats: any[] = service.categories || [];
                          const allExpanded = expandedCats.has(service.id);
                          const visible = allExpanded ? cats : cats.slice(0, MAX_CAT);
                          const overflow = cats.length - MAX_CAT;
                          return (
                            <>
                              {visible.map((sc: any) => (
                                <span
                                  key={sc.categoryId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider"
                                  style={{ backgroundColor: sc.category?.color + '22', color: sc.category?.color }}
                                >
                                  <Tag className="w-2.5 h-2.5" /> {sc.category?.name}
                                </span>
                              ))}
                              {!allExpanded && overflow > 0 && (
                                <button
                                  onClick={e => { e.stopPropagation(); toggleCats(service.id); }}
                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                                >
                                  +{overflow} {t('moreCategories')}
                                </button>
                              )}
                              {allExpanded && overflow > 0 && (
                                <button
                                  onClick={e => { e.stopPropagation(); toggleCats(service.id); }}
                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                                >
                                  {t('fewerCategories')}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {!service.isExclusive && (
                        (service.branches || []).length === 0 ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-purple-500 shrink-0" />
                            <p className="text-xs font-bold text-blue-500 dark:text-blue-400">{t('form.globalServiceNote')}</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-purple-500 shrink-0" />
                            <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400">{t('form.specificServiceNote')}</p>
                          </div>
                        )
                      )}
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
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(service); }}
                      className={`p-3 rounded-xl transition-all ${isInactiveSvc ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                      title={isInactiveSvc ? t('reactivate') : t('inactive')}
                    >
                      {isInactiveSvc ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-xl transition-all"
                      title={t('confirmDelete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
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
                        min={15}
                        onChange={e => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && n > 0) setFormData({...formData, durationMinutes: n});
                        }}
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
                          <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
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
                          <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
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

                    <div className="h-px bg-slate-200 dark:bg-white/5 w-full" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 pr-4">
                         <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.isExclusiveLabel')}</p>
                         <div className="group relative shrink-0">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-amber-500" />
                          <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                            {t('form.isExclusiveHint')}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          isExclusive: !formData.isExclusive,
                          // Al activar exclusivo, forzar que no esté disponible a domicilio
                          allowsHomeService: formData.isExclusive ? formData.allowsHomeService : false
                        })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${formData.isExclusive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/20'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isExclusive ? 'translate-x-4' : 'translate-x-0'}`} />
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
                        <p className="text-xs font-bold text-slate-400 mb-3 ml-1 uppercase tracking-wider">{t('form.exclusiveBranchesLabel')}</p>
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
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('categoryTitle')}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-medium -mt-2">{t('categoryHint')}</p>
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
        {!canUseFeature(plan, 'staffCategories') ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-3xl border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-200 dark:bg-white/10">
              <Lock className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-bold text-slate-800 dark:text-white text-lg">{t('categoriesUpgradeTitle')}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('categoriesUpgradeDesc')}</p>
            </div>
            <a href={`/${locale}/admin/billing`} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity">
              {t('categoriesUpgradeCta')}
            </a>
          </div>
        ) : (<>
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
            <p className="text-sm font-black uppercase tracking-widest">{t('noCategoriesTitle')}</p>
            <p className="text-xs mt-2 text-slate-400">{t('noCategoriesDesc')}</p>
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
                    {editingCategory ? t('editCategory') : t('newCategory')}
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
                        : (editingCategory ? t('saveChanges') : t('saveCategory'))}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}
      </>)}
      </>)}

      {/* ---- DOMICILIO TAB ---- */}
      {activeTab === 'domicilio' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Status message */}
          {domMessage && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
              domMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
            }`}>
              {domMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-bold text-sm">{domMessage.text}</p>
            </div>
          )}

          {/* Tiempo de traslado */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('travelTimeTitle')}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{t('travelTimeDesc')}</p>
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
                  {travelTimeSaved ? t('travelTimeSaved') : t('travelTimeSave')}
                </button>
              </div>
            </div>
          </div>

          {/* Home service config */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold">{tPortal('sections.homeService')}</h2>
            </div>

            {/* allowsHomeService toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.allowsHomeService')}</label>
              <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 min-h-[64px]">
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{tPortal('form.allowsHomeServiceLabel')}</p>
                  <p className="text-xs text-slate-500 italic">{tPortal('form.allowsHomeServiceHint')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" checked={domAllowsHomeService} onChange={e => setDomAllowsHomeService(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {domAllowsHomeService && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 border-l-2 border-purple-500 pl-4 ml-2">
                {/* Terms */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.terms')}</label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{tPortal('form.termsRequired')}</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={domTermsEnabled} onChange={e => setDomTermsEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                {domTermsEnabled && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                      {tPortal('form.termsContent')} <span title={tPortal('form.termsTooltip')}><Info className="w-3.5 h-3.5 text-zinc-500" /></span>
                    </label>
                    <textarea
                      value={domTerms}
                      onChange={e => setDomTerms(e.target.value)}
                      placeholder={tPortal('form.termsPlaceholder')}
                      className="w-full min-h-[120px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none text-sm"
                    />
                  </div>
                )}

                {/* Lead days + zones */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-6">
                  {/* Lead days */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.leadDays')}</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={domLeadDays}
                        onChange={e => setDomLeadDays(parseInt(e.target.value) || 0)}
                        className="w-24 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-black text-center"
                      />
                      <p className="text-xs text-slate-500 italic flex-1">{tPortal('form.leadDaysHint')}</p>
                    </div>
                  </div>

                  {/* Coverage zones */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.zoneTitle')}</label>
                      <button
                        type="button"
                        onClick={() => setIsAddingZone(true)}
                        className="px-4 py-2 bg-purple-500/10 text-purple-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all active:scale-95"
                      >
                        {tPortal('form.addZone')}
                      </button>
                    </div>

                    {isAddingZone && (
                      <div className="p-5 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/20 rounded-3xl space-y-4 animate-in zoom-in-95 duration-200 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{tPortal('form.newZoneName')}</label>
                            <input
                              placeholder={tPortal('form.newZoneName')}
                              value={newZone.name}
                              onChange={e => setNewZone({...newZone, name: e.target.value})}
                              className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{tPortal('form.newZoneFee')}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">$</span>
                              <input
                                type="number"
                                placeholder={tPortal('form.newZoneFee')}
                                value={newZone.fee}
                                onChange={e => setNewZone({...newZone, fee: e.target.value})}
                                className="w-full p-3 pl-8 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={() => setIsAddingZone(false)} className="text-xs font-bold text-slate-500">{tPortal('form.cancel')}</button>
                          <button type="button" onClick={handleAddZone} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 transition-all">{tPortal('form.create')}</button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {zones.map(zone => {
                        const isZoneActive = zone.isActive !== false;
                        return (
                          <div key={zone.id} className={`flex items-center justify-between p-4 rounded-2xl border group transition-all ${isZoneActive ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-purple-500/50' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isZoneActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-slate-900 dark:text-white">{zone.name}</p>
                                  {!isZoneActive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{locale === 'es' ? 'Desactivado' : 'Deactivated'}</span>}
                                </div>
                                <p className="text-xs text-emerald-600 font-bold tracking-tight">+${zone.fee} {tPortal('form.feeLabel')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleZone(zone)}
                                title={isZoneActive ? (locale === 'es' ? 'Desactivar zona' : 'Deactivate zone') : (locale === 'es' ? 'Activar zona' : 'Activate zone')}
                                className={`p-2 rounded-xl transition-all ${isZoneActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                              >
                                {isZoneActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteZone(zone.id)}
                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveDomicilio}
                disabled={isSavingDom}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all disabled:opacity-60"
              >
                {isSavingDom ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {tPortal('form.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
