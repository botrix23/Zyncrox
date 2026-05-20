"use client";

import {
  LayoutDashboard,
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
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { getPlanDisplayName, canUseFeature } from '@/core/plans';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { endImpersonationAction } from '@/app/actions/superAdmin';
import { SessionUser } from '@/lib/auth-session';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const COLLAPSED_KEY = 'sidebar-collapsed';

export function AdminSidebar({ user, locale, tenantName, tenantPlan }: { user: SessionUser | null, locale: string, tenantName?: string, tenantPlan?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Dashboard.sidebar');
  const [endingImpersonation, setEndingImpersonation] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  // Listen for hamburger button in AdminHeader
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev);
    window.addEventListener('toggle-mobile-menu', handler);
    return () => window.removeEventListener('toggle-mobile-menu', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const isImpersonating = user?.role === 'SUPER_ADMIN' && !!user?.impersonatedTenantId;
  const isStaff = user?.role === 'STAFF';
  const hasAdvancedAnalytics = canUseFeature(tenantPlan, 'advancedAnalytics');

  const allItems = [
    { name: t('dashboard'), icon: LayoutDashboard, href: `/${locale}/admin`, active: pathname === `/${locale}/admin`, staffVisible: false },
    { name: t('bookings'), icon: Calendar, href: `/${locale}/admin/bookings`, active: pathname.includes('/bookings'), staffVisible: true },
    { name: t('branches'), icon: MapPin, href: `/${locale}/admin/branches`, active: pathname.includes('/branches'), staffVisible: false },
    { name: t('services'), icon: Sparkles, href: `/${locale}/admin/services`, active: pathname.includes('/services') || pathname.includes('/categories'), staffVisible: false },
    { name: t('staff'), icon: Users, href: `/${locale}/admin/staff`, active: pathname.includes('/staff'), staffVisible: false },
    { name: t('absences'), icon: CalendarOff, href: `/${locale}/admin/absences`, active: pathname.includes('/absences'), staffVisible: true },
    { name: t('clients'), icon: Contact, href: `/${locale}/admin/clients`, active: pathname.includes('/clients'), staffVisible: false },
    { name: t('appearance'), icon: Palette, href: `/${locale}/admin/appearance`, active: pathname.includes('/appearance'), staffVisible: false },
    { name: t('surveys'), icon: ClipboardList, href: `/${locale}/admin/surveys`, active: pathname.includes('/surveys'), staffVisible: false },
    // { name: t('products'), icon: Package, href: `/${locale}/admin/products`, active: pathname.includes('/products'), staffVisible: false },
    { name: t('analytics'), icon: TrendingUp, href: `/${locale}/admin/analytics`, active: pathname.includes('/analytics'), staffVisible: false, locked: !hasAdvancedAnalytics },
  ];

  const baseItems = isStaff ? allItems.filter(i => i.staffVisible) : allItems;

  const handleEndImpersonation = async () => {
    setEndingImpersonation(true);
    await endImpersonationAction();
    router.push(`/${locale}/admin/super`);
    router.refresh();
  };

  // Shared sidebar content (used in both desktop and mobile)
  const SidebarContent = ({ forMobile = false }: { forMobile?: boolean }) => (
    <>
      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          {collapsed && !forMobile ? (
            <div className="flex justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Logo row */}
      <div className={`flex items-center ${collapsed && !forMobile ? 'justify-center px-4 py-6' : 'justify-between px-6 py-6'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Calendar className="text-white w-6 h-6" />
          </div>
          {(!collapsed || forMobile) && <span className="text-xl font-bold tracking-tight">Zyncrox</span>}
        </div>
        {forMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        ) : !collapsed ? (
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            title="Colapsar menú"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Expand button when collapsed (desktop only) */}
      {collapsed && !forMobile && (
        <div className="flex justify-center px-4 pb-2">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            title="Expandir menú"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className={`flex-1 ${collapsed && !forMobile ? 'px-2' : 'px-4'} space-y-1 mt-2 overflow-y-auto custom-scrollbar`}>
        {baseItems.map((item) => {
          const isLocked = (item as any).locked === true;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed && !forMobile ? (isLocked ? `${item.name} (Business)` : item.name) : undefined}
              className={`flex items-center ${collapsed && !forMobile ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3.5'} rounded-2xl transition-all duration-200 group ${
                item.active
                  ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20'
                  : isLocked
                  ? 'text-slate-400 dark:text-zinc-600 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-zinc-400'
                  : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className={`flex items-center ${collapsed && !forMobile ? 'justify-center' : 'gap-3'}`}>
                <item.icon className={`w-5 h-5 shrink-0 ${item.active ? 'text-white' : isLocked ? 'text-slate-400 dark:text-zinc-600' : 'group-hover:text-purple-500 transition-colors'}`} />
                {(!collapsed || forMobile) && <span className="font-semibold text-sm whitespace-nowrap">{item.name}</span>}
              </div>
              {(!collapsed || forMobile) && isLocked && (
                <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" />
                  Business
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`${collapsed && !forMobile ? 'px-2' : 'px-6'} py-4 border-t border-slate-200 dark:border-white/5 space-y-3`}>
        {tenantName && (!collapsed || forMobile) && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
            <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 mb-1 uppercase tracking-wider">{t('business') || 'Empresa'}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tenantName}</p>
            {tenantPlan && (
              <span className={`inline-block mt-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                tenantPlan === 'ENTERPRISE'
                  ? 'bg-amber-500/15 text-amber-500'
                  : tenantPlan === 'PROFESSIONAL'
                  ? 'bg-purple-500/15 text-purple-500'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
              }`}>
                {getPlanDisplayName(tenantPlan)}
              </span>
            )}
          </div>
        )}
        {!isImpersonating && (
          <button
            onClick={() => logoutAction(locale)}
            title={collapsed && !forMobile ? t('logout') : undefined}
            className={`flex items-center ${collapsed && !forMobile ? 'justify-center w-full py-3 px-0' : 'gap-3 px-4 py-3 w-full'} text-rose-500 font-semibold hover:bg-rose-500/5 rounded-2xl transition-all group`}
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
            {(!collapsed || forMobile) && t('logout')}
          </button>
        )}
      </div>
    </>
  );

  if (!mounted) return (
    <aside className="w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/5 hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-20" />
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-zinc-900 flex flex-col z-40 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent forMobile />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-72'} bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/5 hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-20 transition-all duration-300 ease-in-out`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
