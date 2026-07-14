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
  CalendarPlus,
  CreditCard,
  Settings,
  KeyRound,
  LogOut,
  ChevronDown,
  Calendar,
  Users2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LangToggle } from '@/components/LangToggle';
import { SessionUser } from '@/lib/auth-session';
import { useTranslations } from "next-intl";
import { getNotificationsAction } from '@/app/actions/notifications';
import { approveAbsenceRequestAction, rejectAbsenceRequestAction } from '@/app/actions/absenceRequests';
import { logoutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

const BELL_LAST_SEEN_KEY = 'bell-last-seen';
const BELL_DISMISSED_KEY = 'bell-dismissed-ids';

interface AdminHeaderProps {
  user: SessionUser | null;
  locale: string;
  userEmail?: string | null;
  nextBillingDate?: Date | null;
  tenantStatus?: string;
  trialEndsAt?: Date | null;
}

export function AdminHeader({ user, locale, userEmail, nextBillingDate, tenantStatus, trialEndsAt }: AdminHeaderProps) {
  const t = useTranslations('Dashboard.header');
  const router = useRouter();

  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingBell, setLoadingBell] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const isUnread = (n: any) =>
    !dismissedIds.has(n.id) && new Date(n.date).getTime() > lastSeen;
  const hasUnread = notifications.some(isUnread);

  useEffect(() => {
    const stored = localStorage.getItem(BELL_LAST_SEEN_KEY);
    if (stored) setLastSeen(Number(stored));
    const ids = localStorage.getItem(BELL_DISMISSED_KEY);
    if (ids) setDismissedIds(new Set(JSON.parse(ids)));
  }, []);

  const fetchNotifications = async () => {
    setLoadingBell(true);
    const result = await getNotificationsAction();
    setNotifications(result);
    setLoadingBell(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => {
    if (bellOpen) {
      markReadTimer.current = setTimeout(() => {
        const now = Date.now();
        setLastSeen(now);
        localStorage.setItem(BELL_LAST_SEEN_KEY, String(now));
      }, 2000);
    } else {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    }
    return () => { if (markReadTimer.current) clearTimeout(markReadTimer.current); };
  }, [bellOpen]);

  const handleBellClick = async () => {
    if (avatarOpen) setAvatarOpen(false);
    if (!bellOpen) await fetchNotifications();
    setBellOpen(prev => !prev);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(BELL_DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const handleClearAll = () => {
    const now = Date.now();
    setLastSeen(now);
    localStorage.setItem(BELL_LAST_SEEN_KEY, String(now));
    const ids = new Set(notifications.map(n => n.id));
    setDismissedIds(ids);
    localStorage.setItem(BELL_DISMISSED_KEY, JSON.stringify([...ids]));
    setBellOpen(false);
  };

  const handleApprove = async (id: string) => {
    await approveAbsenceRequestAction(id);
    handleDismiss(id);
    await fetchNotifications();
    router.refresh();
  };

  const handleReject = async (id: string) => {
    await rejectAbsenceRequestAction(id);
    handleDismiss(id);
    await fetchNotifications();
    router.refresh();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    if (bellOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    if (avatarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarOpen]);

  const displayName = user?.name || userEmail?.split('@')[0] || 'Usuario';
  const effectiveRole = user?.impersonatedRole ?? user?.role;
  const isStaff = effectiveRole === 'STAFF';
  const isReceptionist = effectiveRole === 'RECEPTIONIST';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Format in UTC so the calendar date matches what N1CO sends and what the
  // billing page shows (local tz would shift e.g. Jul 15 04:23Z back to Jul 14).
  const billingDateStr = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-SV', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
      })
    : null;

  const isTrial = tenantStatus === 'TRIAL';
  const trialDaysLeft = (isTrial && trialEndsAt)
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <header className="h-16 lg:h-20 border-b border-slate-200 dark:border-white/5 px-4 lg:px-8 flex items-center justify-between bg-white/50 dark:bg-black/50 backdrop-blur-xl shrink-0 z-50 sticky top-0">
      {/* Mobile hamburger */}
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

      <div className="flex items-center gap-2 lg:gap-6 lg:ml-auto">
        {/* Theme + Lang */}
        <div className="flex items-center gap-1 lg:gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <ThemeToggle />
          <LangToggle />
        </div>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button onClick={handleBellClick} className="relative p-2 text-slate-500 dark:text-zinc-400 hover:text-purple-500 transition-colors">
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
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Notificaciones</p>
                  {hasUnread && <p className="text-xs text-slate-400 mt-0.5">Se marcarán como leídas en 2s</p>}
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                      Limpiar todo
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
                    {notifications.filter(n => !dismissedIds.has(n.id)).map((n) => (
                      <div key={n.id} className={`p-4 space-y-2 transition-colors ${isUnread(n) ? (n.type === 'booking' ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : 'bg-purple-50/50 dark:bg-purple-500/5') : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {n.type === 'booking' ? (
                              <span className="shrink-0 mt-0.5 p-1 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                                <CalendarPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            ) : (
                              <span className="shrink-0 mt-0.5 p-1 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                                <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-white">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{n.body}</p>
                              {n.date && <p className="text-xs text-slate-400 mt-1">{format(new Date(n.date), "dd MMM, HH:mm")}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {n.status && (
                              <span className={`text-xs font-black px-2 py-1 rounded-full ${n.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : n.status === 'REJECTED' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'}`}>
                                {n.status === 'APPROVED' ? 'Aprobada' : n.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                              </span>
                            )}
                            {!n.canAct && (
                              <button onClick={() => handleDismiss(n.id)} className="p-1 text-slate-300 hover:text-slate-500 dark:text-zinc-600 dark:hover:text-zinc-400 rounded-lg transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {n.canAct && n.requestId && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleApprove(n.requestId)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all">
                              <Check className="w-3 h-3" /> Aprobar
                            </button>
                            <button onClick={() => handleReject(n.requestId)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all">
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

        {/* Avatar + Dropdown */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => { setBellOpen(false); setAvatarOpen(prev => !prev); }}
            className="flex items-center gap-2 lg:gap-3 group focus:outline-none"
            aria-label="Menú de cuenta"
          >
            <div className="hidden lg:block text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{displayName}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                {isSuperAdmin ? (
                  <span className="text-xs font-bold bg-purple-600 text-white px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter shadow-lg shadow-purple-500/20 uppercase">
                    <ShieldCheck className="w-3 h-3" />{t('superAdmin')}
                  </span>
                ) : isStaff ? (
                  <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter uppercase">
                    <UserCircle className="w-3 h-3" />{t('staff')}
                  </span>
                ) : isReceptionist ? (
                  <span className="text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter uppercase">
                    <UserCircle className="w-3 h-3" />{t('receptionist')}
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1 tracking-tighter uppercase">
                    <UserCircle className="w-3 h-3" />{t('admin')}
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/10">
              {isSuperAdmin ? <ShieldCheck className="text-white w-6 h-6" /> : <User className="text-white w-6 h-6" />}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 hidden lg:block ${avatarOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown panel */}
          {avatarOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] w-72 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">

              {/* User info header */}
              <div className="px-4 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md border border-white/10 shrink-0">
                    {isSuperAdmin ? <ShieldCheck className="text-white w-5 h-5" /> : <User className="text-white w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                    {userEmail && <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{userEmail}</p>}
                  </div>
                </div>

                {/* Trial or billing info (not shown to super admin, staff, or receptionist) */}
                {!isSuperAdmin && !isStaff && !isReceptionist && (
                  isTrial ? (
                    <div className={`mt-3 flex items-center gap-2 px-3 py-2 border rounded-xl ${
                      trialDaysLeft !== null && trialDaysLeft <= 3
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : trialDaysLeft !== null && trialDaysLeft <= 7
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                    }`}>
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${
                        trialDaysLeft !== null && trialDaysLeft <= 3 ? 'text-red-500' :
                        trialDaysLeft !== null && trialDaysLeft <= 7 ? 'text-amber-500' : 'text-purple-500'
                      }`} />
                      <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">{t('trialPlan')}</p>
                        <p className={`text-xs font-bold ${
                          trialDaysLeft !== null && trialDaysLeft <= 3 ? 'text-red-600 dark:text-red-400' :
                          trialDaysLeft !== null && trialDaysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' :
                          'text-purple-700 dark:text-purple-300'
                        }`}>
                          {trialDaysLeft !== null
                            ? trialDaysLeft === 0
                              ? t('trialExpiresToday')
                              : t('trialDaysLeft', { days: trialDaysLeft })
                            : t('trialActive')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                      <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">{t('nextBilling')}</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                          {billingDateStr ?? t('noBillingDate')}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Links */}
              <div className="py-1.5">
                {!isStaff && !isReceptionist && (
                  <Link
                    href={`/${locale}/admin/billing`}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-purple-500/10 flex items-center justify-center transition-colors shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 group-hover:text-purple-500 transition-colors" />
                    </span>
                    {t('billing')}
                  </Link>
                )}

                {user?.isOwner && !isSuperAdmin && (
                  <Link
                    href={`/${locale}/admin/team`}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-purple-500/10 flex items-center justify-center transition-colors shrink-0">
                      <Users2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 group-hover:text-purple-500 transition-colors" />
                    </span>
                    {t('manageAdmins')}
                  </Link>
                )}

                <Link
                  href={`/${locale}/admin/change-password`}
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                >
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-purple-500/10 flex items-center justify-center transition-colors shrink-0">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 group-hover:text-purple-500 transition-colors" />
                  </span>
                  {t('changePassword')}
                </Link>
              </div>

              {/* Sign out */}
              <div className="border-t border-slate-100 dark:border-white/5 py-1.5">
                <button
                  onClick={() => { setAvatarOpen(false); logoutAction(locale); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-colors group"
                >
                  <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0">
                    <LogOut className="w-3.5 h-3.5" />
                  </span>
                  {t('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
