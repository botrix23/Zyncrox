"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Users, BarChart2, FileText, LogOut, CreditCard, Menu, Mail } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LangToggle } from '@/components/LangToggle';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { useTranslations } from 'next-intl';

type Notification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  tenantName: string | null;
  urgency: string;
  isRead: boolean;
  createdAt: Date;
};

export function SuperAdminLayoutClient({
  children,
  email,
  locale,
  initialNotifications,
  initialUnreadCount,
}: {
  children: React.ReactNode;
  email: string;
  locale: string;
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('SuperAdmin.nav');

  const navItems = [
    { href: `/${locale}/admin/super`,          label: t('dashboard'),  icon: BarChart2 },
    { href: `/${locale}/admin/super/tenants`,  label: t('companies'),  icon: Users },
    { href: `/${locale}/admin/super/emails`,   label: 'Emails',        icon: Mail },
    { href: `/${locale}/admin/super/payments`, label: t('payments'),   icon: CreditCard },
    { href: `/${locale}/admin/super/logs`,     label: t('logs'),       icon: FileText },
  ];

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const SidebarContent = () => (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-6 h-6 text-purple-400 shrink-0" />
            <span className="font-black text-lg tracking-tight truncate">Zyncrox</span>
          </div>
          {/* Notifications bell only — toggles are in the footer */}
          <NotificationsDropdown
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-500 font-semibold uppercase tracking-widest">{t('superAdmin')}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== `/${locale}/admin/super` && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 dark:border-white/5 pt-4 mt-4">
        {/* Theme + lang toggles — comfortably spaced in the footer */}
        <div className="flex items-center gap-2 mb-3">
          <ThemeToggle />
          <LangToggle />
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-500 mb-1">{t('activeSession')}</p>
        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-white">{email}</p>
        <form action={logoutAction.bind(null, locale)}>
          <button type="submit" className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
            <LogOut className="w-3 h-3" />
            {t('logout')}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 text-zinc-900 dark:text-white flex transition-colors duration-200">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-white/5 flex flex-col p-6 z-40 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="w-64 bg-white dark:bg-black/40 border-r border-zinc-200 dark:border-white/5 hidden lg:flex flex-col p-6 sticky top-0 h-screen z-10">
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            aria-label={t('openMenu')}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-sm">Super Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LangToggle />
            <NotificationsDropdown
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
              align="right"
            />
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
