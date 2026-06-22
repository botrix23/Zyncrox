"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Plus, Trash2, Lock, Copy, Check, AlertCircle,
  ToggleLeft, ToggleRight, Crown, ChevronDown, UserCog,
  Phone, ShieldAlert, MapPin, Clock, Pencil, X,
} from "lucide-react";
import {
  getAdminsAction, createAdminAction, deleteAdminAction, toggleAdminAction,
  getReceptionistsAction, createReceptionistAction, deleteReceptionistAction,
  toggleReceptionistAction, updateReceptionistAction,
  getReceptionistSchedulesAction, saveReceptionistScheduleAction, deleteReceptionistScheduleAction,
} from "@/app/actions/adminUsers";
import Link from "next/link";

type Admin = { id: string; name: string; email: string; isActive: boolean; isOwner: boolean; createdAt: Date };
type Receptionist = {
  id: string; name: string; email: string; isActive: boolean; createdAt: Date;
  phone?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null;
  assignedBranchIds?: string[];
};
type Branch = { id: string; name: string };
type Schedule = { id: string; userId: string; branchId: string; daysOfWeek: string[]; startTime: string; endTime: string };

interface TeamClientProps {
  initialAdmins: Admin[];
  initialReceptionists: Receptionist[];
  tenantBranches: Branch[];
  plan: string;
  maxAdmins: number;
  isOwner: boolean;
  locale: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ES: Record<string, string> = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' };
const DAY_EN: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

export function TeamClient({ initialAdmins, initialReceptionists, tenantBranches, plan, maxAdmins, isOwner, locale }: TeamClientProps) {
  const t = useTranslations("Dashboard.team");
  const dayLabels = locale === 'en' ? DAY_EN : DAY_ES;

  const [activeTab, setActiveTab] = useState<'admins' | 'receptionists'>('admins');

  // ── Admins ────────────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminCreating, setAdminCreating] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminNewName, setAdminNewName] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminTempPass, setAdminTempPass] = useState<string | null>(null);
  const [adminCopied, setAdminCopied] = useState(false);

  // ── Receptionists ─────────────────────────────────────────────────────────
  const [receptionists, setReceptionists] = useState<Receptionist[]>(initialReceptionists);
  const [recepActionId, setRecepActionId] = useState<string | null>(null);
  const [recepError, setRecepError] = useState<string | null>(null);
  const [recepCreating, setRecepCreating] = useState(false);
  const [showRecepForm, setShowRecepForm] = useState(false);
  const [recepTempPass, setRecepTempPass] = useState<string | null>(null);
  const [recepCopied, setRecepCopied] = useState(false);
  const [rName, setRName] = useState(""); const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState(""); const [rEcName, setREcName] = useState(""); const [rEcPhone, setREcPhone] = useState("");
  const [rBranchIds, setRBranchIds] = useState<string[]>([]);

  // Edit modal
  const [editRecep, setEditRecep] = useState<Receptionist | null>(null);
  const [editName, setEditName] = useState(""); const [editPhone, setEditPhone] = useState("");
  const [editEcName, setEditEcName] = useState(""); const [editEcPhone, setEditEcPhone] = useState("");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false); const [editError, setEditError] = useState<string | null>(null);

