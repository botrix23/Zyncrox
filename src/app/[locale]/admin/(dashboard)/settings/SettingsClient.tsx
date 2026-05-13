'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, AlertCircle, ShieldCheck, UserCog, LifeBuoy, Save } from 'lucide-react';
import { getAdminsAction, createAdminAction, toggleAdminAction, deleteAdminAction, updateRecoveryEmailAction } from '@/app/actions/adminUsers';

type Admin = Awaited<ReturnType<typeof getAdminsAction>>[number];

const ADMIN_LIMITS: Record<string, number> = { BASIC: 1, PROFESSIONAL: 2, ENTERPRISE: Infinity };

export default function SettingsClient({
  initialAdmins,
  plan,
  currentUserId,
  initialRecoveryEmail,
}: {
  initialAdmins: Admin[];
  plan: string;
  currentUserId: string;
  initialRecoveryEmail: string | null;
}) {
  const t = useTranslations('Admin.settings');

  const [admins, setAdmins] = useState(initialAdmins);
  const [recoveryEmail, setRecoveryEmail] = useState(initialRecoveryEmail ?? '');
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const limit = ADMIN_LIMITS[plan] ?? 1;
  const activeCount = admins.filter(a => a.isActive).length;
  const canAdd = activeCount < limit;
  const planLimitLabel = limit === Infinity ? t('planLimitUnlimited') : `${limit} admin${limit !== 1 ? 's' : ''}`;

  const handleSaveRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRecovery(true);
    await updateRecoveryEmailAction(recoveryEmail);
    setSavingRecovery(false);
    setRecoverySaved(true);
    setTimeout(() => setRecoverySaved(false), 2500);
  };

  const reload = async () => {
    const data = await getAdminsAction();
    setAdmins(data);
  };

  const handleToggle = async (admin: Admin) => {
    setActionId(admin.id);
    setError('');
    const res = await toggleAdminAction(admin.id, !admin.isActive);
    if (res.success) {
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: !a.isActive } : a));
    } else if (res.error === 'LAST_ADMIN') {
      setError(t('errorLastAdmin'));
    }
    setActionId(null);
  };

  const handleDelete = async (admin: Admin) => {
    if (!confirm(t('confirmDelete', { name: admin.name }))) return;
    setActionId(admin.id);
    setError('');
    const res = await deleteAdminAction(admin.id);
    if (res.success) {
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
    } else if (res.error === 'LAST_ADMIN') {
      setError(t('errorLastAdminDelete'));
    } else if (res.error === 'CANNOT_DELETE_SELF') {
      setError(t('errorSelf'));
    }
    setActionId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    const res = await createAdminAction({ name: newName, email: newEmail });
    if (res.success) {
      setTempPassword(res.tempPassword ?? null);
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      await reload();
    } else if (res.error === 'PLAN_LIMIT') {
      setError(t('errorPlanLimit', { plan, limit: res.limit ?? limit }));
    } else if (res.error === 'EMAIL_EXISTS') {
      setError(t('errorEmailExists'));
    } else {
      setError(t('errorCreate'));
    }
    setCreating(false);
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
          <UserCog className="w-6 h-6 text-purple-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Sección admins */}
      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h2 className="font-black text-zinc-900 dark:text-white text-sm">{t('adminsTitle')}</h2>
              <p className="text-xs text-zinc-500">{t('adminsSubtitle', { plan, limit: planLimitLabel })}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${activeCount >= limit ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'}`}>
            {limit !== Infinity ? t('activeCountWithLimit', { count: activeCount, limit }) : t('activeCountPlural', { count: activeCount })}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {tempPassword && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                {t('tempPasswordBanner')}
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-black/30 rounded-xl px-3 py-2">
                <code className="flex-1 text-sm font-mono text-zinc-800 dark:text-zinc-200 select-all">{tempPassword}</code>
                <button onClick={handleCopy} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">{t('tempPasswordShare')}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${admin.isActive ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-zinc-200 dark:bg-white/10 text-zinc-400'}`}>
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm truncate ${admin.isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 line-through'}`}>
                      {admin.name}
                    </p>
                    {admin.id === currentUserId && (
                      <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-md shrink-0">{t('you')}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{admin.email}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${admin.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-white/10 text-zinc-400'}`}>
                  {admin.isActive ? t('active') : t('inactive')}
                </span>
                {admin.id !== currentUserId && (
                  <>
                    <button
                      onClick={() => handleToggle(admin)}
                      disabled={actionId === admin.id}
                      title={admin.isActive ? t('deactivate') : t('activate')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                    >
                      {admin.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(admin)}
                      disabled={actionId === admin.id}
                      title={t('delete')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3 border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4">
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{t('newAdminTitle')}</p>
              <input
                type="text"
                placeholder={t('namePlaceholder')}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                className="w-full bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('createAdmin')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowCreate(true); setError(''); setTempPassword(null); }}
              disabled={!canAdd}
              title={!canAdd ? t('errorPlanLimit', { plan, limit }) : ''}
              className="w-full py-3 rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-purple-500/50 hover:text-purple-500 hover:bg-purple-500/5 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('addAdmin')}
              {!canAdd && <span className="text-xs font-normal opacity-70">{t('planLimitReached')}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Sección contacto de recuperación */}
      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <LifeBuoy className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="font-black text-zinc-900 dark:text-white text-sm">{t('recoveryTitle')}</h2>
            <p className="text-xs text-zinc-500">{t('recoverySubtitle')}</p>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSaveRecovery} className="space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{t('recoveryDescription')}</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t('recoveryPlaceholder')}
                value={recoveryEmail}
                onChange={e => setRecoveryEmail(e.target.value)}
                className="flex-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={savingRecovery}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center gap-2 shrink-0"
              >
                {savingRecovery ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : recoverySaved ? (
                  <><Check className="w-4 h-4" /> {t('saved')}</>
                ) : (
                  <><Save className="w-4 h-4" /> {t('save')}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
