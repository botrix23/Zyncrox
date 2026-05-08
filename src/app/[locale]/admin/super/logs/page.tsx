import { getAuditLogsAction } from '@/app/actions/superAdmin';
import { FileText, LogIn, LogOut, UserX, ShieldCheck, Settings, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { es as dateEs, enUS } from 'date-fns/locale';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const actionConfig: Record<string, { icon: typeof FileText; color: string }> = {
  LOGIN_SUCCESS:         { icon: LogIn,       color: 'text-emerald-600 dark:text-emerald-400' },
  LOGIN_FAILED:          { icon: LogIn,       color: 'text-rose-600 dark:text-rose-400' },
  LOGOUT:                { icon: LogOut,      color: 'text-zinc-500 dark:text-zinc-400' },
  TENANT_REGISTERED:     { icon: FileText,    color: 'text-blue-600 dark:text-blue-400' },
  TENANT_STATUS_CHANGED: { icon: Settings,    color: 'text-amber-600 dark:text-amber-400' },
  TENANT_DELETED:        { icon: UserX,       color: 'text-rose-600 dark:text-rose-500' },
  IMPERSONATION_STARTED: { icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400' },
  IMPERSONATION_ENDED:   { icon: ShieldCheck, color: 'text-zinc-500 dark:text-zinc-400' },
  SETTINGS_UPDATED:      { icon: Settings,    color: 'text-blue-500 dark:text-blue-300' },
  BOOKING_CREATED:       { icon: Bookmark,    color: 'text-teal-600 dark:text-teal-400' },
  SERVICE_CREATED:       { icon: FileText,    color: 'text-indigo-600 dark:text-indigo-400' },
  SERVICE_UPDATED:       { icon: FileText,    color: 'text-indigo-500 dark:text-indigo-300' },
  SERVICE_DELETED:       { icon: FileText,    color: 'text-rose-500 dark:text-rose-400' },
  STAFF_CREATED:         { icon: FileText,    color: 'text-cyan-600 dark:text-cyan-400' },
  STAFF_UPDATED:         { icon: FileText,    color: 'text-cyan-500 dark:text-cyan-300' },
  STAFF_DELETED:         { icon: FileText,    color: 'text-rose-400 dark:text-rose-300' },
};

export default async function AuditLogsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'es';
  const [logs, t, tActions] = await Promise.all([
    getAuditLogsAction({ limit: 100 }),
    getTranslations({ locale, namespace: 'SuperAdmin.logsPage' }),
    getTranslations({ locale, namespace: 'SuperAdmin.audit.actions' }),
  ]);
  const dateLocale = locale === 'en' ? enUS : dateEs;
  const dateFormatStr = t('dateFormat');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-zinc-900 dark:text-white">
          <FileText className="w-7 h-7 text-purple-500" />
          {t('title')}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t('subtitle', { count: logs.length })}</p>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black/20">
                <th className="text-left px-6 py-4 font-semibold">{t('colEvent')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('colDetails')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('colDate')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    {t('noEvents')}
                  </td>
                </tr>
              ) : logs.map(log => {
                const cfg = actionConfig[log.action] || { icon: FileText, color: 'text-zinc-500 dark:text-zinc-400' };
                const Icon = cfg.icon;
                const details = log.details as Record<string, unknown> | null;
                const actionLabel = actionConfig[log.action]
                  ? tActions(log.action as any)
                  : log.action;
                return (
                  <tr key={log.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors last:border-0">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-2 font-semibold ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                        {actionLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs max-w-xs truncate">
                      {details ? JSON.stringify(details) : '—'}
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                      {log.createdAt
                        ? format(new Date(log.createdAt), dateFormatStr, { locale: dateLocale })
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
          <div className="py-12 text-center text-zinc-500 bg-white dark:bg-white/5 rounded-3xl border border-zinc-200 dark:border-white/5">
            {t('noEvents')}
          </div>
        ) : logs.map(log => {
          const cfg = actionConfig[log.action] || { icon: FileText, color: 'text-zinc-500 dark:text-zinc-400' };
          const Icon = cfg.icon;
          const details = log.details as Record<string, unknown> | null;
          const actionLabel = actionConfig[log.action]
            ? tActions(log.action as any)
            : log.action;
          return (
            <div key={log.id} className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 space-y-2">
              <span className={`inline-flex items-center gap-2 font-semibold text-sm ${cfg.color}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {actionLabel}
              </span>
              {details && (
                <p className="text-zinc-500 dark:text-zinc-500 font-mono text-xs truncate">{JSON.stringify(details)}</p>
              )}
              <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                {log.createdAt
                  ? format(new Date(log.createdAt), dateFormatStr, { locale: dateLocale })
                  : '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
