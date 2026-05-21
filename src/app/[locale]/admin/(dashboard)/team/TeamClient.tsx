"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Plus, Trash2, Shield, ShieldCheck, Lock,
  Copy, Check, AlertCircle, ToggleLeft, ToggleRight, Crown,
} from "lucide-react";
import { getAdminsAction, createAdminAction, deleteAdminAction, toggleAdminAction } from "@/app/actions/adminUsers";
import Link from "next/link";

type Admin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isOwner: boolean;
  createdAt: Date;
};

interface TeamClientProps {
  initialAdmins: Admin[];
  plan: string;
  maxAdmins: number;
  isOwner: boolean;
  locale: string;
}

export function TeamClient({ initialAdmins, plan, maxAdmins, isOwner, locale }: TeamClientProps) {
  const t = useTranslations("Dashboard.team");
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tempPass, setTempPass] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const extraAdmins = admins.filter(a => !a.isOwner);
  const canAdd = isOwner && (maxAdmins === -1 || extraAdmins.length < maxAdmins);
  const isPlanLocked = maxAdmins === 0;

  const refresh = async () => {
    const data = await getAdminsAction();
    setAdmins(data as Admin[]);
  };

  const handleDelete = async (admin: Admin) => {
    if (!confirm(t("confirmDelete", { name: admin.name }))) return;
    setActionId(admin.id);
    setError(null);
    const res = await deleteAdminAction(admin.id);
    setActionId(null);
    if (res.success) {
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
    } else {
      setError(t(`error_${res.error}`) || t("errorGeneric"));
    }
  };

  const handleToggle = async (admin: Admin) => {
    setActionId(admin.id);
    setError(null);
    const res = await toggleAdminAction(admin.id, !admin.isActive);
    setActionId(null);
    if (res.success) {
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: !a.isActive } : a));
    } else {
      setError(t("errorGeneric"));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await createAdminAction({ name: newName, email: newEmail });
    setCreating(false);
    if (res.success && res.tempPassword) {
      setTempPass(res.tempPassword);
      setNewName("");
      setNewEmail("");
      setShowForm(false);
      await refresh();
    } else {
      const errMap: Record<string, string> = {
        PLAN_LIMIT: t("errorPlanLimit", { limit: maxAdmins }),
        PLAN_NO_EXTRA_ADMINS: t("errorPlanNoExtra"),
        EMAIL_EXISTS: t("errorEmailExists"),
        OWNER_ONLY: t("errorOwnerOnly"),
      };
      setError(errMap[(res as any).error] || t("errorGeneric"));
    }
  };

  const copyPass = () => {
    if (tempPass) {
      navigator.clipboard.writeText(tempPass);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const planLabel = plan === "PROFESSIONAL" ? "Professional" : plan === "ENTERPRISE" ? "Enterprise" : "Basic";
  const limitLabel = maxAdmins === -1 ? t("unlimited") : maxAdmins === 0 ? "0" : String(maxAdmins);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* Plan locked banner (BASIC) */}
      {isPlanLocked && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-purple-500" />
            </div>
            <div>
              <p className="font-black text-slate-900 dark:text-white">{t("lockedTitle")}</p>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t("lockedDesc")}</p>
            </div>
            <Link
              href={`/${locale}/admin/billing`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-2xl transition-all"
            >
              {t("upgrade")}
            </Link>
          </div>
        </div>
      )}

      {/* Admins panel */}
      {!isPlanLocked && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">{t("adminsTitle")}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  {planLabel} · {t("adminsSubtitle", { count: extraAdmins.length, limit: limitLabel })}
                </p>
              </div>
            </div>
            {isOwner && canAdd && (
              <button
                onClick={() => { setShowForm(true); setError(null); }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addAdmin")}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Temp password card */}
          {tempPass && (
            <div className="mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {t("tempPassTitle")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white dark:bg-black/30 px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-900 dark:text-white break-all">
                  {tempPass}
                </code>
                <button
                  onClick={copyPass}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("tempPassNote")}</p>
            </div>
          )}

          {/* Admin list */}
          <div className="p-4 space-y-2">
            {admins.map(admin => (
              <div
                key={admin.id}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl"
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                  admin.isOwner
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : admin.isActive
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                }`}>
                  {admin.isOwner ? <Crown className="w-4 h-4" /> : admin.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm truncate ${admin.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                      {admin.name}
                    </p>
                    {admin.isOwner && (
                      <span className="text-xs font-black uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-lg shrink-0">
                        {t("owner")}
                      </span>
                    )}
                    {!admin.isActive && !admin.isOwner && (
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-lg shrink-0">
                        {t("inactive")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 truncate">{admin.email}</p>
                </div>

                {/* Actions (only for non-owner admins and only if current user is owner) */}
                {isOwner && !admin.isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(admin)}
                      disabled={actionId === admin.id}
                      title={admin.isActive ? t("deactivate") : t("activate")}
                      className="p-2 rounded-xl text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all disabled:opacity-40"
                    >
                      {admin.isActive
                        ? <ToggleRight className="w-4 h-4 text-purple-500" />
                        : <ToggleLeft className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(admin)}
                      disabled={actionId === admin.id}
                      title={t("delete")}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create form */}
          {showForm && isOwner && (
            <form onSubmit={handleCreate} className="px-4 pb-4 space-y-3">
              <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-3">{t("newAdminTitle")}</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t("namePlaceholder")}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setError(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {t("createAdmin")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Info card for non-owners */}
      {!isOwner && !isPlanLocked && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl px-6 py-5 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">{t("nonOwnerNote")}</p>
        </div>
      )}
    </div>
  );
}
