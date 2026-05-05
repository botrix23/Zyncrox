"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  User,
  ShieldCheck,
  UserCircle,
  Check,
  Ban,
  X,
  Menu,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LangToggle } from '@/components/LangToggle';
import { SessionUser } from '@/lib/auth-session';
import { useTranslations } from "next-intl";
import { getNotificationsAction, markNotificationsReadAction } from '@/app/actions/notifications';
import { approveAbsenceRequestAction, rejectAbsenceRequestAction } from '@/app/actions/absenceRequests';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export function AdminHeader({ user }: { user: SessionUser | null }) {
  const t = useTranslations('Dashboard.header');
  const router = useRouter();
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loadingBell, setLoadingBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const hasUnread = !dismissed && notifications.some(n => !n.read);

  const fetchNotifications = async () => {
    setLoadingBell(true);
    const result = await getNotificationsAction();
    setNotifications(result);
    setLoadingBell(false);
  };

  // Carga inicial + polling cada 30s + re-fetch al recuperar foco
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30_000);

    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleBellClick = async () => {
    if (!bellOpen) {
      setDismissed(false);
      await fetchNotifications();
    }
    setBellOpen(prev => !prev);
  };

  const handleClearNotifications = () => {
    setDismissed(true);
    setBellOpen(false);
  };

  const handleApprove = async (id: string) => {
    await approveAbsenceRequestAction(id);
    await fetchNotifications();
    router.refresh();
  };

  const handleReject = async (id: string) => {
    await rejectAbsenceRequestAction(id);
    await fetchNotifications();
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const isStaff = user?.role === 'STAFF';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="h-16 lg:h-20 border-b border-slate-200 dark:border-white/5 px-4 lg:px-8 flex items-center justify-between bg-white/50 dark:bg-black/50 backdrop-blur-xl shrink-0 z-10 sticky top-0">
      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-menu'))}
          className="p-2 text-slate-500 dark:text-zinc-400 hover:text-purple-500 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-lg font-bold tracking-tight">Zyncrox</span>
      </div>

      <div className="flex items-center gap-2 lg:gap-6">
        <div className="flex items-center gap-1 lg:gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <ThemeToggle />
          <LangToggle />
        </div>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 text-slate-500 dark:text-zinc-400 hover:text-purple-500 transition-colors"
          >
            <Bell className="w-6 h-6" />
            {hasUnread && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-black" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping opacity-75" />
              </>
            )}
          </button>

          {bellOpen && (
            <div className="fixed lg:absolute right-4 lg:right-0 top-20 lg:top-12 w-[calc(100vw-2rem)] max-w-sm lg:w-96 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[24px] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
                <p className="text-sm font-black text-slate-900 dark:text-white">Notificaciones</p>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                      Limpiar
                    </button>
                  )}
                  <button onClick={() => setBellOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {loadingBell ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-slate-200 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">Sin notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-4 space-y-2 ${!n.read ? 'bg-purple-50/50 dark:bg-purple-500/5' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">{n.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{n.body}</p>
                            {n.date && (
                              <p className="text-[10px] text-slate-400 mt-1">{format(new Date(n.date), "dd MMM, HH:mm")}</p>
                            )}
                          </div>
                          {n.status && (
                            <span className={`shrink-0 text-[9px] font-black px-2 py-1 rounded-full ${
                              n.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' :
                              n.status === 'REJECTED' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600' :
                              'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                            }`}>
                              {n.status === 'APPROVED' ? 'Aprobada' : n.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                            </span>
                          )}
                        </div>
                        {n.canAct && n.requestId && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleApprove(n.requestId)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[11px] font-bold transition-all"
                            >
                              <Check className="w-3 h-3" /> Aprobar
                            </button>
                            <button
                              onClick={() => handleReject(n.requestId)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-zinc-300 rounded-xl text-[11px] font-bold transition-all"
                            >
                              <Ban className="w-3 h-3" /> Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block h-8 w-[1px] bg-slate-200 dark:border-white/10" />

        <div className="flex items-center gap-2 lg:gap-3 group">
          {/* Name + role — hidden on mobile */}
          <div className="hidden lg:block text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              {displayName}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1">
              {isSuperAdmin ? (
                <span className="text-[11px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter shadow-lg shadow-purple-500/20 uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  {t('superAdmin')}
                </span>
              ) : isStaff ? (
                <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter uppercase">
                  <UserCircle className="w-3 h-3" />
                  {t('staff')}
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter uppercase">
                  <UserCircle className="w-3 h-3" />
                  {t('admin')}
                </span>
              )}
            </div>
          </div>
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/10 overflow-hidden">
            {isSuperAdmin ? (
              <ShieldCheck className="text-white w-6 h-6" />
            ) : (
              <User className="text-white w-6 h-6" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
