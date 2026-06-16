import { getAuditLogsAction } from '@/app/actions/superAdmin';
import { FileText } from 'lucide-react';
import LogsClient from './LogsClient';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'es';
  const logs = await getAuditLogsAction({ limit: 300 });
  const isEn = locale === 'en';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-zinc-900 dark:text-white">
          <FileText className="w-7 h-7 text-purple-500" />
          {isEn ? 'Audit Logs' : 'Logs de Auditoría'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          {isEn
            ? `Full event log for all companies on the platform. Last ${logs.length} events.`
            : `Registro completo de eventos de todas las empresas en la plataforma. Últimos ${logs.length} eventos.`}
        </p>
      </div>
      <LogsClient logs={logs as any} locale={locale} />
    </div>
  );
}
