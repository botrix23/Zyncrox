'use client';

import { useState } from 'react';
import { ShieldAlert, X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { endImpersonationAction } from '@/app/actions/superAdmin';
import { useTranslations } from 'next-intl';

interface ImpersonationBannerProps {
  tenantName: string;
  locale: string;
}

export default function ImpersonationBanner({ tenantName, locale }: ImpersonationBannerProps) {
  const t = useTranslations('ImpersonationBanner');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExit = async () => {
    setLoading(true);
    await endImpersonationAction();
    // Redirect back to the Super Admin panel
    router.push(`/${locale}/admin/super/tenants`);
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 shadow-md z-50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 flex items-center justify-center w-7 h-7 bg-white/20 rounded-full">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <p className="text-sm font-semibold truncate">
          <span className="opacity-80">{t('viewing')}</span>{' '}
          <span className="font-black">{tenantName}</span>
        </p>
      </div>

      <button
        onClick={handleExit}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-60 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        {t('exitButton')}
      </button>
    </div>
  );
}
