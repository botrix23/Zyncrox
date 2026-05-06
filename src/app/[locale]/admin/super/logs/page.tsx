import { getAuditLogsAction } from '@/app/actions/superAdmin';
import { FileText, LogIn, LogOut, UserX, ShieldCheck, Settings, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

const actionConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  LOGIN_SUCCESS:         { icon: LogIn,       color: 'text-emerald-400', label: 'Login exitoso' },
  LOGIN_FAILED:          { icon: LogIn,       color: 'text-rose-400',    label: 'Login fallido' },
  LOGOUT:                { icon: LogOut,      color: 'text-zinc-400',    label: 'Logout' },
  TENANT_REGISTERED:     { icon: FileText,    color: 'text-blue-400',    label: 'Empresa registrada' },
  TENANT_STATUS_CHANGED: { icon: Settings,    color: 'text-amber-400',   label: 'Estado cambiado' },
  TENANT_DELETED:        { icon: UserX,       color: 'text-rose-500',    label: 'Empresa eliminada' },
  IMPERSONATION_STARTED: { icon: ShieldCheck, color: 'text-purple-400',  label: 'Impersonación iniciada' },
  IMPERSONATION_ENDED:   { icon: ShieldCheck, color: 'text-zinc-400',    label: 'Impersonación terminada' },
  SETTINGS_UPDATED:      { icon: Settings,    color: 'text-blue-300',    label: 'Configuración actualizada' },
  BOOKING_CREATED:       { icon: Bookmark,    color: 'text-teal-400',    label: 'Reserva creada' },
  SERVICE_CREATED:       { icon: FileText,    color: 'text-indigo-400',  label: 'Servicio creado' },
  SERVICE_UPDATED:       { icon: FileText,    color: 'text-indigo-300',  label: 'Servicio actualizado' },
  SERVICE_DELETED:       { icon: FileText,    color: 'text-rose-400',    label: 'Servicio eliminado' },
  STAFF_CREATED:         { icon: FileText,    color: 'text-cyan-400',    label: 'Staff creado' },
  STAFF_UPDATED:         { icon: FileText,    color: 'text-cyan-300',    label: 'Staff actualizado' },
  STAFF_DELETED:         { icon: FileText,    color: 'text-rose-300',    label: 'Staff eliminado' },
};

export default async function AuditLogsPage() {
  const logs = await getAuditLogsAction({ limit: 100 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <FileText className="w-7 h-7 text-purple-400" />
          Logs de Auditoría
        </h1>
        <p className="text-zinc-500 mt-1">Registro completo de eventos críticos de la plataforma. Últimos {logs.length} eventos.</p>
      </div>

      {/* Desktop table */}
      <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-white/5 bg-black/20">
                <th className="text-left px-6 py-4 font-semibold">Evento</th>
                <th className="text-left px-6 py-4 font-semibold">Detalles</th>
                <th className="text-left px-6 py-4 font-semibold">Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-600">
                    No hay eventos registrados aún.
                  </td>
                </tr>
              ) : logs.map(log => {
                const cfg = actionConfig[log.action] || { icon: FileText, color: 'text-zinc-400', label: log.action };
                const Icon = cfg.icon;
                const details = log.details as Record<string, unknown> | null;
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-2 font-semibold ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-400 font-mono text-xs max-w-xs truncate">
                      {details ? JSON.stringify(details) : '—'}
                    </td>
                    <td className="px-6 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {log.createdAt
                        ? format(new Date(log.createdAt), "dd MMM yyyy 'a las' HH:mm:ss", { locale: es })
                        : '—'
                      }
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
        {logs.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 bg-white/5 rounded-3xl border border-white/5">
            No hay eventos registrados aún.
          </div>
        ) : logs.map(log => {
          const cfg = actionConfig[log.action] || { icon: FileText, color: 'text-zinc-400', label: log.action };
          const Icon = cfg.icon;
          const details = log.details as Record<string, unknown> | null;
          return (
            <div key={log.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <span className={`inline-flex items-center gap-2 font-semibold text-sm ${cfg.color}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {cfg.label}
              </span>
              {details && (
                <p className="text-zinc-500 font-mono text-xs truncate">{JSON.stringify(details)}</p>
              )}
              <p className="text-zinc-600 text-xs">
                {log.createdAt
                  ? format(new Date(log.createdAt), "dd MMM yyyy 'a las' HH:mm:ss", { locale: es })
                  : '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
