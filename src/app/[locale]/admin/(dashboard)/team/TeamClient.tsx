"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Plus, Trash2, Lock, Copy, Check, AlertCircle,
  ToggleLeft, ToggleRight, Crown, ChevronDown, UserCog,
} from "lucide-react";
import {
  getAdminsAction, createAdminAction, deleteAdminAction, toggleAdminAction,
  getReceptionistsAction, createReceptionistAction, deleteReceptionistAction, toggleReceptionistAction,
} from "@/app/actions/adminUsers";
import Link from "next/link";

type Admin = { id: string; name: string; email: string; isActive: boolean; isOwner: boolean; createdAt: Date };
type Receptionist = { id: string; name: string; email: string; isActive: boolean; createdAt: Date };

interface TeamClientProps {
  initialAdmins: Admin[];
  initialReceptionists: Receptionist[];
  plan: string;
  maxAdmins: number;
  isOwner: boolean;
  locale: string;
}

export function TeamClient({ initialAdmins, initialReceptionists, plan, maxAdmins, isOwner, locale }: TeamClientProps) {
  const t = useTranslations("Dashboard.team");

  // Tab state
  const [activeTab, setActiveTab] = useState<'admins' | 'receptionists'>('admins');

  // Admins state
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminCreating, setAdminCreating] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminNewName, setAdminNewName] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminTempPass, setAdminTempPass] = useState<string | null>(null);
  const [adminCopied, setAdminCopied] = useState(false);

  // Receptionists state
  const [receptionists, setReceptionists] = useState<Receptionist[]>(initialReceptionists);
  const [recepActionId, setRecepActionId] = useState<string | null>(null);
  const [recepError, setRecepError] = useState<string | null>(null);
  const [recepCreating, setRecepCreating] = useState(false);
  const [showRecepForm, setShowRecepForm] = useState(false);
  const [recepNewName, setRecepNewName] = useState("");
  const [recepNewEmail, setRecepNewEmail] = useState("");
  const [recepTempPass, setRecepTempPass] = useState<string | null>(null);
  const [recepCopied, setRecepCopied] = useState(false);

  const extraAdmins = admins.filter(a => !a.isOwner);
  const canAddAdmin = isOwner && (maxAdmins === -1 || extraAdmins.length < maxAdmins);
  const isPlanLocked = maxAdmins === 0;
  const planLabel = plan === "PROFESSIONAL" ? "Professional" : plan === "ENTERPRISE" ? "Business" : "Basic";
  const limitLabel = maxAdmins === -1 ? t("unlimited") : maxAdmins === 0 ? "0" : String(maxAdmins);

  // ── Admin handlers ──────────────────────────────────────────────────────────
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
    e.preventDefault();
    setAdminCreating(true); setAdminError(null);
    const res = await createAdminAction({ name: adminNewName, email: adminNewEmail });
    setAdminCreating(false);
    if (res.success && res.tempPassword) {
      setAdminTempPass(res.tempPassword);
      setAdminNewName(""); setAdminNewEmail(""); setShowAdminForm(false);
      await refreshAdmins();
    } else {
      const errMap: Record<string, string> = {
        PLAN_LIMIT: t("errorPlanLimit", { limit: maxAdmins }),
        PLAN_NO_EXTRA_ADMINS: t("errorPlanNoExtra"),
        EMAIL_EXISTS: t("errorEmailExists"),
        OWNER_ONLY: t("errorOwnerOnly"),
      };
      setAdminError(errMap[(res as any).error] || t("errorGeneric"));
    }
  };

  // ── Receptionist handlers ───────────────────────────────────────────────────
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
    e.preventDefault();
    setRecepCreating(true); setRecepError(null);
    const res = await createReceptionistAction({ name: recepNewName, email: recepNewEmail });
    setRecepCreating(false);
    if (res.success && res.tempPassword) {
      setRecepTempPass(res.tempPassword);
      setRecepNewName(""); setRecepNewEmail(""); setShowRecepForm(false);
      await refreshReceptionists();
    } else {
      const errMap: Record<string, string> = { EMAIL_EXISTS: t("errorEmailExists"), OWNER_ONLY: t("errorOwnerOnly") };
      setRecepError(errMap[(res as any).error] || t("errorGeneric"));
    }
  };

  const copyPass = (pass: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(pass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Reusable user row ───────────────────────────────────────────────────────
  const UserRow = ({
    id, name, email, isActive, isOwner: owner = false,
    onToggle, onDelete, actionId, accentColor,
  }: {
    id: string; name: string; email: string; isActive: boolean; isOwner?: boolean;
    onToggle: () => void; onDelete: () => void; actionId: string | null; accentColor: string;
  }) => (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
        owner ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : isActive ? `${accentColor} text-white` : 'bg-slate-200 dark:bg-white/10 text-slate-400'
      }`}>
        {owner ? <Crown className="w-4 h-4" /> : name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold text-sm truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{name}</p>
          {owner && <span className="text-xs font-black uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-lg shrink-0">{t("owner")}</span>}
          {!isActive && !owner && <span className="text-xs font-black uppercase tracking-wide text-slate-400 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-lg shrink-0">{t("inactive")}</span>}
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">{email}</p>
      </div>
      {isOwner && !owner && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} disabled={actionId === id} className="p-2 rounded-xl text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all disabled:opacity-40">
            {isActive ? <ToggleRight className="w-4 h-4 text-purple-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} disabled={actionId === id} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // ── Create form ─────────────────────────────────────────────────────────────
  const CreateForm = ({
    onSubmit, name, setName, email, setEmail, creating, onCancel, label,
  }: {
    onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void;
    email: string; setEmail: (v: string) => void; creating: boolean; onCancel: () => void; label: string;
  }) => (
    <form onSubmit={onSubmit} className="px-4 pb-4 space-y-3">
      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-3">{label}</p>
        <div className="space-y-2">
          <input type="text" placeholder={t("namePlaceholder")} value={name} onChange={e => setName(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors" />
          <input type="email" placeholder={t("emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors" />
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{t("cancel")}</button>
          <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t("createBtn")}
          </button>
        </div>
      </div>
    </form>
  );

  const tabs = [
    { key: 'admins' as const, label: t("tabAdmins"), icon: Users },
    { key: 'receptionists' as const, label: t("tabReceptionists"), icon: UserCog },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
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

      {/* ── ADMINS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'admins' && (
        <>
          {isPlanLocked ? (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
              <div className="px-6 py-8 text-center space-y-4">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-purple-500" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{t("lockedTitle")}</p>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t("lockedDesc")}</p>
                </div>
                <Link href={`/${locale}/admin/billing`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-2xl transition-all">
                  {t("upgrade")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{t("adminsTitle")}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">{planLabel} · {t("adminsSubtitle", { count: extraAdmins.length, limit: limitLabel })}</p>
                  </div>
                </div>
                {isOwner && canAddAdmin && (
                  <button onClick={() => { setShowAdminForm(true); setAdminError(null); }}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all">
                    <Plus className="w-3.5 h-3.5" /> {t("addAdmin")}
                  </button>
                )}
              </div>
              {adminError && (
                <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {adminError}
                </div>
              )}
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
                  <UserRow key={admin.id} {...admin} isOwner={admin.isOwner}
                    onToggle={() => handleToggleAdmin(admin)} onDelete={() => handleDeleteAdmin(admin)}
                    actionId={adminActionId} accentColor="bg-purple-600" />
                ))}
              </div>
              {showAdminForm && isOwner && (
                <CreateForm onSubmit={handleCreateAdmin} name={adminNewName} setName={setAdminNewName}
                  email={adminNewEmail} setEmail={setAdminNewEmail} creating={adminCreating}
                  onCancel={() => { setShowAdminForm(false); setAdminError(null); }} label={t("newAdminTitle")} />
              )}
            </div>
          )}
        </>
      )}

      {/* ── RECEPTIONISTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'receptionists' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center">
                <UserCog className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">{t("receptionistsTitle")}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{t("receptionistsSubtitle", { count: receptionists.length })}</p>
              </div>
            </div>
            {isOwner && (
              <button onClick={() => { setShowRecepForm(true); setRecepError(null); }}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all">
                <Plus className="w-3.5 h-3.5" /> {t("addReceptionist")}
              </button>
            )}
          </div>

          {recepError && (
            <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {recepError}
            </div>
          )}

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

          <div className="p-4 space-y-2">
            {receptionists.length === 0 && !showRecepForm && (
              <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-6">{t("noReceptionists")}</p>
            )}
            {receptionists.map(r => (
              <UserRow key={r.id} {...r}
                onToggle={() => handleToggleRecep(r)} onDelete={() => handleDeleteRecep(r)}
                actionId={recepActionId} accentColor="bg-sky-600" />
            ))}
          </div>

          {showRecepForm && isOwner && (
            <CreateForm onSubmit={handleCreateRecep} name={recepNewName} setName={setRecepNewName}
              email={recepNewEmail} setEmail={setRecepNewEmail} creating={recepCreating}
              onCancel={() => { setShowRecepForm(false); setRecepError(null); }} label={t("newReceptionistTitle")} />
          )}
        </div>
      )}

      {/* Non-owner note */}
      {!isOwner && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl px-6 py-5 flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-zinc-400">{t("nonOwnerNote")}</p>
        </div>
      )}
    </div>
  );
}
