'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, AlertCircle,
  ShieldCheck, UserCog, LifeBuoy, Save, Crown, X, AlertTriangle, Globe,
  Mail, MessageSquare, CheckCircle2, Info, Lock,
} from 'lucide-react';
import {
  getAdminsAction, createAdminAction, toggleAdminAction, deleteAdminAction,
  updateRecoveryEmailAction, transferOwnershipAction,
} from '@/app/actions/adminUsers';
import { updateConfiguracionAction } from '@/app/actions/tenant';
import { canUseFeature } from '@/core/plans';

type Admin = Awaited<ReturnType<typeof getAdminsAction>>[number];

type ConfirmState =
  | { type: 'delete'; admin: Admin }
  | { type: 'toggle'; admin: Admin; newActive: boolean }
  | { type: 'transfer'; admin: Admin }
  | null;

const ADMIN_LIMITS: Record<string, number> = { BASIC: 1, PROFESSIONAL: 2, ENTERPRISE: Infinity };

const TIMEZONES = [
  { group: 'América Central', options: [
    { value: 'America/El_Salvador', label: 'El Salvador, Guatemala, Honduras (GMT-6)' },
    { value: 'America/Costa_Rica',  label: 'Costa Rica, Nicaragua (GMT-6)' },
    { value: 'America/Panama',      label: 'Panamá (GMT-5)' },
    { value: 'America/Mexico_City', label: 'México Centro (GMT-6)' },
    { value: 'America/Monterrey',   label: 'México Norte (GMT-6)' },
    { value: 'America/Tijuana',     label: 'México Noroeste (GMT-7)' },
  ]},
  { group: 'América del Sur', options: [
    { value: 'America/Bogota',      label: 'Colombia, Ecuador, Perú (GMT-5)' },
    { value: 'America/Caracas',     label: 'Venezuela (GMT-4)' },
    { value: 'America/La_Paz',      label: 'Bolivia (GMT-4)' },
    { value: 'America/Santiago',    label: 'Chile (GMT-4/-3)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina, Uruguay (GMT-3)' },
    { value: 'America/Sao_Paulo',   label: 'Brasil Este (GMT-3)' },
    { value: 'America/Manaus',      label: 'Brasil Oeste (GMT-4)' },
  ]},
  { group: 'América del Norte', options: [
    { value: 'America/New_York',    label: 'Este de EE.UU. (GMT-5/-4)' },
    { value: 'America/Chicago',     label: 'Centro de EE.UU. (GMT-6/-5)' },
    { value: 'America/Denver',      label: 'Montaña de EE.UU. (GMT-7/-6)' },
    { value: 'America/Los_Angeles', label: 'Pacífico de EE.UU. (GMT-8/-7)' },
    { value: 'America/Anchorage',   label: 'Alaska (GMT-9/-8)' },
    { value: 'Pacific/Honolulu',    label: 'Hawái (GMT-10)' },
  ]},
  { group: 'Caribe', options: [
    { value: 'America/Puerto_Rico', label: 'Puerto Rico, Rep. Dominicana (GMT-4)' },
    { value: 'America/Havana',      label: 'Cuba (GMT-5/-4)' },
    { value: 'America/Jamaica',     label: 'Jamaica (GMT-5)' },
  ]},
  { group: 'Europa', options: [
    { value: 'UTC',                 label: 'UTC (GMT+0)' },
    { value: 'Europe/London',       label: 'Londres (GMT+0/+1)' },
    { value: 'Europe/Madrid',       label: 'España, Francia (GMT+1/+2)' },
    { value: 'Europe/Berlin',       label: 'Alemania, Italia (GMT+1/+2)' },
    { value: 'Europe/Moscow',       label: 'Moscú (GMT+3)' },
  ]},
  { group: 'Asia / Pacífico', options: [
    { value: 'Asia/Dubai',          label: 'Dubai (GMT+4)' },
    { value: 'Asia/Kolkata',        label: 'India (GMT+5:30)' },
    { value: 'Asia/Bangkok',        label: 'Tailandia, Vietnam (GMT+7)' },
    { value: 'Asia/Singapore',      label: 'Singapur, Malasia (GMT+8)' },
    { value: 'Asia/Tokyo',          label: 'Japón (GMT+9)' },
    { value: 'Australia/Sydney',    label: 'Sídney (GMT+10/+11)' },
  ]},
];

