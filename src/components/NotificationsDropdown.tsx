'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import {
  Bell, X, CheckCheck, ExternalLink,
  UserPlus, Clock, AlertCircle, CreditCard,
  CheckCircle, Moon, TrendingUp, ShieldOff,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  getSuperAdminNotificationsAction,
  markAllNotificationsReadAction,
} from '@/app/actions/superAdmin';

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

const typeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TENANT_REGISTERED:   UserPlus,
  TRIAL_EXPIRING_SOON: Clock,
  TRIAL_EXPIRED:       AlertCircle,
  PAYMENT_FAILED:      CreditCard,
  PAYMENT_RECEIVED:    CheckCircle,
  TENANT_INACTIVE:     Moon,
  PLAN_LIMIT_REACHED:  TrendingUp,
  TENANT_SUSPENDED:    ShieldOff,
};

const urgencyColor: Record<string, string> = {
  HIGH:   'text-rose-500 bg-rose-500/10',
  MEDIUM: 'text-amber-500 bg-amber-500/10',
  LOW:    'text-sky-500 bg-sky-500/10',
};

function formatRelativeTime(date: Date | string, t: (key: string, values?: Record<string, number>) => string): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)  return t('justNow');
  if (diff < 3600)  return t('minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('hoursAgo',   { n: Math.floor(diff / 3600) });
  if (diff < 604800) return t('daysAgo',   { n: Math.floor(diff / 86400) });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

export default function NotificationsDropdown({ initialNotifications, initialUnreadCount }: Props) {
  const t = useTranslations('SuperAdmin.notifications');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh data when dropdown opens
  const refreshNotifications = () => {
    startTransition(async () => {
      const data = await getSuperAdminNotificationsAction();
      setNotifications(data.notifications as Notification[]);
      setUnreadCount(data.unreadCount);
    });
  };

  const handleToggle = () => {
    if (!open) refreshNotifications();
    setOpen(v => !v);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Refresh every 60 seconds in background
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(async () => {
        const data = await getSuperAdminNotificationsAction();
        setNotifications(data.notifications as Notification[]);
        setUnreadCount(data.unreadCount);
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-xl transition-all ${
          open
            ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
        }`}
        aria-label={t('bellLabel')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-xs font-black rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-500" />
              <span className="font-black text-sm text-zinc-900 dark:text-white">{t('title')}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-xs font-black rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  title={t('markAllRead')}
                  className="p-1.5 text-zinc-400 hover:text-purple-500 transition-colors rounded-lg hover:bg-purple-500/10 disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-semibold text-zinc-400">{t('empty')}</p>
                <p className="text-xs text-zinc-400 mt-1">{t('emptyHint')}</p>
              </div>
            ) : (
              notifications.map(notif => {
                const IconComponent = typeIconMap[notif.type] ?? Bell;
                const uc = urgencyColor[notif.urgency] ?? urgencyColor.MEDIUM;
                const content = (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 border-b border-zinc-100 dark:border-white/5 last:border-0 transition-colors ${
                      notif.isRead
                        ? 'hover:bg-zinc-50 dark:hover:bg-white/5'
                        : 'bg-purple-50 dark:bg-purple-500/5 hover:bg-purple-100/50 dark:hover:bg-purple-500/10'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl ${uc}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-white font-medium'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-400">
                          {formatRelativeTime(notif.createdAt, t as any)}
                        </span>
                        {notif.link && (
                          <span className="flex items-center gap-0.5 text-xs text-purple-500">
                            <ExternalLink className="w-2.5 h-2.5" />
                            {t('viewDetail')}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                    )}
                  </div>
                );

                return notif.link ? (
                  <Link key={notif.id} href={notif.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id}>{content}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
              <button
                onClick={handleMarkAllRead}
                disabled={isPending || unreadCount === 0}
                className="w-full text-center text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? t('markingAllRead') : t('markAllRead')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
