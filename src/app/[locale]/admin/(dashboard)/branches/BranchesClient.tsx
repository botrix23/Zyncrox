"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Home, 
  Trash2,
  Edit2,
  X,
  Clock,
  MoreVertical,
  PowerOff,
  Power
} from 'lucide-react';
import { createBranchAction, updateBranchAction, deleteBranchAction, toggleBranchActiveAction } from "@/app/actions/branches";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

import PhoneInput from "@/components/PhoneInput";
import BusinessHoursPicker from "@/components/BusinessHoursPicker";

import { useTranslations } from "next-intl";
import { Portal } from "@/components/Portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function BranchesClient({
  initialBranches,
  staff,
  tenantId,
  planLimit,
  plan,
}: {
  initialBranches: any[],
  staff: any[],
  tenantId: string,
  planLimit?: number,
  plan?: string,
}) {
  const limit = planLimit ?? 999;

  // Local list state — synced via useEffect when router.refresh() pushes new props
  const [branchList, setBranchList] = useState<any[]>(initialBranches);
  useEffect(() => { setBranchList(initialBranches); }, [initialBranches]);

  const activeBranches = branchList.filter(b => b.isActive !== false);
  const atLimit = activeBranches.length >= limit;
  const t = useTranslations('Dashboard.branches');
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    businessHours: ""
  });

  const filteredBranches = branchList.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (branch?: any) => {
    if (branch && branch.isActive === false) return; // Can't edit inactive
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address || "",
        phone: branch.phone || "",
        businessHours: branch.businessHours || ""
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        businessHours: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let result: any;
    if (editingBranch) {
      result = await updateBranchAction({
        id: editingBranch.id,
        tenantId,
        ...formData
      });
    } else {
      result = await createBranchAction({
        tenantId,
        ...formData
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      if (editingBranch) {
        setBranchList(prev => prev.map(b =>
          b.id === editingBranch.id ? { ...b, ...formData } : b
        ));
      } else {
        router.refresh(); // Need DB-generated ID for new branch
      }
    } else if (result.error === 'PLAN_LIMIT_EXCEEDED') {
      alert(`${plan ?? 'BASIC'}: ${result.current}/${result.limit}. ${t('planLimitReactivate')}`);
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const [deleteBranchTarget, setDeleteBranchTarget] = useState<{ id: string; name: string } | null>(null);
  const [pendingToggleBranch, setPendingToggleBranch] = useState<any | null>(null);

  const handleDelete = (id: string, name: string) => {
    setOpenMenu(null);
    setMenuPos(null);
    setDeleteBranchTarget({ id, name });
  };

  const confirmDeleteBranch = async () => {
    if (!deleteBranchTarget) return;
    const { id } = deleteBranchTarget;
    setDeleteBranchTarget(null);
    await deleteBranchAction(id, tenantId);
    setBranchList(prev => prev.filter(b => b.id !== id));
  };

  const handleToggleActive = (branch: any) => {
    setOpenMenu(null);
    setMenuPos(null);
    setPendingToggleBranch(branch);
  };

  const confirmToggleBranch = async () => {
    if (!pendingToggleBranch) return;
    const branch = pendingToggleBranch;
    setPendingToggleBranch(null);
    const newActive = branch.isActive === false;
    const result = await toggleBranchActiveAction(branch.id, tenantId, branch.isActive !== false);
    if (!result.success) {
      if (result.error === 'PLAN_LIMIT_EXCEEDED') {
        alert(t('planLimitReactivate'));
      } else {
        alert(t('toggleError'));
      }
    } else {
      setBranchList(prev => prev.map(b =>
        b.id === branch.id ? { ...b, isActive: newActive } : b
      ));
    }
  };

  // Close menu on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMenuPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, branchId: string) => {
    e.stopPropagation();
    if (openMenu === branchId) {
      setOpenMenu(null);
      setMenuPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setMenuPos({ 
      top: rect.bottom + window.scrollY + 4, 
      left: rect.right - 176,
    });
    setOpenMenu(branchId);
  }, [openMenu]);

  return (
    <>
    <ConfirmDialog
      open={!!deleteBranchTarget}
      title={`¿Eliminar "${deleteBranchTarget?.name}"?`}
      message="Se eliminarán todos los datos de esta sucursal. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      variant="danger"
      onConfirm={confirmDeleteBranch}
      onCancel={() => setDeleteBranchTarget(null)}
    />
    <ConfirmDialog
      open={!!pendingToggleBranch}
      title={pendingToggleBranch?.isActive === false ? t('confirmActivateTitle') : t('confirmDeactivateTitle')}
      message={(pendingToggleBranch?.isActive === false ? t('confirmActivateMsg') : t('confirmDeactivateMsg')).replace('{name}', pendingToggleBranch?.name ?? '')}
      confirmLabel={t('confirmToggleBtn')}
      cancelLabel={t('cancel') || 'Cancelar'}
      variant="warning"
      onConfirm={confirmToggleBranch}
      onCancel={() => setPendingToggleBranch(null)}
    />
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {limit < 999 && (
            <span className={`text-sm font-bold px-4 py-3 rounded-2xl border ${
              atLimit
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : activeBranches.length >= limit - 1
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400'
            }`}>
              {activeBranches.length} / {limit}
            </span>
          )}
          <button
            onClick={() => !atLimit && handleOpenModal()}
            disabled={atLimit}
            title={atLimit ? t('planLimitReactivate') : undefined}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${
              atLimit
                ? 'bg-slate-200 dark:bg-zinc-700 text-slate-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95'
            }`}
          >
            <Plus className="w-5 h-5" />
            {t('new')}
          </button>
        </div>
      </div>

      {/* Filters & Search */}
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

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBranches.map((branch) => {
          const isInactive = branch.isActive === false;
          return (
            <div 
              key={branch.id} 
              onClick={() => !isInactive && handleOpenModal(branch)}
              className={`border rounded-3xl p-6 shadow-sm transition-all group relative overflow-hidden ${
                isInactive
                  ? 'bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-white/5 opacity-60 cursor-default'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/5 hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer active:scale-[0.98]'
              }`}
            >
              {/* Inactive badge */}
              {isInactive && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {t('deactivated')}
                  </span>
                </div>
              )}

              <div className="absolute top-0 right-0 p-4 z-10">
                <button 
                  onClick={(e) => handleOpenMenu(e, branch.id)}
                  className={`p-2 rounded-xl transition-all ${openMenu === branch.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className={`flex items-center gap-4 mb-6 ${isInactive ? 'mt-5' : ''}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isInactive ? 'bg-slate-200 dark:bg-zinc-700 text-slate-400' : 'bg-purple-500/10 text-purple-600'}`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">{branch.name}</h3>
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">ID: {branch.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5">
                    <Home className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-300 leading-tight pt-1">
                    {branch.address || t('noAddress')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                    {branch.phone || t('noPhone')}
                  </p>
                </div>
                {!isInactive && branch.businessHours && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/5 dark:bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/10 dark:border-purple-500/20">
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-xs font-medium pt-0.5">
                      {(() => {
                        try {
                          const bh = JSON.parse(branch.businessHours);
                          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                          const todayIndex = (new Date().getDay() + 6) % 7;
                          const todayId = days[todayIndex];
                          
                          const todaySched = bh.regular?.[todayId];
                          const isOpen = todaySched?.isOpen ?? false;

                          const to12h = (t24: string) => {
                            const [h, m] = t24.split(':').map(Number);
                            const period = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return `${h12}:${String(m).padStart(2, '0')} ${period}`;
                          };

                          let displayTime = "";
                          if (!isOpen) {
                            displayTime = t('closedToday');
                          } else if (todaySched?.slots?.length) {
                            displayTime = todaySched.slots.map((s: any) => `${to12h(s.open)} - ${to12h(s.close)}`).join(', ');
                          } else {
                            displayTime = t('hoursNotAvailable');
                          }

                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white tracking-widest uppercase text-xs mb-1 opacity-60">{t('today')}</span>
                              <span className="font-bold text-slate-700 dark:text-zinc-100">{displayTime}</span>
                              {bh.regular && (
                                <span className="text-slate-400 dark:text-zinc-500 text-xs font-bold mt-0.5">
                                  {t('regularOperatingDays', { count: days.filter(d => bh.regular[d]?.isOpen).length })}
                                </span>
                              )}
                            </div>
                          );
                        } catch {
                          return <span className="italic text-rose-500/70">{t('operatingError')}</span>;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {branchList.length === 0 && (
        <div className="text-center py-20 bg-slate-50 dark:bg-black/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5">
          <MapPin className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('noBranches')}</h3>
          <p className="text-slate-500 dark:text-zinc-500 max-w-xs mx-auto mt-2">{t('noBranchesDesc')}</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 sticky top-0 z-10">
                <h3 className="text-xl font-black tracking-tight">{editingBranch ? t('edit') : t('new')}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">{t('nameLabel')}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium"
                    placeholder={t('namePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">{t('addressLabel')}</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium"
                    placeholder={t('addressPlaceholder')}
                  />
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-1">{t('phoneLabel')}</label>
                    <PhoneInput 
                      value={formData.phone}
                      onChange={val => setFormData({...formData, phone: val})}
                      placeholder={t('phonePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-1">{t('hoursLabel')}</label>
                    <BusinessHoursPicker 
                      value={formData.businessHours}
                      onChange={val => setFormData({...formData, businessHours: val})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      {editingBranch ? t('save') : t('create')}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Actions Dropdown */}
      {openMenu && menuPos && (
        <Portal>
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
            className="w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Toggle active/inactive */}
            {(() => {
              const b = branchList.find(b => b.id === openMenu);
              if (!b) return null;
              const isInactive = b.isActive === false;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(b);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${
                    isInactive
                      ? 'text-emerald-600 hover:bg-emerald-500/10'
                      : 'text-amber-600 hover:bg-amber-500/10'
                  }`}
                >
                  {isInactive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  {isInactive ? t('reactivate') : t('inactive')}
                </button>
              );
            })()}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const b = branchList.find(b => b.id === openMenu);
                if (b) handleDelete(b.id, b.name);
                setOpenMenu(null);
              }}
              className="w-full text-left px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2 font-bold"
            >
              <Trash2 className="w-4 h-4" /> {t('delete')}
            </button>
          </div>
        </Portal>
      )}
    </div>
    </>
  );
}
