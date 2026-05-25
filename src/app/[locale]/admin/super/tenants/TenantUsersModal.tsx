'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Users, CheckCircle2, Clock, XCircle, MoreVertical, KeyRound,
  Mail, UserX, UserCheck, Loader2, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import {
  getTenantUsersAction,
  superAdminResetPasswordAction,
  superAdminResendInvitationAction,
  superAdminDeactivateUserAction,
  superAdminReactivateUserAction,
} from '@/app/actions/superAdmin';

type TenantUser = Awaited<ReturnType<typeof getTenantUsersAction>>[number];

// ─── Plan staff limits ────────────────────────────────────────────────────────
const STAFF_LIMITS: Record<string, number> = {
  BASIC: 2,
  PROFESSIONAL: 15,
  ENTERPRISE: 9999,
};

// ─── Relative time ────────────────────────────────────────────────────────────
function formatRelative(date: Date | null): string {
  if (!date) return 'Nunca';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 30) return `hace ${days}d`;
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Activo
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Clock className="w-3 h-3" /> Pendiente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-200 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
      <XCircle className="w-3 h-3" /> Inactivo
    </span>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <ShieldCheck className="w-3 h-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
      <Users className="w-3 h-3" /> Staff
    </span>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmActionDialog({
  title,
  message,
  confirmLabel,
  variant,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const colors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-400',
    primary: 'bg-purple-600 hover:bg-purple-500',
  };
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-base font-black text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 ${colors[variant]}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User action dropdown ────────────────────────────────────────────────────
function UserActionMenu({
  user,
  onAction,
}: {
  user: TenantUser;
  onAction: (action: string, user: TenantUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl py-1 min-w-[170px] animate-in fade-in duration-100">
          {/* Reset password — always shown */}
          <button
            onClick={() => { setOpen(false); onAction('reset_password', user); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-500" /> Resetear contraseña
          </button>
          {/* Resend invitation — only if Pending */}
          {user.status === 'PENDING' && (
            <button
              onClick={() => { setOpen(false); onAction('resend_invitation', user); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-blue-500" /> Reenviar invitación
            </button>
          )}
          <div className="border-t border-zinc-100 dark:border-white/5 my-1" />
          {/* Deactivate — only if Active or Pending */}
          {user.status !== 'INACTIVE' && (
            <button
              onClick={() => { setOpen(false); onAction('deactivate', user); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <UserX className="w-3.5 h-3.5" /> Desactivar usuario
            </button>
          )}
          {/* Reactivate — only if Inactive */}
          {user.status === 'INACTIVE' && (
            <button
              onClick={() => { setOpen(false); onAction('reactivate', user); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Reactivar usuario
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function TenantUsersModal({
  tenantId,
  tenantName,
  plan,
  onClose,
}: {
  tenantId: string;
  tenantName: string;
  plan: string;
  onClose: () => void;
}) {
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ action: string; user: TenantUser } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; success: boolean } | null>(null);

  const staffLimit = STAFF_LIMITS[plan] ?? 2;
  const staffCount = tenantUsers.filter(u => u.role === 'STAFF').length;
  const adminCount = tenantUsers.filter(u => u.role === 'ADMIN').length;
  const activeCount = tenantUsers.filter(u => u.status === 'ACTIVE').length;
  const usagePercent = staffLimit >= 9999 ? 0 : Math.round((staffCount / staffLimit) * 100);
  const atLimit = staffLimit < 9999 && staffCount >= staffLimit;

  useEffect(() => {
    getTenantUsersAction(tenantId).then(data => {
      setTenantUsers(data);
      setLoading(false);
    });
  }, [tenantId]);

  function showToast(msg: string, success: boolean) {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 4000);
  }

  function handleAction(action: string, user: TenantUser) {
    setActionTarget({ action, user });
  }

  async function executeAction() {
    if (!actionTarget) return;
    setActionLoading(true);
    const { action, user } = actionTarget;
    let result: { success: boolean; error?: string };

    if (action === 'reset_password') {
      result = await superAdminResetPasswordAction(user.id);
    } else if (action === 'resend_invitation') {
      result = await superAdminResendInvitationAction(user.id);
    } else if (action === 'deactivate') {
      result = await superAdminDeactivateUserAction(user.id);
      if (result.success) {
        setTenantUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: false, status: 'INACTIVE' } : u));
      }
    } else if (action === 'reactivate') {
      result = await superAdminReactivateUserAction(user.id);
      if (result.success) {
        setTenantUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: true, status: 'ACTIVE' } : u));
      }
    } else {
      result = { success: false };
    }

    setActionLoading(false);
    setActionTarget(null);

    if (result.success) {
      const msgs: Record<string, string> = {
        reset_password: 'Email de restablecimiento enviado correctamente.',
        resend_invitation: 'Invitación reenviada correctamente.',
        deactivate: 'Usuario desactivado.',
        reactivate: 'Usuario reactivado.',
      };
      showToast(msgs[action] ?? 'Acción completada.', true);
    } else {
      const err = (result as any).error;
      showToast(err === 'LAST_ADMIN' ? 'No puedes desactivar el único admin activo.' : 'Ocurrió un error. Intenta de nuevo.', false);
    }
  }

  // Confirmation dialog content
  const confirmContent: Record<string, { title: string; message: (u: TenantUser) => string; label: string; variant: 'danger' | 'warning' | 'primary' }> = {
    reset_password: {
      title: 'Resetear contraseña',
      message: u => `Se enviará un email a ${u.email} con instrucciones para crear una nueva contraseña. ¿Continuar?`,
      label: 'Enviar email',
      variant: 'primary',
    },
    resend_invitation: {
      title: 'Reenviar invitación',
      message: u => `Se reenviará el email de activación a ${u.email}. ¿Continuar?`,
      label: 'Reenviar',
      variant: 'primary',
    },
    deactivate: {
      title: 'Desactivar usuario',
      message: u => `El usuario ${u.name} no podrá acceder al sistema. Sus citas y datos se conservan. ¿Continuar?`,
      label: 'Desactivar',
      variant: 'danger',
    },
    reactivate: {
      title: 'Reactivar usuario',
      message: u => `El usuario ${u.name} recuperará acceso al sistema. ¿Continuar?`,
      label: 'Reactivar',
      variant: 'primary',
    },
  };

  return (
    <>
      {/* Confirm dialog */}
      {actionTarget && confirmContent[actionTarget.action] && (
        <ConfirmActionDialog
          title={confirmContent[actionTarget.action].title}
          message={confirmContent[actionTarget.action].message(actionTarget.user)}
          confirmLabel={confirmContent[actionTarget.action].label}
          variant={confirmContent[actionTarget.action].variant}
          onConfirm={executeAction}
          onCancel={() => setActionTarget(null)}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[10001] px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 ${
          toast.success ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 z-[9990] flex items-start justify-end p-4 sm:p-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Drawer */}
        <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col animate-in slide-in-from-right-8 duration-300">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 dark:text-white">Usuarios de la empresa</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{tenantName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary */}
          {!loading && (
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/5 shrink-0 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Total usuarios:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{tenantUsers.length}</span>
                  <span className="text-zinc-400">({adminCount} admin{adminCount !== 1 ? 's' : ''} + {staffCount} staff)</span>
                </div>
                {atLimit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> Al límite — no puede agregar más usuarios
                  </span>
                )}
              </div>
              {staffLimit < 9999 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Especialistas: {staffCount} de {staffLimit} permitidos ({plan})</span>
                    <span className={usagePercent >= 100 ? 'text-rose-500 font-bold' : usagePercent >= 80 ? 'text-amber-500 font-bold' : ''}>{usagePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${usagePercent >= 100 ? 'bg-rose-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : tenantUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay usuarios registrados en esta empresa.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/80 dark:bg-white/[0.02]">
                        <th className="text-left px-6 py-3 font-semibold">Nombre</th>
                        <th className="text-left px-4 py-3 font-semibold">Email</th>
                        <th className="text-center px-4 py-3 font-semibold">Rol</th>
                        <th className="text-center px-4 py-3 font-semibold">Estado</th>
                        <th className="text-left px-4 py-3 font-semibold">Último acceso</th>
                        <th className="text-left px-4 py-3 font-semibold">Creado</th>
                        <th className="text-center px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantUsers.map(user => (
                        <tr key={user.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors last:border-0">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[140px]">{user.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs truncate max-w-[180px]">{user.email}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatRelative(user.lastLoginAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(user.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <UserActionMenu user={user} onAction={handleAction} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-zinc-100 dark:divide-white/5">
                  {tenantUsers.map(user => (
                    <div key={user.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                        </div>
                        <UserActionMenu user={user} onAction={handleAction} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={user.role} />
                        <StatusBadge status={user.status} />
                        <span className="text-xs text-zinc-400">· {formatRelative(user.lastLoginAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