  // Schedule modal
  const [scheduleRecep, setScheduleRecep] = useState<Receptionist | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [newSchedBranchId, setNewSchedBranchId] = useState("");
  const [newSchedDays, setNewSchedDays] = useState<string[]>([]);
  const [newSchedStart, setNewSchedStart] = useState("08:00"); const [newSchedEnd, setNewSchedEnd] = useState("17:00");
  const [schedSaving, setSchedSaving] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const copyPass = (pass: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(pass); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const toggleBranch = (id: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(id) ? list.filter(b => b !== id) : [...list, id]);
  const resetRecepForm = () => {
    setRName(""); setREmail(""); setRPhone(""); setREcName(""); setREcPhone(""); setRBranchIds([]);
    setRecepError(null); setShowRecepForm(false);
  };
  const branchName = (id: string) => tenantBranches.find(b => b.id === id)?.name ?? id;

  // ── Admin handlers ────────────────────────────────────────────────────────
  const refreshAdmins = async () => setAdmins((await getAdminsAction()) as Admin[]);

  const handleDeleteAdmin = async (admin: Admin) => {
    if (!confirm(t("confirmDelete", { name: admin.name }))) return;
    setAdminActionId(admin.id); setAdminError(null);
    const res = await deleteAdminAction(admin.id);
    setAdminActionId(null);
    if (res.success) setAdmins(prev => prev.filter(a => a.id !== admin.id));
    else setAdminError(t("errorGeneric"));
  };

  const handleToggleAdmin = async (admin: Admin) => {
    setAdminActionId(admin.id); setAdminError(null);
    const res = await toggleAdminAction(admin.id, !admin.isActive);
    setAdminActionId(null);
    if (res.success) setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: !a.isActive } : a));
    else setAdminError(t("errorGeneric"));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setAdminCreating(true); setAdminError(null);
    const res = await createAdminAction({ name: adminNewName, email: adminNewEmail });
    setAdminCreating(false);
    if (res.success && res.tempPassword) {
      setAdminTempPass(res.tempPassword); setAdminNewName(""); setAdminNewEmail(""); setShowAdminForm(false);
      await refreshAdmins();
    } else {
      const errMap: Record<string, string> = {
        PLAN_LIMIT: t("errorPlanLimit", { limit: maxAdmins }), PLAN_NO_EXTRA_ADMINS: t("errorPlanNoExtra"),
        EMAIL_EXISTS: t("errorEmailExists"), OWNER_ONLY: t("errorOwnerOnly"),
      };
      setAdminError(errMap[(res as any).error] || t("errorGeneric"));
    }
  };

  // ── Receptionist handlers ─────────────────────────────────────────────────
  const refreshReceptionists = async () => setReceptionists((await getReceptionistsAction()) as Receptionist[]);

  const handleDeleteRecep = async (r: Receptionist) => {
    if (!confirm(t("confirmDelete", { name: r.name }))) return;
    setRecepActionId(r.id); setRecepError(null);
    const res = await deleteReceptionistAction(r.id);
    setRecepActionId(null);
    if (res.success) setReceptionists(prev => prev.filter(x => x.id !== r.id));
    else setRecepError(t("errorGeneric"));
  };

  const handleToggleRecep = async (r: Receptionist) => {
    setRecepActionId(r.id); setRecepError(null);
    const res = await toggleReceptionistAction(r.id, !r.isActive);
    setRecepActionId(null);
    if (res.success) setReceptionists(prev => prev.map(x => x.id === r.id ? { ...x, isActive: !x.isActive } : x));
    else setRecepError(t("errorGeneric"));
  };

  const handleCreateRecep = async (e: React.FormEvent) => {
    e.preventDefault(); setRecepCreating(true); setRecepError(null);
    const res = await createReceptionistAction({
      name: rName, email: rEmail,
      phone: rPhone || undefined, emergencyContactName: rEcName || undefined, emergencyContactPhone: rEcPhone || undefined,
      branchIds: rBranchIds,
    });
    setRecepCreating(false);
    if (res.success && res.tempPassword) {
      setRecepTempPass(res.tempPassword); resetRecepForm(); await refreshReceptionists();
    } else {
      const errMap: Record<string, string> = { EMAIL_EXISTS: t("errorEmailExists"), OWNER_ONLY: t("errorOwnerOnly") };
      setRecepError(errMap[(res as any).error] || t("errorGeneric"));
    }
  };

  const openEdit = (r: Receptionist) => {
    setEditRecep(r); setEditName(r.name); setEditPhone(r.phone ?? "");
    setEditEcName(r.emergencyContactName ?? ""); setEditEcPhone(r.emergencyContactPhone ?? "");
    setEditBranchIds(r.assignedBranchIds ?? []); setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editRecep) return; setEditSaving(true); setEditError(null);
    const res = await updateReceptionistAction(editRecep.id, {
      name: editName, phone: editPhone || null, emergencyContactName: editEcName || null,
      emergencyContactPhone: editEcPhone || null, branchIds: editBranchIds,
    });
    setEditSaving(false);
    if (res.success) { await refreshReceptionists(); setEditRecep(null); }
    else setEditError(t("errorGeneric"));
  };

  const openSchedules = async (r: Receptionist) => {
    setScheduleRecep(r); setScheduleLoading(true); setScheduleError(null);
    const res = await getReceptionistSchedulesAction(r.id);
    setScheduleLoading(false); setSchedules(res as Schedule[]);
    setNewSchedBranchId(r.assignedBranchIds?.[0] ?? ""); setNewSchedDays([]); setNewSchedStart("08:00"); setNewSchedEnd("17:00");
  };

  const handleAddSchedule = async () => {
    if (!scheduleRecep || !newSchedBranchId || newSchedDays.length === 0) return;
    setSchedSaving(true); setScheduleError(null);
    const res = await saveReceptionistScheduleAction({
      userId: scheduleRecep.id, branchId: newSchedBranchId, daysOfWeek: newSchedDays,
      startTime: newSchedStart, endTime: newSchedEnd,
    });
    setSchedSaving(false);
    if (res.success) {
      const updated = await getReceptionistSchedulesAction(scheduleRecep.id);
      setSchedules(updated as Schedule[]); setNewSchedDays([]); setNewSchedStart("08:00"); setNewSchedEnd("17:00");
    } else setScheduleError(t("errorGeneric"));
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const res = await deleteReceptionistScheduleAction(scheduleId);
    if (res.success && scheduleRecep) {
      const updated = await getReceptionistSchedulesAction(scheduleRecep.id);
      setSchedules(updated as Schedule[]);
    }
  };

  const extraAdmins = admins.filter(a => !a.isOwner);
  const canAddAdmin = isOwner && (maxAdmins === -1 || extraAdmins.length < maxAdmins);
  const isPlanLocked = maxAdmins === 0;
  const planLabel = plan === "PROFESSIONAL" ? "Professional" : plan === "ENTERPRISE" ? "Business" : "Basic";
  const limitLabel = maxAdmins === -1 ? t("unlimited") : maxAdmins === 0 ? "0" : String(maxAdmins);
  const tabs = [
    { key: 'admins' as const, label: t("tabAdmins"), icon: Users },
    { key: 'receptionists' as const, label: t("tabReceptionists"), icon: UserCog },
  ];

  // ── Branch chip toggle ────────────────────────────────────────────────────
  const BranchSelector = ({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {tenantBranches.map(b => (
        <button key={b.id} type="button" onClick={() => onToggle(b.id)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${selected.includes(b.id) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-white/10 hover:border-sky-400'}`}>
          {b.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* Desktop tabs */}
      <div className="hidden md:flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === key ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </button>
        ))}
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden relative">
        <select value={activeTab} onChange={e => setActiveTab(e.target.value as any)}
          className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
          {tabs.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* ── ADMINS ─────────────────────────────────────────────────────── */}
      {activeTab === 'admins' && (
        isPlanLocked ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
            <div className="px-6 py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto"><Lock className="w-7 h-7 text-purple-500" /></div>
              <div>
                <p className="font-black text-slate-900 dark:text-white">{t("lockedTitle")}</p>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t("lockedDesc")}</p>
              </div>
              <Link href={`/${locale}/admin/billing`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-2xl transition-all">{t("upgrade")}</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-purple-500" /></div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{t("adminsTitle")}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{planLabel} · {t("adminsSubtitle", { count: extraAdmins.length, limit: limitLabel })}</p>
                </div>
              </div>
              {isOwner && canAddAdmin && (
                <button onClick={() => { setShowAdminForm(true); setAdminError(null); }} className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all">
                  <Plus className="w-3.5 h-3.5" /> {t("addAdmin")}
                </button>
              )}
            </div>
            {adminError && <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0" /> {adminError}</div>}
            {adminTempPass && (
              <div className="mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t("tempPassTitle")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white dark:bg-black/30 px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-900 dark:text-white break-all">{adminTempPass}</code>
                  <button onClick={() => copyPass(adminTempPass, setAdminCopied)} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all shrink-0">
                    {adminCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("tempPassNote")}</p>
              </div>
            )}
            <div className="p-4 space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${admin.isOwner ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : admin.isActive ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                    {admin.isOwner ? <Crown className="w-4 h-4" /> : admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm truncate ${admin.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{admin.name}</p>
                      {admin.isOwner && <span className="text-xs font-black uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-lg shrink-0">{t("owner")}</span>}
                      {!admin.isActive && !admin.isOwner && <span className="text-xs font-black uppercase tracking-wide text-slate-400 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-lg shrink-0">{t("inactive")}</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">{admin.email}</p>
                  </div>
                  {isOwner && !admin.isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleAdmin(admin)} disabled={adminActionId === admin.id} className="p-2 rounded-xl text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all disabled:opacity-40">
                        {admin.isActive ? <ToggleRight className="w-4 h-4 text-purple-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteAdmin(admin)} disabled={adminActionId === admin.id} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {showAdminForm && isOwner && (
              <form onSubmit={handleCreateAdmin} className="px-4 pb-4">
                <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2">
                  <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t("newAdminTitle")}</p>
                  <input type="text" placeholder={t("namePlaceholder")} value={adminNewName} onChange={e => setAdminNewName(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors" />
                  <input type="email" placeholder={t("emailPlaceholder")} value={adminNewEmail} onChange={e => setAdminNewEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors" />
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setShowAdminForm(false); setAdminError(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{t("cancel")}</button>
                    <button type="submit" disabled={adminCreating} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {adminCreating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {t("createBtn")}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )
      )}

      {/* ── RECEPTIONISTS ──────────────────────────────────────────────── */}
      {activeTab === 'receptionists' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center"><UserCog className="w-4 h-4 text-sky-500" /></div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">{t("receptionistsTitle")}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{t("receptionistsSubtitle", { count: receptionists.length })}</p>
              </div>
            </div>
            {isOwner && (
              <button onClick={() => { setShowRecepForm(true); setRecepError(null); }} className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all">
                <Plus className="w-3.5 h-3.5" /> {t("addReceptionist")}
              </button>
            )}
          </div>
          {recepError && <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0" /> {recepError}</div>}
          {recepTempPass && (
            <div className="mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t("tempPassTitle")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white dark:bg-black/30 px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-900 dark:text-white break-all">{recepTempPass}</code>
                <button onClick={() => copyPass(recepTempPass, setRecepCopied)} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all shrink-0">
                  {recepCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("tempPassNote")}</p>
            </div>
          )}
          <div className="p-4 space-y-3">
            {receptionists.length === 0 && !showRecepForm && (
              <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-6">{t("noReceptionists")}</p>
            )}
            {receptionists.map(r => (
              <div key={r.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 mt-0.5 ${r.isActive ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold text-sm ${r.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{r.name}</p>
                    {!r.isActive && <span className="text-xs font-black uppercase tracking-wide text-slate-400 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-lg">{t("inactive")}</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{r.email}</p>
                  {r.phone && <p className="text-xs text-slate-500 dark:text-zinc-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{r.phone}</p>}
                  {(r.assignedBranchIds?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                      {r.assignedBranchIds!.map(bid => (
                        <span key={bid} className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-lg font-semibold">{branchName(bid)}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(r)} title={t("editBtn")} className="p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-all"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => openSchedules(r)} title={t("schedulesBtn")} className="p-2 rounded-xl text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all"><Clock className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleRecep(r)} disabled={recepActionId === r.id} className="p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-all disabled:opacity-40">
                      {r.isActive ? <ToggleRight className="w-4 h-4 text-sky-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteRecep(r)} disabled={recepActionId === r.id} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showRecepForm && isOwner && (
            <form onSubmit={handleCreateRecep} className="px-4 pb-4">
              <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
                <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t("newReceptionistTitle")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" placeholder={t("namePlaceholder")} value={rName} onChange={e => setRName(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                  <input type="email" placeholder={t("emailPlaceholder")} value={rEmail} onChange={e => setREmail(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                  <input type="tel" placeholder={t("phonePlaceholder")} value={rPhone} onChange={e => setRPhone(e.target.value)}
                    className="sm:col-span-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{t("ecLabel")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" placeholder={t("ecNamePlaceholder")} value={rEcName} onChange={e => setREcName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                    <input type="tel" placeholder={t("ecPhonePlaceholder")} value={rEcPhone} onChange={e => setREcPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                  </div>
                </div>
                {tenantBranches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{t("assignBranches")}</p>
                    <BranchSelector selected={rBranchIds} onToggle={id => toggleBranch(id, rBranchIds, setRBranchIds)} />
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={resetRecepForm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{t("cancel")}</button>
                  <button type="submit" disabled={recepCreating} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {recepCreating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {t("createBtn")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {!isOwner && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl px-6 py-5">
          <p className="text-sm text-slate-500 dark:text-zinc-400">{t("nonOwnerNote")}</p>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────── */}
      {editRecep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
              <p className="font-black text-slate-900 dark:text-white">{t("editModalTitle")}</p>
              <button onClick={() => setEditRecep(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {editError && <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0" />{editError}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t("nameLabel")}</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1"><Phone className="w-3 h-3" />{t("phoneLabel")}</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder={t("phonePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{t("ecLabel")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={editEcName} onChange={e => setEditEcName(e.target.value)} placeholder={t("ecNamePlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                  <input type="tel" value={editEcPhone} onChange={e => setEditEcPhone(e.target.value)} placeholder={t("ecPhonePlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors" />
                </div>
              </div>
              {tenantBranches.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1"><MapPin className="w-3 h-3" />{t("assignBranches")}</label>
                  <BranchSelector selected={editBranchIds} onToggle={id => toggleBranch(id, editBranchIds, setEditBranchIds)} />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/10">
              <button onClick={() => setEditRecep(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{t("cancel")}</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {editSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {t("saveBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE MODAL ─────────────────────────────────────────────── */}
      {scheduleRecep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <p className="font-black text-slate-900 dark:text-white">{t("schedulesModalTitle")}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{scheduleRecep.name}</p>
              </div>
              <button onClick={() => setScheduleRecep(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {scheduleError && <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0" />{scheduleError}</div>}
              {scheduleLoading ? (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-slate-200 dark:border-white/20 border-t-purple-500 rounded-full animate-spin" /></div>
              ) : schedules.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-2">{t("noSchedules")}</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{branchName(s.branchId)}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" />{s.startTime} – {s.endTime}</span>
                          <div className="flex gap-1 flex-wrap">
                            {(s.daysOfWeek as string[]).map(d => (
                              <span key={d} className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-lg font-semibold">{dayLabels[d] ?? d}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSchedule(s.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {(scheduleRecep.assignedBranchIds?.length ?? 0) > 0 ? (
                <div className="space-y-3 border-t border-slate-100 dark:border-white/10 pt-4">
                  <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t("addScheduleTitle")}</p>
                  <div className="relative">
                    <select value={newSchedBranchId} onChange={e => setNewSchedBranchId(e.target.value)}
                      className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
                      {scheduleRecep.assignedBranchIds!.map(bid => <option key={bid} value={bid}>{branchName(bid)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{t("daysLabel")}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map(d => (
                        <button key={d} type="button" onClick={() => setNewSchedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all ${newSchedDays.includes(d) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-white/10 hover:border-purple-400'}`}>
                          {dayLabels[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">{t("startTimeLabel")}</label>
                      <input type="time" value={newSchedStart} onChange={e => setNewSchedStart(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">{t("endTimeLabel")}</label>
                      <input type="time" value={newSchedEnd} onChange={e => setNewSchedEnd(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors" />
                    </div>
                  </div>
                  <button onClick={handleAddSchedule} disabled={schedSaving || newSchedDays.length === 0}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {schedSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {t("addScheduleBtn")}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-zinc-500 text-center border-t border-slate-100 dark:border-white/10 pt-4">{t("noBranchesForSchedule")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
