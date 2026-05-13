'use client';

import { useState } from 'react';
import { Users, X, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, AlertCircle, ShieldCheck, LifeBuoy } from 'lucide-react';
import { getTenantAdminsAction, createTenantAdminAction, toggleTenantAdminAction, deleteTenantAdminAction, restoreAccessAction } from '@/app/actions/superAdmin';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type Admin = Awaited<ReturnType<typeof getTenantAdminsAction>>[number];

const ADMIN_LIMITS: Record<string, number> = {
  BASIC: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: Infinity,
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: '1 admin',
  PROFESSIONAL: '2 admins',
  ENTERPRISE: 'ilimitados',
};

export default function TenantAdminsModal({
  tenantId,
  tenantName,
  plan,
  recoveryEmail,
  onClose,
}: {
  tenantId: string;
  tenantName: string;
  plan: string;
  recoveryEmail?: string | null;
  onClose: () => void;
}) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restoringAccess, setRestoringAccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);

  const limit = ADMIN_LIMITS[plan] ?? 1;
  const activeCount = admins?.filter(a => a.isActive).length ?? 0;
  const canAdd = activeCount < limit;

  useState(() => {
    getTenantAdminsAction(tenantId).then(data => {
      setAdmins(data);
      setLoading(false);
    });
  });

  const reload = async () => {
    const data = await getTenantAdminsAction(tenantId);
    setAdmins(data);
  };

  const handleToggle = async (admin: Admin) => {
    setActionId(admin.id);
    const res = await toggleTenantAdminAction(admin.id, tenantId, !admin.isActive);
    if (res.success) {
      setAdmins(prev => prev?.map(a => a.id === admin.id ? { ...a, isActive: !a.isActive } : a) ?? null);
    } else if (res.error === 'LAST_ADMIN') {
      setError('No puedes desactivar el único admin activo.');
    }
    setActionId(null);
  };

  const handleDelete = (admin: Admin) => {
    setDeleteTarget(admin);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    setDeleteTarget(null);
    const res = await deleteTenantAdminAction(deleteTarget.id, tenantId);
    if (res.success) {
      setAdmins(prev => prev?.filter(a => a.id !== deleteTarget.id) ?? null);
    } else if (res.error === 'LAST_ADMIN') {
      setError('No puedes eliminar el único admin del tenant.');
    }
    setActionId(null);
  };

  const handleRestoreAccess = async () => {
    setRestoringAccess(true);
    setError('');
    const res = await restoreAccessAction(tenantId);
    if (res.success) {
      setTempPassword(res.tempPassword ?? null);
      setTempEmail(res.recoveryEmail ?? null);
      await reload();
    } else if (res.error === 'NO_RECOVERY_EMAIL') {
      setError('Este tenant no tiene un email de recuperación configurado.');
    }
    setRestoringAccess(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    const res = await createTenantAdminAction(tenantId, { name: newName, email: newEmail });
    if (res.success) {
      setTempPassword(res.tempPassword ?? null);
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      await reload();
    } else if (res.error === 'PLAN_LIMIT') {
      setError(`El plan ${plan} permite máximo ${res.limit} admin(s) activo(s).`);
    } else if (res.error === 'EMAIL_EXISTS') {
      setError('Ya existe un usuario con ese email.');
    } else {
      setError('Error al crear el admin.');
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
    <>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-sm">{tenantName}</h3>
              <p className="text-xs text-zinc-500">Administradores · Plan {plan} ({PLAN_LABELS[plan] ?? '1 admin'})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Temp password banner */}
          {tempPassword && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Acceso listo{tempEmail ? ` para ${tempEmail}` : ''} — contraseña temporal (expira en 7 días)
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-black/30 rounded-xl px-3 py-2">
                <code className="flex-1 text-sm font-mono text-zinc-800 dark:text-zinc-200 select-all">{tempPassword}</code>
                <button onClick={handleCopy} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Comparte esta contraseña. Al ingresar deberá cambiarla.</p>
            </div>
          )}

          {/* Restaurar acceso via recovery email */}
          {recoveryEmail && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <LifeBuoy className="w-4 h-4" />
                Email de recuperación configurado
              </div>
              <p className="text-xs text-zinc-500">{recoveryEmail}</p>
              <button
                onClick={handleRestoreAccess}
                disabled={restoringAccess}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                {restoringAccess ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Restaurar acceso con este email'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Lista de admins */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {admins?.map(admin => (
                <div key={admin.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${admin.isActive ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-zinc-200 dark:bg-white/10 text-zinc-400'}`}>
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${admin.isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 line-through'}`}>{admin.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{admin.email}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${admin.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-white/10 text-zinc-400'}`}>
                    {admin.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => handleToggle(admin)}
                    disabled={actionId === admin.id}
                    title={admin.isActive ? 'Desactivar' : 'Activar'}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                  >
                    {admin.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(admin)}
                    disabled={actionId === admin.id}
                    title="Eliminar"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario crear admin */}
          {showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3 border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4">
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">Nuevo administrador</p>
              <input
                type="text"
                placeholder="Nombre completo"
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Crear admin'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowCreate(true); setError(''); setTempPassword(null); }}
              disabled={!canAdd}
              title={!canAdd ? `El plan ${plan} permite máximo ${limit} admin(s) activo(s)` : ''}
              className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-purple-500/50 hover:text-purple-500 hover:bg-purple-500/5 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Agregar admin
              {!canAdd && <span className="text-xs font-normal">(límite del plan)</span>}
            </button>
          )}
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={!!deleteTarget}
      title="Eliminar administrador"
      message={`¿Eliminar a ${deleteTarget?.name ?? ''}? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}
