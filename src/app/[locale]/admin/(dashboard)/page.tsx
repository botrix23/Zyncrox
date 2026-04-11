import React from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Settings, 
  ChevronRight,
  Plus,
  MoreVertical,
  Activity,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { db } from '@/db';
import { bookings, services, tenants } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { startOfDay, endOfDay, format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function AdminDashboard({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('Dashboard.home');
  const session = await getSession();
  
  // Determinar el tenantId activo:
  // - Para ADMIN: su propio tenantId
  // - Para SUPER_ADMIN: el tenant impersonado (si está en modo soporte)
  let tenantId: string | null = null;

  if (session?.role === 'SUPER_ADMIN') {
    if (session.impersonatedTenantId) {
      tenantId = session.impersonatedTenantId;
    } else {
      // Super Admin sin tenant impersonado — redirigir a su panel
      redirect('/admin/super');
    }
  } else if (session?.tenantId) {
    tenantId = session.tenantId;
  } else {
    redirect('/admin/login');
  }

  const todayStart = startOfDay(new Date());
  const todayEnd   = endOfDay(new Date());

  // 1. Obtener reservas de hoy
  const bookingsToday = await db.select().from(bookings).where(
    and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.startTime, todayStart),
      lte(bookings.startTime, todayEnd)
    )
  );

  // 2. Obtener todas las reservas para calcular ingresos (Mock simplificado)
  const allBookings = await db.query.bookings.findMany({
    where: eq(bookings.tenantId, tenantId),
    with: {
      service: true
    },
    limit: 50,
    orderBy: [desc(bookings.createdAt)]
  });

  // 3. Obtener datos del tenant para el slug
  const tenantData = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });

  const totalRevenue = allBookings.reduce((acc, curr) => acc + parseFloat(curr.service?.price || '0'), 0);


  const stats = [
    { label: t('stats.todayBookings'), value: bookingsToday.length.toString(), icon: Calendar, trend: '+20%', color: 'from-purple-600 to-indigo-600' },
    { label: t('stats.totalClients'), value: allBookings.length.toString(), icon: Users, trend: '+12%', color: 'from-blue-600 to-cyan-600' },
    { label: t('stats.estimatedRevenue'), value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp, trend: '+8.5%', color: 'from-emerald-600 to-teal-600' },
    { label: t('stats.occupancy'), value: '85%', icon: Clock, trend: '+5%', color: 'from-orange-600 to-amber-600' },
  ];

  const recentBookingsDisplay = allBookings.slice(0, 5).map(b => ({
    id: b.id,
    customer: b.customerName,
    service: b.service?.name || t('recentBookings.unknownService'),
    time: format(b.startTime, "hh:mm a"),
    status: b.status === 'CONFIRMED' ? t('recentBookings.statusConfirmed') : 
            b.status === 'PENDING' ? t('recentBookings.statusPending') :
            b.status === 'IN_PROGRESS' || b.status === 'En Proceso' ? t('recentBookings.statusInProcess') : b.status,
    avatar: b.customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('welcome')}</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
            <Activity className="w-4 h-4" />
            {t('reports')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/25 transition-all">
            <Plus className="w-4 h-4" />
            {t('newBooking')}
          </button>
        </div>
      </div>
      
      {/* Portal Share Link Quick Access */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
          <Share2 className="w-32 h-32" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t('portalLink.title')}</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">{t('portalLink.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 group-hover:border-purple-500/30 transition-colors">
            <Link 
              href={`/${locale}/${tenantData?.slug}`}
              target="_blank"
              className="px-3 py-2 text-sm font-mono text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all truncate max-w-[250px]"
            >
              {`/${locale}/${tenantData?.slug || 'portal'}`}
            </Link>
            <a 
              href={`/${locale}/${tenantData?.slug}`} 
              target="_blank"
              className="p-2.5 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl hover:text-purple-600 transition-all border border-slate-200 dark:border-white/10"
              title={t('portalLink.open')}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="group relative bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/5">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                {stat.trend}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 dark:text-zinc-400 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('recentBookings.title')}</h2>
            <button className="text-purple-500 hover:text-purple-400 text-sm font-semibold flex items-center gap-1">
              {t('recentBookings.viewAll')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentBookingsDisplay.length > 0 ? recentBookingsDisplay.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-bold">
                    {booking.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{booking.customer}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{booking.service}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.time}</p>
                    <p className={`text-[11px] font-bold uppercase mt-1 ${
                      booking.status === t('recentBookings.statusConfirmed') ? 'text-emerald-500' : 
                      booking.status === t('recentBookings.statusInProcess') ? 'text-blue-500' : 'text-orange-500'
                    }`}>
                      {booking.status}
                    </p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-8">{t('recentBookings.noBookings')}</p>
            )}
          </div>
        </div>

        {/* Quick Settings Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-purple-500/20">
          <Settings className="absolute -right-8 -top-8 w-48 h-48 opacity-10 rotate-12" />
          <h2 className="text-xl font-bold relative z-10">{t('quickSettings.title')}</h2>
          <p className="text-purple-200 text-sm mt-2 relative z-10 mb-8">{t('quickSettings.subtitle')}</p>
          
          <div className="space-y-4 relative z-10">
            <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between transition-all group backdrop-blur-md border border-white/10">
              <span className="font-semibold">{t('quickSettings.editServices')}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between transition-all group backdrop-blur-md border border-white/10">
              <span className="font-semibold">{t('quickSettings.branchHours')}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href={`/${locale}/admin/appearance`} className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between transition-all group backdrop-blur-md border border-white/10 text-white no-underline">
              <span className="font-semibold">{t('quickSettings.customizeBrand')}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>


          <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-purple-300">{t('quickSettings.premiumExpire', { days: 24 })}</p>
            <button className="mt-2 text-sm font-bold text-white underline">{t('quickSettings.renewNow')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
