"use client";

import { 
  LayoutDashboard,
  Settings,
  Calendar,
  Users,
  Sparkles,
  Package,
  LogOut,
  ShieldAlert,
  ArrowLeft,
  MapPin,
  CalendarOff,
  Contact,
  Palette,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { endImpersonationAction } from '@/app/actions/superAdmin';
import { SessionUser } from '@/lib/auth-session';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function AdminSidebar({ user, locale, tenantName }: { user: SessionUser | null, locale: string, tenantName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Dashboard.sidebar');
  const [endingImpersonation, setEndingImpersonation] = useState(false);

  const isImpersonating = user?.role === 'SUPER_ADMIN' && !!user?.impersonatedTenantId;
  
  const baseItems = [
    { name: t('dashboard'), icon: LayoutDashboard, href: `/${locale}/admin`, active: pathname === `/${locale}/admin` },
    { name: t('bookings'), icon: Calendar, href: `/${locale}/admin/bookings`, active: pathname.includes('/bookings') },
    { name: t('branches'), icon: MapPin, href: `/${locale}/admin/branches`, active: pathname.includes('/branches') },
    { name: t('services'), icon: Sparkles, href: `/${locale}/admin/services`, active: pathname.includes('/services') },
    { name: t('staff'), icon: Users, href: `/${locale}/admin/staff`, active: pathname.includes('/staff') },
    { name: t('absences'), icon: CalendarOff, href: `/${locale}/admin/absences`, active: pathname.includes('/absences') },
    { name: t('clients'), icon: Contact, href: `/${locale}/admin/clients`, active: pathname.includes('/clients') },
    { name: t('appearance'), icon: Palette, href: `/${locale}/admin/appearance`, active: pathname.includes('/appearance') },
    { name: t('surveys'), icon: ClipboardList, href: `/${locale}/admin/surveys`, active: pathname.includes('/surveys') },
    { name: t('products'), icon: Package, href: `/${locale}/admin/products`, active: pathname.includes('/products') },
  ];

  const handleEndImpersonation = async () => {
    setEndingImpersonation(true);
    await endImpersonationAction();
    router.push(`/${locale}/admin/super`);
    router.refresh();
  };

  return (
    <aside className="w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/5 hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-20">
      
      {/* Banner de impersonación — visible cuando el Super Admin está dentro de una empresa */}
      {isImpersonating && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          <div className="flex items-start gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] font-black text-amber-500 uppercase tracking-wide">{t('supportMode')}</p>
              <p className="text-xs text-amber-400/90 truncate font-medium mt-0.5">
                {t('viewing')}: <strong className="text-amber-300 font-bold">{user.impersonatedTenantName}</strong>
              </p>
              <p className="text-xs text-amber-400/70 truncate mt-0.5">{t('as')}: {user.email}</p>
            </div>
          </div>
          <button
            onClick={handleEndImpersonation}
            disabled={endingImpersonation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {endingImpersonation ? t('exiting') : t('exitSupport')}
          </button>
        </div>
      )}

      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ZyncSlot</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {baseItems.map((item) => (
          <Link 
            key={item.name} 
            href={item.href} 
            className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              item.active 
                ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20' 
                : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'group-hover:text-purple-500 transition-colors'}`} />
              <span className="font-semibold text-sm">{item.name}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-200 dark:border-white/5 space-y-4">
        {/* Company Name Badge */}
        {tenantName && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">{t('business') || 'Empresa'}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tenantName}</p>
          </div>
        )}

        {!isImpersonating && (
          <button 
            onClick={() => logoutAction(locale)}
            className="flex items-center gap-3 px-4 py-3 w-full text-rose-500 font-semibold hover:bg-rose-500/5 rounded-2xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {t('logout')}
          </button>
        )}
      </div>
    </aside>
  );
}
