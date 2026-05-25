'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAllTenantsAction, updateTenantStatusAction, updateTenantPlanAction, deleteTenantAction, startImpersonationAction, updateTenantTrialDaysAction } from '@/app/actions/superAdmin';
import { CheckCircle, Clock, XCircle, Trash2, ShieldCheck, LogIn, MoreVertical, CreditCard, Users, Timer, Search, X as XIcon, UsersRound, AlertTriangle } from 'lucide-react';
import TenantAdminsModal from './TenantAdminsModal';
import TenantUsersModal from './TenantUsersModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTranslations } from 'next-intl';

type Tenant = Awaited<ReturnType<typeof getAllTenantsAction>>[number];

const statusConfig = {
  ACTIVE:    { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  TRIAL:     { icon: Clock,       color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  SUSPENDED: { icon: XCircle,     color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
};

const planConfig = {
  BASIC:        { color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10' },
  PROFESSIONAL: { color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  ENTERPRISE: { color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
};

type PlanType = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

function PlanChangeModal({
  tenant,
  onConfirm,
  onCancel,
  locale,
}: {
  tenant: Tenant;
  onConfirm: (plan: PlanType) => void;
  onCancel: () => void;
  locale: string;
}) {
  const t = useTranslations('SuperAdmin.tenantsPage');
  const [selected, setSelected] = useState<PlanType>(tenant.plan as PlanType);
  const plans: { value: PlanType; label: string; desc: string }[] = [
    { value: 'BASIC',        label: 'Basic',        desc: t('planFreeDesc') },
    { value: 'PROFESSIONAL', label: 'Professional', desc: t('planProDesc') },
    { value: 'ENTERPRISE', label: 'Enterprise',  desc: t('planEnterpriseDesc') },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center w-12 h-12 bg-purple-500/10 rounded-2xl mb-4 mx-auto">
          <CreditCard className="w-6 h-6 text-purple-500" />
        </div>
        <h3 className="text-lg font-black text-zinc-900 dark:text-white text-center">{t('changePlanTitle')}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-1 mb-5">
          <span className="font-bold text-zinc-900 dark:text-white">{tenant.name}</span>
        </p>
        <div className="space-y-2">
          {plans.map(p => (
            <button
              key={p.value}
              onClick={() => setSelected(p.value)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                selected === p.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10'
              }`}
            >
              <div>
                <p className={`font-bold text-sm ${selected === p.value ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-800 dark:text-zinc-200'}`}>{p.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">{p.desc}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected === p.value ? 'border-purple-500 bg-purple-500' : 'border-zinc-300 dark:border-zinc-600'}`} />
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected === tenant.plan}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialDaysModal({
  tenant,
  onConfirm,
  onCancel,
}: {
  tenant: Tenant;
  onConfirm: (days: number) => void;
  onCancel: () => void;
}) {
  const [days, setDays] = useState<number | ''>('');
  const presets = [0, 1, 3, 7, 14];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-2xl mb-4 mx-auto">
          <Timer className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-lg font-black text-zinc-900 dark:text-white text-center">Ajustar días de trial</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-1 mb-5">
          <span className="font-bold text-zinc-900 dark:text-white">{tenant.name}</span>
          {tenant.daysLeft !== null && (
            <span className="ml-2 text-xs">· actualmente {tenant.daysLeft}d restantes</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                days === p
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10'
              }`}
            >
              {p === 0 ? 'Vencido (0)' : `${p} día${p === 1 ? '' : 's'}`}
            </button>
          ))}
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">O ingresa días personalizados</label>
          <input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={e => setDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            placeholder="ej. 30"
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => days !== '' && onConfirm(days as number)}
            disabled={days === ''}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsTable({ tenants: initialTenants, locale }: { tenants: Tenant[]; locale: string }) {
  const t = useTranslations('SuperAdmin.tenantsPage');
  const tStatus = useTranslations('SuperAdmin.tenantStatus');
  const [tenants, setTenants] = useState(initialTenants);
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [planTarget, setPlanTarget] = useState<Tenant | null>(null);
  const [adminsTarget, setAdminsTarget] = useState<Tenant | null>(null);
  const [trialTarget, setTrialTarget] = useState<Tenant | null>(null);
  const [usersTarget, setUsersTarget] = useState<Tenant | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<Tenant | null>(null);
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(ten => {
      const nameMatch = ten.name.toLowerCase().includes(q);
      const slugMatch = ten.slug.toLowerCase().includes(q);
      const emailMatch = ten.users?.some(u => u.email?.toLowerCase().includes(q));
      return nameMatch || slugMatch || emailMatch;
    });
  }, [tenants, search]);

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

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, tenantId: string) => {
    if (openMenu === tenantId) {
      setOpenMenu(null);
      setMenuPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    // Estimated menu height (6 items × ~38px + dividers)
    const MENU_H = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_H + 8;
    setMenuPos({
      top: openUp
        ? rect.top + window.scrollY - MENU_H - 4
        : rect.bottom + window.scrollY + 4,
      left: rect.right - 192,
      openUp,
    });
    setOpenMenu(tenantId);
  }, [openMenu]);

  const handleStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL') => {
    setLoadingId(id);
    setOpenMenu(null);
    setMenuPos(null);
    await updateTenantStatusAction(id, status);
    setLoadingId(null);
    setTenants(prev => prev.map(ten => ten.id === id ? { ...ten, status } : ten));
  };

  const handleDelete = (id: string, name: string) => {
    setOpenMenu(null);
    setMenuPos(null);
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoadingId(deleteTarget.id);
    setDeleteTarget(null);
    await deleteTenantAction(deleteTarget.id);
    setTenants(prev => prev.filter(ten => ten.id !== deleteTarget.id));
    setLoadingId(null);
  };

  const handlePlanChange = (tenant: Tenant) => {
    setOpenMenu(null);
    setMenuPos(null);
    setPlanTarget(tenant);
  };

  const confirmPlanChange = async (plan: PlanType) => {
    if (!planTarget) return;
    setLoadingId(planTarget.id);
    setPlanTarget(null);
    await updateTenantPlanAction(planTarget.id, plan);
    setTenants(prev => prev.map(ten => ten.id === planTarget.id ? { ...ten, plan } : ten));
    setLoadingId(null);
  };

  const handleImpersonate = (tenant: Tenant) => {
    setOpenMenu(null);
    setMenuPos(null);
    setImpersonateError(null);
    setImpersonateTarget(tenant);
  };

  const confirmImpersonate = async () => {
    if (!impersonateTarget) return;
    setImpersonateLoading(true);
    setImpersonateError(null);
    const res = await startImpersonationAction(impersonateTarget.id, locale);
    if (res.success) {
      setImpersonateTarget(null);
      setImpersonateLoading(false);
      // Open tenant admin panel in a new tab via the one-time token route
      window.open(`/api/impersonate/${res.tokenId}`, '_blank', 'noopener,noreferrer');
    } else {
      setImpersonateLoading(false);
      setImpersonateError(res.error === 'rate_limit' ? t('impersonateRateLimit') : t('impersonateError'));
    }
  };

  const handleManageAdmins = (tenant: Tenant) => {
    setOpenMenu(null);
    setMenuPos(null);
    setAdminsTarget(tenant);
  };

  const handleViewUsers = (tenant: Tenant) => {
    setOpenMenu(null);
    setMenuPos(null);
    setUsersTarget(tenant);
  };

  const handleTrialDays = (tenant: Tenant) => {
    setOpenMenu(null);
    setMenuPos(null);
    setTrialTarget(tenant);
  };

  const confirmTrialDays = async (days: number) => {
    if (!trialTarget) return;
    setLoadingId(trialTarget.id);
    setTrialTarget(null);
    await updateTenantTrialDaysAction(trialTarget.id, days);
    const newExpiry = days <= 0 ? new Date(Date.now() - 1000) : new Date(Date.now() + days * 86_400_000);
    setTenants(prev => prev.map(ten =>
      ten.id === trialTarget.id
        ? { ...ten, subscriptionExpiresAt: newExpiry, status: 'TRIAL', daysLeft: days <= 0 ? -1 : days }
        : ten
    ));
    setLoadingId(null);
  };

  return (
    <>
      {/* Modals */}
      {trialTarget && (
        <TrialDaysModal
          tenant={trialTarget}
          onConfirm={confirmTrialDays}
          onCancel={() => setTrialTarget(null)}
        />
      )}
      {adminsTarget && (
        <TenantAdminsModal
          tenantId={adminsTarget.id}
          tenantName={adminsTarget.name}
          plan={adminsTarget.plan}
          recoveryEmail={(adminsTarget as any).recoveryEmail ?? null}
          onClose={() => setAdminsTarget(null)}
        />
      )}
      {usersTarget && (
        <TenantUsersModal
          tenantId={usersTarget.id}
          tenantName={usersTarget.name}
          plan={usersTarget.plan}
          onClose={() => setUsersTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('deleteTitle')}
        message={t('deleteMessage', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('deleteConfirm')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {planTarget && (
        <PlanChangeModal
          tenant={planTarget}
          onConfirm={confirmPlanChange}
          onCancel={() => setPlanTarget(null)}
          locale={locale}
        />
      )}

      {/* Impersonate confirmation modal */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!impersonateLoading) setImpersonateTarget(null); }} />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-4 mx-auto">
              <ShieldCheck className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white text-center">{t('impersonateTitle')}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-2 mb-1">
              {t('impersonateMessage')}
            </p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white text-center mb-5">
              {impersonateTarget.name}
            </p>
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 mb-5 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{t('impersonateWarning')}</p>
            </div>
            {impersonateError && (
              <p className="text-xs text-rose-500 text-center mb-3">{impersonateError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setImpersonateTarget(null)}
                disabled={impersonateLoading}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-colors disabled:opacity-50"
              >
                {t('impersonateCancel')}
              </button>
              <button
                onClick={confirmImpersonate}
                disabled={impersonateLoading}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {impersonateLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><LogIn className="w-4 h-4" />{t('impersonateConfirm')}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por empresa, slug o email..."
          className="w-full pl-10 pr-10 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black/20">
                <th className="text-left px-6 py-4 font-semibold">{t('colCompany')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('colSlug')}</th>
                <th className="text-center px-6 py-4 font-semibold">{t('colStatus')}</th>
                <th className="text-center px-6 py-4 font-semibold">{t('colPlan')}</th>
                <th className="text-center px-6 py-4 font-semibold">{t('colBookings')}</th>
                <th className="text-center px-6 py-4 font-semibold">{t('colTrial')}</th>
                <th className="text-center px-6 py-4 font-semibold">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    No se encontraron resultados para <strong className="text-zinc-600 dark:text-zinc-300">"{search}"</strong>
                  </td>
                </tr>
              )}
              {filteredTenants.map(tenant => {
                const cfg = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.SUSPENDED;
                const planCfg = planConfig[tenant.plan as keyof typeof planConfig] || planConfig.BASIC;
                const isLoading = loadingId === tenant.id;
                return (
                  <tr key={tenant.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-white">{tenant.name}</p>
                      <p className="text-xs text-zinc-500">{tenant.adminCount} admin(s) · {tenant.branchCount} sucursal(es)</p>
                      {tenant.users?.filter(u => u.role === 'ADMIN').map(u => (
                        <p key={u.id} className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{u.email}</p>
                      ))}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg">{tenant.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" />
                        {tStatus(tenant.status as any)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${planCfg.color}`}>{tenant.plan}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-zinc-900 dark:text-white">{tenant.bookingCount}</td>
                    <td className="px-6 py-4 text-center">
                      {tenant.daysLeft !== null ? (
                        <span className={`font-bold text-sm ${tenant.daysLeft < 3 ? 'text-rose-500' : tenant.daysLeft < 7 ? 'text-amber-500' : 'text-zinc-600 dark:text-zinc-300'}`}>
                          {tenant.daysLeft}d
                        </span>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleImpersonate(tenant)}
                          disabled={isLoading}
                          title={t('impersonateTitle')}
                          className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleOpenMenu(e, tenant.id)}
                          disabled={isLoading}
                          className={`p-2 rounded-lg transition-all disabled:opacity-50 ${openMenu === tenant.id ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                        >
                          <MoreVertical className="w-4 h-4" />
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

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredTenants.length === 0 && (
          <div className="text-center py-10 text-zinc-400 text-sm">
            No se encontraron resultados para <strong className="text-zinc-600 dark:text-zinc-300">"{search}"</strong>
          </div>
        )}
        {filteredTenants.map(tenant => {
          const cfg = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.SUSPENDED;
          const planCfg = planConfig[tenant.plan as keyof typeof planConfig] || planConfig.BASIC;
          const isLoading = loadingId === tenant.id;
          return (
            <div key={tenant.id} className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900 dark:text-white truncate">{tenant.name}</p>
                  <code className="text-xs text-purple-600 dark:text-purple-400">{tenant.slug}</code>
                  {tenant.users?.filter(u => u.role === 'ADMIN').map(u => (
                    <p key={u.id} className="text-xs text-zinc-500 mt-0.5 truncate">{u.email}</p>
                  ))}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleImpersonate(tenant)}
                    disabled={isLoading}
                    title={t('impersonateTitle')}
                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => handleOpenMenu(e, tenant.id)}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${openMenu === tenant.id ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                  <cfg.icon className="w-3 h-3" />
                  {tStatus(tenant.status as any)}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${planCfg.color}`}>{tenant.plan}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{tenant.bookingCount} reservas · {tenant.branchCount} suc.</span>
                {tenant.daysLeft !== null && (
                  <span className={`text-xs font-bold ${tenant.daysLeft < 3 ? 'text-rose-500' : tenant.daysLeft < 7 ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    Trial: {tenant.daysLeft}d
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dropdown menu */}
      {openMenu && menuPos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className={`w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 ${menuPos.openUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
        >
          <button
            onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handleImpersonate(ten); }}
            className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
          >
            <LogIn className="w-3.5 h-3.5" /> {t('impersonateMenuItem')}
          </button>
          <div className="border-t border-zinc-100 dark:border-white/5" />
          <button
            onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handleViewUsers(ten); }}
            className="w-full text-left px-4 py-2.5 text-sm text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors flex items-center gap-2"
          >
            <UsersRound className="w-3.5 h-3.5" /> {t('viewUsers')}
          </button>
          <button
            onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handleManageAdmins(ten); }}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5" /> Gestionar admins
          </button>
          <button
            onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handlePlanChange(ten); }}
            className="w-full text-left px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-3.5 h-3.5" /> {t('changePlan')}
          </button>
          <button
            onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handleTrialDays(ten); }}
            className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
          >
            <Timer className="w-3.5 h-3.5" /> Ajustar días trial
          </button>
          <div className="border-t border-zinc-100 dark:border-white/5" />
          {tenants.find(ten => ten.id === openMenu)?.status !== 'ACTIVE' && (
            <button onClick={() => handleStatus(openMenu, 'ACTIVE')} className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" /> {t('activate')}
            </button>
          )}
          {tenants.find(ten => ten.id === openMenu)?.status !== 'SUSPENDED' && (
            <button onClick={() => handleStatus(openMenu, 'SUSPENDED')} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5" /> {t('suspend')}
            </button>
          )}
          <div className="border-t border-zinc-100 dark:border-white/5">
            <button
              onClick={() => { const ten = tenants.find(ten => ten.id === openMenu); if (ten) handleDelete(ten.id, ten.name); }}
              className="w-full text-left px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
