import { getAllTenantsAction } from '@/app/actions/superAdmin';
import { Users } from 'lucide-react';
import TenantsTable from './TenantsTable';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'es';
  const [tenants, t] = await Promise.all([
    getAllTenantsAction(),
    getTranslations({ locale, namespace: 'SuperAdmin.tenantsPage' }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-zinc-900 dark:text-white">
            <Users className="w-7 h-7 text-purple-400" />
            {t('title')}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t('subtitle', { count: tenants.length })}</p>
        </div>
      </div>

      <TenantsTable tenants={tenants} locale={locale} />
    </div>
  );
}