function ConfirmModal({
  state,
  loading,
  onConfirm,
  onClose,
  t,
}: {
  state: NonNullable<ConfirmState>;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<'Dashboard.settings'>>;
}) {
  const isDelete = state.type === 'delete';
  const isTransfer = state.type === 'transfer';

  const title = isDelete
    ? t('confirmDeleteTitle')
    : isTransfer
    ? t('confirmTransferTitle')
    : state.newActive
    ? t('activate')
    : t('deactivate');

  const desc = isDelete
    ? t('confirmDeleteDesc', { name: state.admin.name })
    : isTransfer
    ? t('confirmTransferDesc', { name: state.admin.name })
    : state.newActive
    ? t('confirmActivateDesc', { name: state.admin.name })
    : t('confirmDeactivateDesc', { name: state.admin.name });

  const confirmCls = isDelete || isTransfer
    ? 'flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60'
    : 'flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            {(isDelete || isTransfer) && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">{desc}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
            >
              {t('cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={confirmCls}
            >
              {loading
                ? <span className="flex justify-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span>
                : t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsClient({
  initialAdmins,
  plan,
  currentUserId,
  initialRecoveryEmail,
  tenantId,
  initialTimezone,
  initialEmailLocale,
  initialEmailBodyTemplate,
  initialWhatsappNumber,
  initialWaMessageTemplate,
}: {
  initialAdmins: Admin[];
  plan: string;
  currentUserId: string;
  initialRecoveryEmail: string | null;
  tenantId: string;
  initialTimezone: string;
  initialEmailLocale: string;
  initialEmailBodyTemplate: string;
  initialWhatsappNumber: string;
  initialWaMessageTemplate: string;
}) {
  const t = useTranslations('Dashboard.settings');

  // ── Configuración general ──────────────────────────────────────────────────
  const [timezone, setTimezone] = useState(initialTimezone);
  const [emailLocale, setEmailLocale] = useState(initialEmailLocale);
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(initialEmailBodyTemplate);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [waMessageTemplate, setWaMessageTemplate] = useState(initialWaMessageTemplate);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Administradores ────────────────────────────────────────────────────────
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
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const limit = ADMIN_LIMITS[plan] ?? 1;
  const activeCount = admins.filter(a => a.isActive).length;
  const canAdd = activeCount < limit;
  const planLimitLabel = limit === Infinity ? t('planLimitUnlimited') : `${limit} admin${limit !== 1 ? 's' : ''}`;
  const currentUserIsOwner = admins.find(a => a.id === currentUserId)?.isOwner ?? false;

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMessage(null);
    const res = await updateConfiguracionAction({
      tenantId,
      timezone,
      emailLocale,
      emailBodyTemplate: emailBodyTemplate || null,
      whatsappNumber: whatsappNumber || null,
      waMessageTemplate: waMessageTemplate || null,
    });
    if (res.success) {
      setConfigMessage({ type: 'success', text: t('savedSuccess') });
      setTimeout(() => setConfigMessage(null), 3000);
    } else {
      setConfigMessage({ type: 'error', text: t('savedError') });
    }
    setSavingConfig(false);
  };

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

  const handleConfirm = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    setError('');

    if (confirmState.type === 'toggle') {
      setActionId(confirmState.admin.id);
      const res = await toggleAdminAction(confirmState.admin.id, confirmState.newActive);
      if (res.success) {
        setAdmins(prev => prev.map(a => a.id === confirmState.admin.id ? { ...a, isActive: confirmState.newActive } : a));
      } else if (res.error === 'LAST_ADMIN') {
        setError(t('errorLastAdmin'));
      }
      setActionId(null);
    } else if (confirmState.type === 'delete') {
      setActionId(confirmState.admin.id);
      const res = await deleteAdminAction(confirmState.admin.id);
      if (res.success) {
        setAdmins(prev => prev.filter(a => a.id !== confirmState.admin.id));
      } else if (res.error === 'LAST_ADMIN') {
        setError(t('errorLastAdminDelete'));
      } else if (res.error === 'CANNOT_DELETE_SELF') {
        setError(t('errorSelf'));
      }
      setActionId(null);
    } else if (confirmState.type === 'transfer') {
      const res = await transferOwnershipAction(confirmState.admin.id);
      if (res.success) {
        await reload();
      } else {
        setError(t('errorTransfer'));
      }
    }

    setConfirmLoading(false);
    setConfirmState(null);
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
    <div className="max-w-2xl space-y-8">
      {confirmState && (
        <ConfirmModal
          state={confirmState}
          loading={confirmLoading}
          onConfirm={handleConfirm}
          onClose={() => !confirmLoading && setConfirmState(null)}
          t={t}
        />
      )}

      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
          <UserCog className="w-6 h-6 text-purple-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* ── Sección: General ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          {t('generalTitle')}
        </h2>

        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {t('timezoneLabel')}
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full p-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-zinc-900 dark:text-white"
            >
              {TIMEZONES.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {t('timezoneHint')}: <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">{timezone}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Sección: Comunicación ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-500" />
          {t('comunicacionTitle')}
        </h2>

        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 space-y-5">
          {/* Idioma de correos */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {t('emailLocaleLabel')}
            </label>
            <div className="flex gap-3">
              {[{ value: 'es', label: '🇪🇸 Español' }, { value: 'en', label: '🇺🇸 English' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmailLocale(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    emailLocale === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {t('emailLocaleHint')}
            </p>
          </div>

          {/* WhatsApp de contacto */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {t('whatsappLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="Ej: 50370000000"
                className="w-full pl-10 p-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{t('whatsappHint')}</p>
          </div>

          {/* Plantilla de email */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {t('emailTemplateLabel')}
            </label>
            {canUseFeature(plan, 'customEmailTemplate') ? (
              <>
                <textarea
                  value={emailBodyTemplate}
                  onChange={e => setEmailBodyTemplate(e.target.value)}
                  placeholder={t('emailTemplatePlaceholder')}
                  className="w-full min-h-[120px] p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none text-sm text-zinc-900 dark:text-white"
                />
                <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-widest">
                    {t('emailVariables')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['{cliente}', '{servicio}', '{fecha}', '{hora}', '{negocio}', '{sucursal}'].map(v => (
                      <code key={v} className="text-xs bg-white dark:bg-white/5 text-blue-500 px-2 py-1 rounded border border-blue-500/20">{v}</code>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl">
                <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <p className="text-xs font-black text-zinc-600 dark:text-zinc-300">{t('emailTemplateLocked')}</p>
                  <a href="../billing" className="text-[11px] text-purple-500 font-bold hover:underline">{t('emailTemplateLockedCta')}</a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status + Save button */}
        {configMessage && (
          <div className={`p-3 rounded-2xl flex items-center gap-3 text-sm font-bold ${
            configMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            {configMessage.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {configMessage.text}
          </div>
        )}

        <button
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 text-sm"
        >
          {savingConfig
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {t('save')}
        </button>
      </div>

      {/* ── Sección: Administradores ──────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          {t('adminsTitle')}
        </h2>

        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
            <p className="text-xs text-zinc-500">{t('adminsSubtitle', { plan, limit: planLimitLabel })}</p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-sm truncate ${admin.isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 line-through'}`}>
                        {admin.name}
                      </p>
                      {admin.id === currentUserId && (
                        <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-md shrink-0">{t('you')}</span>
                      )}
                      {admin.isOwner && (
                        <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                          <Crown className="w-3 h-3" />{t('owner')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{admin.email}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${admin.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-white/10 text-zinc-400'}`}>
                    {admin.isActive ? t('active') : t('inactive')}
                  </span>

                  {!admin.isOwner && currentUserIsOwner && (
                    <>
                      <button
                        onClick={() => setConfirmState({ type: 'transfer', admin })}
                        disabled={actionId === admin.id}
                        title={t('transferOwnership')}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                      >
                        <Crown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setConfirmState({ type: 'toggle', admin, newActive: !admin.isActive })}
                        disabled={actionId === admin.id}
                        title={admin.isActive ? t('deactivate') : t('activate')}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                      >
                        {admin.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setConfirmState({ type: 'delete', admin })}
                        disabled={actionId === admin.id}
                        title={t('delete')}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                      >
                        <Trash2 className="w-5 h-5" />
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
              currentUserIsOwner && (
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
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Sección: Contacto de recuperación ─────────────────────────────── */}
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
            <div className="flex flex-col sm:flex-row gap-2">
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
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shrink-0"
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
