"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  User,
  Mail,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  MoreVertical,
  Infinity,
  CalendarDays,
  Clock,
  Building2,
  Phone,
  Star,
  MessageSquare,
  Info,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  CalendarOff,
  ClipboardList,
  Lock,
} from 'lucide-react';
import AbsencesClient from '../absences/AbsencesClient';
import { createStaffAction, updateStaffAction, deleteStaffAction, getStaffFutureBookingCount, toggleStaffActiveAction } from "@/app/actions/staff";
import { updateShowStaffSelectionAction } from "@/app/actions/tenant";
import { createStaffAccessAction, revokeStaffAccessAction, reactivateStaffAccessAction, resetStaffPasswordAction } from "@/app/actions/staffAccess";
import { Tag } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Portal } from "@/components/Portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import PhoneInput from "@/components/PhoneInput";
import { PlanGate, PlanGateSection } from "@/components/PlanGate";
import { canUseFeature } from "@/core/plans";

export default function StaffClient({
  initialStaff,
  branches,
  categories = [],
  tenantId,
  planLimit,
  plan,
  showStaffSelection: initialShowStaffSelection = true,
  role = 'ADMIN',
  currentStaffId,
  initialBlocks = [],
  pendingRequests = [],
}: {
  initialStaff: any[],
  branches: any[],
  categories?: any[],
  tenantId: string,
  planLimit?: number,
  plan?: string,
  showStaffSelection?: boolean,
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF',
  currentStaffId?: string,
  initialBlocks?: any[],
  pendingRequests?: any[],
}) {
  const limit = planLimit ?? 999;
  const t = useTranslations('Dashboard.staff');
  const isStaffRole = role === 'STAFF';
  type StaffTab = 'team' | 'absences' | 'requests';

  // Local staff list state — avoids relying on router.refresh() for UI updates
  const [staffList, setStaffList] = useState<any[]>(initialStaff);
  const activeStaffCount = staffList.filter((m: any) => m.isActive !== false).length;
  const atLimit = activeStaffCount >= limit;

  const [activeMainTab, setActiveMainTab] = useState<StaffTab>(role === 'STAFF' ? 'absences' : 'team');
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [staffVisible, setStaffVisible] = useState(20);
  useEffect(() => setStaffVisible(20), [searchTerm, branchFilter]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleCats = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedStaffReviews, setSelectedStaffReviews] = useState<any | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    inheritBranchHours: false,
    branchId: branches[0]?.id || "", // Mantener para compatibilidad
    assignments: [] as any[],
    allowsHomeService: true,
    categoryIds: [] as string[]
  });

  const [showStaffSelection, setShowStaffSelection] = useState(initialShowStaffSelection);

  const handleToggleStaffSelection = async (value: boolean) => {
    setShowStaffSelection(value);
    await updateShowStaffSelectionAction(tenantId, value);
  };

  const getEffectiveBranchId = (member: any) => {
    const today = new Date().toISOString().split('T')[0];
    const override = member.assignments?.find((a: any) =>
      !a.isPermanent &&
      a.startDate && new Date(a.startDate).toISOString().split('T')[0] <= today &&
      (!a.endDate || new Date(a.endDate).toISOString().split('T')[0] >= today)
    );
    const permanent = member.assignments?.find((a: any) => a.isPermanent)?.branchId;
    return override?.branchId || permanent || member.branchId;
  };

  const filteredStaff = staffList
    .filter(s => {
      const matchesSearch = !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === 'all' || getEffectiveBranchId(s) === branchFilter;
      return matchesSearch && matchesBranch;
    })
    .sort((a, b) => {
      // Activos primero, inactivos al final — sin tocar orden interno de cada grupo
      const aActive = a.isActive !== false ? 0 : 1;
      const bActive = b.isActive !== false ? 0 : 1;
      return aActive - bActive;
    });

  const handleOpenModal = (member?: any) => {
    if (member) {
      setEditingMember(member);
      const assignments = (member.assignments || []).map((a: any) => ({
        ...a,
        startDate: a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : "",
        endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : "",
        startTime: a.startTime || "",
        endTime: a.endTime || "",
        isPermanent: !!a.isPermanent
      }));

      // Asegurar que haya al menos una permanente, si no hay, la primera de la lista lo será por defecto (seguridad)
      if (!assignments.some((a: any) => a.isPermanent)) {
        if (assignments[0]) assignments[0].isPermanent = true;
      }

      setFormData({
        name: member.name,
        email: member.email || "",
        phone: member.phone || "",
        emergencyContactName: member.emergencyContactName || "",
        emergencyContactPhone: member.emergencyContactPhone || "",
        inheritBranchHours: !!member.inheritBranchHours,
        branchId: member.branchId,
        assignments: assignments,
        allowsHomeService: member.allowsHomeService ?? true,
        categoryIds: (member.categories || []).map((c: any) => c.categoryId)
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        inheritBranchHours: false,
        branchId: branches[0]?.id || "",
        assignments: [{
          branchId: branches[0]?.id || "",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          isPermanent: true
        }],
        allowsHomeService: true,
        categoryIds: []
      });
    }
    setIsModalOpen(true);
  };

  const handleAddAssignment = () => {
    if (formData.assignments.length >= 3) return;
    setFormData({
      ...formData,
      assignments: [
        ...formData.assignments,
        {
          branchId: branches[0]?.id || "",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startDate: new Date().toISOString().split('T')[0], // Sugerir hoy como inicio
          endDate: "",
          startTime: "",
          endTime: "",
          isPermanent: false
        }
      ]
    });
  };

  const handleRemoveAssignment = (index: number) => {
    const newAssignments = [...formData.assignments];
    newAssignments.splice(index, 1);
    setFormData({ ...formData, assignments: newAssignments });
  };

  const handleAssignmentChange = (index: number, field: string, value: any) => {
    const newAssignments = [...formData.assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setFormData({ ...formData, assignments: newAssignments });
  };

  const toggleDay = (index: number, day: string) => {
    const newAssignments = [...formData.assignments];
    const days = [...newAssignments[index].daysOfWeek];
    if (days.includes(day)) {
      newAssignments[index].daysOfWeek = days.filter(d => d !== day);
    } else {
      newAssignments[index].daysOfWeek = [...days, day];
    }
    setFormData({ ...formData, assignments: newAssignments });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const processedAssignments = formData.assignments.map(a => ({
      ...a,
      startDate: a.startDate || null,
      endDate: a.endDate || null
    }));

    const permanentAssignment = formData.assignments.find(a => a.isPermanent);
    const finalBranchId = permanentAssignment?.branchId || formData.branchId;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      alert(t('invalidEmail'));
      setIsLoading(false);
      return;
    }

    let result: any;
    if (editingMember) {
      result = await updateStaffAction({
        id: editingMember.id,
        tenantId,
        ...formData,
        branchId: finalBranchId,
        assignments: processedAssignments,
        categoryIds: formData.categoryIds
      });
    } else {
      result = await createStaffAction({
        tenantId,
        ...formData,
        branchId: finalBranchId,
        assignments: processedAssignments,
        allowsHomeService: formData.allowsHomeService,
        categoryIds: formData.categoryIds
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      if (editingMember) {
        // Optimistic local update — no need to wait for router.refresh()
        // Rebuild full category objects from the categories prop so cards render correctly
        const updatedCategories = (categories ?? [])
          .filter((cat: any) => formData.categoryIds.includes(cat.id))
          .map((cat: any) => ({ categoryId: cat.id, category: cat }));

        setStaffList(prev => prev.map(m =>
          m.id === editingMember.id
            ? {
                ...m,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
                inheritBranchHours: formData.inheritBranchHours,
                allowsHomeService: formData.allowsHomeService,
                branchId: finalBranchId,
                assignments: processedAssignments,
                categories: updatedCategories,
              }
            : m
        ));
      } else {
        // New member: refresh to get the ID and full data from DB
        router.refresh();
      }
    } else if (result.error === 'PLAN_LIMIT_EXCEEDED') {
      setInfoModal({
        title: t('planLimitTitle'),
        message: t('planLimitMsg', { plan: plan ?? 'BASIC', limit: result.limit ?? limit }),
      });
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const [deleteStaffTarget, setDeleteStaffTarget] = useState<{ id: string; name: string; bookingCount: number } | null>(null);
  const [pendingToggleStaff, setPendingToggleStaff] = useState<{ id: string; name: string; currentlyActive: boolean; inactiveBranchName?: string | null } | null>(null);

  const handleDelete = async (id: string, name: string) => {
    setOpenMenu(null);
    const bookingCount = await getStaffFutureBookingCount(id, tenantId);
    setDeleteStaffTarget({ id, name, bookingCount });
  };

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    setOpenMenu(null);
    const member = staffList.find(m => m.id === id);
    if (!member) return;

    // Si se está REactivando, detectar si la sucursal principal está desactivada
    let inactiveBranchName: string | null = null;
    if (!currentlyActive) {
      const primaryBranchId = member.assignments?.[0]?.branchId ?? member.branchId;
      if (primaryBranchId) {
        const branch = branches.find((b: any) => b.id === primaryBranchId);
        if (branch && branch.isActive === false) {
          inactiveBranchName = branch.name;
        }
      }
    }

    setPendingToggleStaff({ id, name: member.name, currentlyActive, inactiveBranchName });
  };

  const confirmToggleStaff = async () => {
    if (!pendingToggleStaff) return;
    const { id, currentlyActive } = pendingToggleStaff;
    setPendingToggleStaff(null);
    const result = await toggleStaffActiveAction(id, tenantId, !currentlyActive);
    if (!result.success && result.error) {
      if (result.error === 'PLAN_LIMIT_EXCEEDED') {
        setInfoModal({
          title: t('planLimitTitle'),
          message: t('planLimitMsg', { plan: (result as any).plan ?? 'BASIC', limit: (result as any).limit ?? limit }),
        });
      } else {
        alert(result.error);
      }
      return;
    }
    setStaffList(prev => prev.map(m =>
      m.id === id ? { ...m, isActive: !currentlyActive } : m
    ));
  };

  const confirmDeleteStaff = async () => {
    if (!deleteStaffTarget) return;
    const { id } = deleteStaffTarget;
    setDeleteStaffTarget(null);
    await deleteStaffAction(id, tenantId);
    setStaffList(prev => prev.filter(m => m.id !== id));
  };

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

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, memberId: string) => {
    e.stopPropagation();
    if (openMenu === memberId) {
      setOpenMenu(null);
      setMenuPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    if (rect) {
      const menuWidth = 192; // w-48
      const leftPos = rect.right - menuWidth;
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        // Clamp to viewport so it doesn't go off-screen on mobile
        left: Math.max(8, Math.min(leftPos, window.innerWidth - menuWidth - 8)),
      });
    }
    setOpenMenu(memberId);
  }, [openMenu]);

  const handleCreateAccess = async (member: any) => {
    if (!canUseFeature(plan, 'staffAccess')) {
      alert('El acceso de staff al sistema está disponible desde el plan Professional.');
      return;
    }
    if (!member.email) {
      alert('Este profesional no tiene email registrado. Agrégalo primero para crear acceso.');
      return;
    }
    const result = await createStaffAccessAction(member.id, tenantId);
    if (result.success && result.tempPassword) {
      setTempPasswordModal({ name: member.name, email: member.email, password: result.tempPassword });
      router.refresh();
    } else {
      alert(result.error || 'Error al crear acceso');
    }
  };

  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);

  const handleRevokeAccess = (member: any) => {
    setRevokeTarget(member);
  };

  const confirmRevokeAccess = async () => {
    if (!revokeTarget) return;
    const member = revokeTarget;
    setRevokeTarget(null);
    await revokeStaffAccessAction(member.id, tenantId);
    router.refresh();
  };

  const handleReactivateAccess = async (member: any) => {
    const result = await reactivateStaffAccessAction(member.id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Error al reactivar acceso');
    }
  };

  const handleResetPassword = async (member: any) => {
    const result = await resetStaffPasswordAction(member.id, tenantId);
    if (result.success && result.tempPassword) {
      setTempPasswordModal({ name: member.name, email: member.email, password: result.tempPassword });
      router.refresh();
    } else {
      alert(result.error || 'Error al resetear contraseña');
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <>
      <ConfirmDialog
        open={!!deleteStaffTarget}
        title={t('confirmDeleteTitle', { name: deleteStaffTarget?.name ?? '' })}
        message={
          deleteStaffTarget && deleteStaffTarget.bookingCount > 0
            ? t('confirmDeleteMsgBookings', { count: deleteStaffTarget.bookingCount })
            : t('confirmDeleteMsg')
        }
        confirmLabel={t('confirmDeleteBtn')}
        variant="danger"
        onConfirm={confirmDeleteStaff}
        onCancel={() => setDeleteStaffTarget(null)}
      />
      <ConfirmDialog
        open={!!pendingToggleStaff}
        title={pendingToggleStaff?.currentlyActive ? t('confirmDeactivateTitle') : t('confirmActivateTitle')}
        message={
          pendingToggleStaff?.currentlyActive
            ? t('confirmDeactivateMsg').replace('{name}', pendingToggleStaff?.name ?? '')
            : pendingToggleStaff?.inactiveBranchName
              ? t('confirmActivateMsgInactiveBranch').replace('{name}', pendingToggleStaff?.name ?? '').replace('{branch}', pendingToggleStaff?.inactiveBranchName ?? '')
              : t('confirmActivateMsg').replace('{name}', pendingToggleStaff?.name ?? '')
        }
        confirmLabel={t('confirmToggleBtn')}
        variant="warning"
        onConfirm={confirmToggleStaff}
        onCancel={() => setPendingToggleStaff(null)}
      />
      <ConfirmDialog
        open={!!infoModal}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        confirmLabel="OK"
        cancelLabel=""
        variant="info"
        onConfirm={() => setInfoModal(null)}
        onCancel={() => setInfoModal(null)}
      />
      <ConfirmDialog
        open={!!revokeTarget}
        title={t('accessRevokeTitle').replace('{name}', revokeTarget?.name ?? '')}
        message={t('accessRevokeMsg').replace('{name}', revokeTarget?.name ?? '')}
        confirmLabel={t('accessRevokeConfirm')}
        variant="warning"
        onConfirm={confirmRevokeAccess}
        onCancel={() => setRevokeTarget(null)}
      />
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── Top-level tabs: Equipo / Ausencias / Solicitudes ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          </div>
          {/* Tab selector desktop — shown for all roles but Solicitudes hidden for STAFF */}
          <div className="hidden md:flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit overflow-x-auto">
            <button
              onClick={() => setActiveMainTab('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${activeMainTab === 'team' ? 'bg-white dark:bg-zinc-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
            >
              <User className="w-4 h-4" />
              {t('tabTeam')}
            </button>
            <button
              onClick={() => setActiveMainTab('absences')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${activeMainTab === 'absences' ? 'bg-white dark:bg-zinc-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
            >
              <CalendarOff className="w-4 h-4" />
              {t('tabAbsences')}
            </button>
            {!isStaffRole && (
              <button
                onClick={() => setActiveMainTab('requests')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${activeMainTab === 'requests' ? 'bg-white dark:bg-zinc-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
              >
                <ClipboardList className="w-4 h-4" />
                {t('tabRequests')}
                {pendingRequests.length > 0 && (
                  <span className="bg-rose-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab selector — mobile */}
        <div className="md:hidden relative">
          <select
            value={activeMainTab}
            onChange={e => setActiveMainTab(e.target.value as StaffTab)}
            className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {!isStaffRole && <option value="team">{t('tabTeam')}</option>}
            <option value="absences">{t('tabAbsences')}</option>
            {!isStaffRole && <option value="requests">{t('tabRequests')}{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}</option>}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
        </div>

        {/* ── Tab: Ausencias ── */}
        {activeMainTab === 'absences' && (
          <AbsencesClient
            initialBlocks={initialBlocks}
            branches={branches}
            staff={initialStaff}
            tenantId={tenantId}
            role={role}
            currentStaffId={currentStaffId}
            pendingRequests={pendingRequests}
            embeddedTab="blocks"
          />
        )}

        {/* ── Tab: Solicitudes ── */}
        {!isStaffRole && activeMainTab === 'requests' && (
          <AbsencesClient
            initialBlocks={initialBlocks}
            branches={branches}
            staff={initialStaff}
            tenantId={tenantId}
            role={role}
            currentStaffId={currentStaffId}
            pendingRequests={pendingRequests}
            embeddedTab="pending"
          />
        )}

        {/* ── Tab: Equipo (contenido original) ── */}
        {activeMainTab === 'team' && (<>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 dark:text-zinc-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {limit < 999 && (
            <span className={`text-sm font-bold px-4 py-3 rounded-2xl border ${
              atLimit
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : activeStaffCount >= limit - 1
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400'
            }`}>
              {activeStaffCount} / {limit}
            </span>
          )}
          <button
            onClick={() => !atLimit && handleOpenModal()}
            disabled={atLimit}
            title={atLimit ? `Límite de ${limit} empleados alcanzado. Actualiza tu plan para agregar más.` : undefined}
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

      {/* Search + branch filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>
        {branches.length > 1 && (
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-all shadow-sm cursor-pointer"
          >
            <option value="all">{t('filterAllBranches')}</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('showStaffLabel')}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 italic mt-0.5">{t('showStaffHint')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
          <input type="checkbox" checked={showStaffSelection} onChange={e => handleToggleStaffSelection(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredStaff.slice(0, staffVisible).map((member) => {
          const today = new Date().toISOString().split('T')[0];
          const activeOverride = member.assignments?.find((a: any) => 
            !a.isPermanent && 
            a.startDate && 
            new Date(a.startDate).toISOString().split('T')[0] <= today &&
            (!a.endDate || new Date(a.endDate).toISOString().split('T')[0] >= today)
          );
          const permanentBranch = member.assignments?.find((a: any) => a.isPermanent)?.branchId;
          const branchName = branches.find(b => b.id === (activeOverride?.branchId || permanentBranch || member.branchId))?.name;

          const hasFutureRotation = !activeOverride && member.assignments?.some((a: any) => 
            !a.isPermanent && 
            a.startDate && 
            new Date(a.startDate).toISOString().split('T')[0] > today
          );

          const avgRating = member.reviews?.length > 0 
            ? (member.reviews.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / member.reviews.length).toFixed(1)
            : null;

          return (
          <div
            key={member.id}
            onClick={() => handleOpenModal(member)}
            className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm transition-all cursor-pointer ${
              member.isActive === false
                ? 'border-slate-200 dark:border-white/5 opacity-60'
                : 'border-slate-200 dark:border-white/5 hover:border-purple-500/40 hover:shadow-md hover:shadow-purple-500/10 active:scale-[0.99]'
            }`}
          >
            {/* ── Header: nombre + menú ── */}
            <div className="flex items-start justify-between gap-2 p-4 pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-bold text-base tracking-tight leading-tight ${member.isActive === false ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'}`}>
                    {member.name}
                  </h3>
                  {member.isActive === false && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {t('deactivated')}
                    </span>
                  )}
                </div>
                {avgRating && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedStaffReviews(member); setIsReviewsModalOpen(true); }}
                    className="flex items-center gap-1 mt-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg px-1 transition-all"
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-3 h-3 ${star <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-800'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{avgRating}</span>
                  </button>
                )}
                {/* Sucursal */}
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-1.5 leading-none">
                  {branchName || t('noBranch')}
                </p>
                {/* Viñeta de asignación temporal */}
                {activeOverride && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-500/20 animate-pulse">
                    <CalendarDays className="w-2.5 h-2.5" />
                    {t('form.temporaryAssignment').toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => handleOpenMenu(e, member.id)}
                className={`p-2 rounded-xl shrink-0 transition-all ${openMenu === member.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* ── Badges: Home Service + categorías (máx 2 o todas) + overflow ── */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-1">
              {member.allowsHomeService && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                  <Plus className="w-3 h-3" />
                  {t('form.homeServiceOk')}
                </span>
              )}
              {(() => {
                const cats: any[] = member.categories || [];
                const allExpanded = expandedCats.has(member.id);
                const visible = allExpanded ? cats : cats.slice(0, 2);
                const overflow = cats.length - 2;
                return (
                  <>
                    {visible.map((sc: any) => (
                      <span
                        key={sc.categoryId}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full"
                        style={{ backgroundColor: sc.category?.color + '22', color: sc.category?.color }}
                      >
                        <Tag className="w-3 h-3" />
                        {sc.category?.name}
                      </span>
                    ))}
                    {!allExpanded && overflow > 0 && (
                      <button
                        onClick={(e) => toggleCats(member.id, e)}
                        className="flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                      >
                        +{overflow} {t('moreCats')}
                      </button>
                    )}
                    {allExpanded && overflow > 0 && (
                      <button
                        onClick={(e) => toggleCats(member.id, e)}
                        className="flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                      >
                        {t('fewerCategories')}
                      </button>
                    )}
                  </>
                );
              })()}
              {hasFutureRotation && (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {t('nextRotationScheduled')}
                </span>
              )}
            </div>

            {/* ── Contacto ── */}
            <div className="border-t border-slate-100 dark:border-white/5 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 truncate">{member.email || t('noEmail')}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 truncate">{member.phone || t('noPhone')}</span>
              </div>
            </div>

            {/* ── Acceso al sistema ── */}
            <div className="border-t border-slate-100 dark:border-white/5 px-4 py-3" onClick={e => e.stopPropagation()}>
              {canUseFeature(plan, 'staffAccess') ? (
                member.user ? (
                  member.user.isActive ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs font-black ${member.user.mustChangePassword ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {member.user.mustChangePassword ? <Clock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {member.user.mustChangePassword ? t('accessPending') : t('accessActive')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {member.user.mustChangePassword && (
                          <button
                            onClick={() => handleResetPassword(member)}
                            className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-xl transition-all border border-amber-500/10"
                          >
                            <KeyRound className="w-3 h-3" />
                            {t('accessResendPassword')}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeAccess(member)}
                          className="flex items-center gap-1 text-xs font-black text-slate-400 hover:text-rose-500 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/5 transition-all"
                        >
                          <ShieldOff className="w-3 h-3" />
                          {t('accessRevoke')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                        <ShieldOff className="w-3.5 h-3.5" />
                        {t('accessInactive')}
                      </span>
                      <button
                        onClick={() => handleReactivateAccess(member)}
                        className="flex items-center gap-1 text-xs font-black text-slate-400 hover:text-emerald-500 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/5 transition-all"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {t('accessReactivate')}
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleCreateAccess(member)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 rounded-xl transition-all border border-purple-500/10"
                  >
                    <KeyRound className="w-3 h-3" />
                    {t('accessCreate')}
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                  <ShieldOff className="w-3.5 h-3.5" />
                  {t('accessUnavailable')}
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
      {filteredStaff.length > staffVisible && (
        <div className="flex flex-col items-center gap-1 pt-4 pb-2">
          <p className="text-xs text-slate-400 dark:text-zinc-500">{t('showing', { shown: staffVisible, total: filteredStaff.length })}</p>
          <button
            onClick={() => setStaffVisible(v => v + 20)}
            className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:border-purple-500/40 text-slate-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 font-bold text-sm rounded-xl shadow-sm transition-all"
          >
            {t('loadMore', { count: Math.min(20, filteredStaff.length - staffVisible) })}
          </button>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{editingMember ? t('form.titleEdit') : t('form.titleNew')}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">{t('form.rotationTitle')}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.nameLabel')}</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      placeholder={t('form.namePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emailLabel')}</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      placeholder={t('form.emailLabel')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.phoneLabel')}</label>
                    <PhoneInput 
                      value={formData.phone}
                      onChange={val => setFormData({...formData, phone: val})}
                      placeholder={t('form.phonePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emergencyContactLabel')}</label>
                    <input 
                      type="text" 
                      value={formData.emergencyContactName}
                      onChange={e => setFormData({...formData, emergencyContactName: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      placeholder={t('form.emergencyContactPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emergencyPhoneLabel')}</label>
                    <PhoneInput 
                      value={formData.emergencyContactPhone}
                      onChange={val => setFormData({...formData, emergencyContactPhone: val})}
                      placeholder={t('form.emergencyPhonePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
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

                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
                    <div className="flex items-center gap-3 pr-4">
                       <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.inheritBranchHoursLabel')}</p>
                       <div className="group relative shrink-0">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-blue-500" />
                        <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                          {t('form.inheritBranchHoursHint')}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, inheritBranchHours: !formData.inheritBranchHours})}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${formData.inheritBranchHours ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.inheritBranchHours ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {categories.length > 0 && (
                  <PlanGateSection plan={plan} feature="staffCategories" upgradeMessage="Las categorías de especialidad por staff están disponibles desde el plan Professional.">
                  <div className="space-y-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-500" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Categorías de especialidad</p>
                    </div>
                    <p className="text-xs text-slate-400 font-medium -mt-2">Este miembro del equipo aparecerá solo en servicios que compartan al menos una de estas categorías.</p>
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
                  </PlanGateSection>
                )}

                <div className="space-y-6">
                  {formData.assignments.filter(a => a.isPermanent).map((assignment, idx) => {
                    const realIdx = formData.assignments.indexOf(assignment);
                    return (
                    <div key="permanent" className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <Infinity className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{t('form.permanentBase')}</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-black text-slate-400">{t('form.branchSelect')}</label>
                            <select 
                              required
                              value={assignment.branchId}
                              onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)}
                              className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none"
                            >
                              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          </div>
                          <div className={`space-y-1.5 transition-opacity duration-300 ${formData.inheritBranchHours ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <label className="text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('form.baseSchedule')}</label>
                            <div className="grid grid-cols-2 gap-2">
                               <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                               <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-1 transition-opacity duration-300 ${formData.inheritBranchHours ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                          {days.map(day => (
                            <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-2.5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                              {t(`days.${day}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )})}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-500 ml-1">{t('form.rotationTitle')}</label>
                      {canUseFeature(plan, 'staffRotations') && formData.assignments.length < 4 && (
                        <button type="button" onClick={handleAddAssignment} className="text-xs font-black text-purple-600 bg-purple-500/10 px-4 py-2 rounded-xl hover:bg-purple-500/20 transition-all">
                          + {t('form.addAssignment')}
                        </button>
                      )}
                    </div>
                    {!canUseFeature(plan, 'staffRotations') && (
                      <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400">{t('form.rotationLocked')}</p>
                          <p className="text-xs text-amber-500/80 font-medium mt-0.5">{t('form.rotationLockedDesc')}</p>
                        </div>
                      </div>
                    )}
                    
                    {formData.assignments.filter(a => !a.isPermanent).length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl text-center">
                        <p className="text-xs font-bold text-slate-400 italic">{t('form.noTemporaryAssignments')}.</p>
                      </div>
                    )}

                    <div className="space-y-4">
                    {formData.assignments.filter(a => !a.isPermanent).map((assignment, idx) => {
                      const realIdx = formData.assignments.indexOf(assignment);
                      return (
                      <div key={`temp-${idx}`} className="bg-amber-500/5 border border-amber-500/20 rounded-[20px] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-black text-amber-600">{t('form.temporaryAssignment')}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveAssignment(realIdx)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="text-sm font-black text-slate-400">{t('form.destinationBranch')}</label>
                               <select value={assignment.branchId} onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)} className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none">
                                 {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                               </select>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-sm font-black text-slate-400 uppercase">{t('form.from')}</label>
                                  <input type="date" required value={assignment.startDate} onChange={e => handleAssignmentChange(realIdx, 'startDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-black text-slate-400 uppercase">{t('form.to')}</label>
                                  <input type="date" value={assignment.endDate} onChange={e => handleAssignmentChange(realIdx, 'endDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-sm font-black text-slate-400 uppercase">{t('form.specialSchedule')}</label>
                              <div className="grid grid-cols-2 gap-2">
                                 <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                                 <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-black text-slate-400 uppercase">{t('form.applicableDays')}</label>
                              <div className="flex flex-wrap gap-1">
                                {days.map(day => (
                                  <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-1.5 py-1 rounded-md text-xs font-black uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                                    {t(`days.${day}`)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    editingMember ? t('form.save') : t('form.create')
                  )}
                </button>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {isReviewsModalOpen && selectedStaffReviews && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" />
             <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xl">
                      {selectedStaffReviews.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{selectedStaffReviews.name}</h3>
                      <p className="text-xs font-bold text-slate-400">{t('form.reviewsHistory')}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsReviewsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                  {(!selectedStaffReviews.reviews || selectedStaffReviews.reviews.length === 0) ? (
                    <div className="text-center py-12 space-y-3">
                      <MessageSquare className="w-12 h-12 text-slate-200 mx-auto" />
                      <p className="text-sm font-bold text-slate-400">{t('form.noReviews')}</p>
                    </div>
                  ) : (
                    selectedStaffReviews.reviews.map((r: any) => (
                      <div key={r.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                         <div className="flex items-center justify-between">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-3 h-3 ${star <= Math.round(Number(r.rating)) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-800'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                         </div>
                         {r.comment ? (
                           <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium italic">"{r.comment}"</p>
                         ) : (
                           <p className="text-xs text-slate-400 italic">{t('form.noComment')}</p>
                         )}
                         
                         {r.responses && r.responses.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 mt-2 space-y-2">
                              {r.responses.filter((resp: any) => resp.questionType === 'TEXT' && resp.answer).map((resp: any, idx: number) => (
                                 <div key={idx} className="space-y-1">
                                    <p className="text-xs font-black text-slate-400">{resp.questionText}</p>
                                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">"{resp.answer}"</p>
                                 </div>
                              ))}
                            </div>
                         )}
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        </Portal>
      )}

      {openMenu && menuPos && (
        <Portal>
          <div
            ref={menuRef}
            className="fixed z-[10000] w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: menuPos.top,
              left: menuPos.left
            }}
          >
            {(() => {
              const member = initialStaff.find(s => s.id === openMenu);
              if (!member) return null;
              const isCurrentlyActive = member.isActive !== false;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(member.id, isCurrentlyActive);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    isCurrentlyActive
                      ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/5'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5'
                  }`}
                >
                  {isCurrentlyActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {isCurrentlyActive ? t('form.deactivate') : t('form.reactivate')}
                </button>
              );
            })()}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const member = initialStaff.find(s => s.id === openMenu);
                if (member) handleDelete(member.id, member.name);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {t('form.deleteProfile')}
            </button>
          </div>
        </Portal>
      )}

      {/* Modal de contraseña temporal */}
      {tempPasswordModal && (
        <Portal>
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setTempPasswordModal(null)} />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{t('accessModalTitle')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t('accessModalSubtitle').replace('{name}', tempPasswordModal.name)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{tempPasswordModal.email}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 space-y-1">
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t('accessModalTempPassword')}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-widest font-mono">{tempPasswordModal.password}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPasswordModal.password);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('accessModalCopied') : t('accessModalCopy')}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium text-center">{t('accessModalHint')}</p>

              <button
                onClick={() => setTempPasswordModal(null)}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
              >
                {t('accessModalConfirm')}
              </button>
            </div>
          </div>
        </Portal>
      )}
        </>)}
        {/* end tab: team */}
      </div>
      {/* end outer space-y-6 */}
    </>
  );
}
