"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Contact, DollarSign, Clock, Calendar, User,
  MapPin, Star, TrendingUp, History, X, Phone, Mail,
  ChevronRight, Award, Scissors, ShoppingBag, Settings2, StickyNote,
  Gift, Loader2, Check, AlertCircle, MonitorCheck, Lock, Pencil, Trash2,
  Save, CheckCircle2, ClipboardList
} from 'lucide-react';
import { getClientPointsAction, redeemRewardAction, getRewardsAction, createRewardAction, updateRewardAction, deleteRewardAction } from "@/app/actions/loyalty";
import { updateLoyaltySettingsAction, updatePointsSettingsAction } from "@/app/actions/tenant";
import { updateClientContactAction } from "@/app/actions/clientNotes";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ClientNotes = dynamic(() => import('./ClientNotes'), { ssr: false });
const SurveyClient = dynamic(() => import('../surveys/SurveyClient'), { ssr: false });

interface BookingDetail {
  id: string;
  startTime: Date;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  service: { name: string; price: string };
  staff: { name: string } | null;
  branch: { name: string };
}

type LoyaltyTier = 'NORMAL' | 'FREQUENT' | 'VIP';
interface LoyaltyRow { clientEmail: string; loyaltyTier: string; citasPeriodo: number; montoPeriodo: string; }
interface LoyaltyConfig {
  enabled: boolean;
  windowMonths: number;
  frequentThreshold: number;
  vipCitasThreshold: number | null;
  vipAmountThreshold: number | null;
  plan: string;
  pointsEnabled?: boolean;
  pointsPerDollar?: number;
  pointsExpireEnabled?: boolean;
  pointsExpireMonths?: number;
}

interface PointsTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  createdAt: Date;
}

interface RewardItem {
  id: string;
  name: string;
  description: string | null | undefined;
  pointsCost: number;
  isActive: boolean;
}

export default function ClientsClient({
  bookings,
  vipThreshold,
  notesCounts = {},
  currentUserId = '',
  currentUserRole = 'ADMIN',
  loyaltyRows = [],
  loyaltyConfig,
  tenantId = '',
  initialRewards = [],
  surveyProps,
}: {
  bookings: BookingDetail[];
  vipThreshold: number;
  notesCounts?: Record<string, number>;
  currentUserId?: string;
  currentUserRole?: string;
  loyaltyRows?: LoyaltyRow[];
  loyaltyConfig?: LoyaltyConfig;
  tenantId?: string;
  initialRewards?: any[];
  surveyProps?: {
    tenantId: string;
    initialEnabled: boolean;
    initialQuestions: any[];
    initialReviews: any[];
    canUseAdvanced: boolean;
    locale: string;
    slug: string;
    totalSurveySent: number;
    canUseSurveys: boolean;
  };
}) {
  const t = useTranslations('Dashboard.clients');
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [tierFilter, setTierFilter] = useState<'ALL' | LoyaltyTier>('ALL');

  // Points panel state
  const [clientPointsData, setClientPointsData] = useState<{
    balance: number;
    transactions: PointsTransaction[];
    rewards: RewardItem[];
  } | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const plan = loyaltyConfig?.plan ?? 'BASIC';
  const pointsEnabled = loyaltyConfig?.pointsEnabled ?? false;
  const loyaltyEnabled = loyaltyConfig?.enabled ?? false;
  const isAdminRole = currentUserRole !== 'STAFF';

  // Contact edit state (admin only)
  const [editingContact, setEditingContact] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactMsg, setContactMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'directory' | 'loyalty' | 'points' | 'surveys'>('directory');

  // Loyalty edit state
  const [loyaltyEditEnabled, setLoyaltyEditEnabled] = useState(loyaltyConfig?.enabled ?? false);
  const [loyaltyWindowMonths, setLoyaltyWindowMonths] = useState(loyaltyConfig?.windowMonths ?? 6);
  const [loyaltyFreqThreshold, setLoyaltyFreqThreshold] = useState(loyaltyConfig?.frequentThreshold ?? 5);
  const [loyaltyVipCitas, setLoyaltyVipCitas] = useState<number | ''>(loyaltyConfig?.vipCitasThreshold ?? '');
  const [loyaltyVipAmount, setLoyaltyVipAmount] = useState<number | ''>(loyaltyConfig?.vipAmountThreshold ?? '');
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltyMessage, setLoyaltyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Points edit state
  const [pointsEditEnabled, setPointsEditEnabled] = useState(loyaltyConfig?.pointsEnabled ?? false);
  const [pointsPerDollar, setPointsPerDollar] = useState(loyaltyConfig?.pointsPerDollar ?? 10);
  const [pointsExpireEnabled, setPointsExpireEnabled] = useState(loyaltyConfig?.pointsExpireEnabled ?? false);
  const [pointsExpireMonths, setPointsExpireMonths] = useState(loyaltyConfig?.pointsExpireMonths ?? 6);
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsMessage, setPointsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Rewards state
  const [rewards, setRewards] = useState<any[]>(initialRewards);
  const [rewardsLoaded, setRewardsLoaded] = useState(initialRewards.length > 0);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(500);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  const handleSaveLoyalty = async () => {
    setLoyaltySaving(true);
    setLoyaltyMessage(null);
    const result = await updateLoyaltySettingsAction({
      tenantId,
      loyaltyEnabled: loyaltyEditEnabled,
      loyaltyWindowMonths,
      loyaltyFrequentThreshold: loyaltyFreqThreshold,
      loyaltyVipCitasThreshold: loyaltyVipCitas === '' ? null : loyaltyVipCitas,
      loyaltyVipAmountThreshold: loyaltyVipAmount === '' ? null : loyaltyVipAmount,
    });
    if (result.success) {
      setLoyaltyMessage({ type: 'success', text: locale === 'es' ? 'Configuración guardada' : 'Settings saved' });
      router.refresh();
    } else {
      setLoyaltyMessage({ type: 'error', text: locale === 'es' ? 'Error al guardar' : 'Error saving' });
    }
    setLoyaltySaving(false);
  };

  const handleSavePoints = async () => {
    setPointsSaving(true);
    setPointsMessage(null);
    const result = await updatePointsSettingsAction({
      tenantId,
      pointsEnabled: pointsEditEnabled,
      pointsPerDollar,
      pointsExpireEnabled,
      pointsExpireMonths,
    });
    if (result.success) {
      setPointsMessage({ type: 'success', text: locale === 'es' ? 'Configuración guardada' : 'Settings saved' });
      router.refresh();
    } else {
      setPointsMessage({ type: 'error', text: locale === 'es' ? 'Error al guardar' : 'Error saving' });
    }
    setPointsSaving(false);
  };

  // Load rewards when points tab opens
  useEffect(() => {
    if (activeTab === 'points' && plan === 'ENTERPRISE' && !rewardsLoaded) {
      getRewardsAction().then(r => {
        if (r.success) setRewards((r as any).rewards);
        setRewardsLoaded(true);
      });
    }
  }, [activeTab, plan, rewardsLoaded]);

  // Build lookup map email → tier
  const loyaltyMap = useMemo(() => {
    const m: Record<string, LoyaltyTier> = {};
    for (const row of loyaltyRows) {
      m[row.clientEmail.toLowerCase()] = row.loyaltyTier as LoyaltyTier;
    }
    return m;
  }, [loyaltyRows]);

  // Returns the display tier for a client, gated by plan
  const getClientTier = (client: any): LoyaltyTier => {
    if (!loyaltyEnabled) return 'NORMAL';
    const email = client.email?.toLowerCase();
    if (email && loyaltyMap[email]) return loyaltyMap[email];
    // Legacy fallback while engine hasn't run yet
    if (client.totalAppointments >= (loyaltyConfig?.vipCitasThreshold ?? 999) && plan !== 'BASIC') return 'VIP';
    if (client.totalAppointments >= (loyaltyConfig?.frequentThreshold ?? vipThreshold)) return 'FREQUENT';
    return 'NORMAL';
  };

  // "Near upgrade" text for Business plan
  const getNearUpgrade = (client: any, tier: LoyaltyTier): string | null => {
    if (plan !== 'ENTERPRISE' && plan !== 'BUSINESS') return null;
    if (!loyaltyEnabled) return null;
    if (tier === 'VIP') return null;

    const freqThreshold = loyaltyConfig?.frequentThreshold ?? vipThreshold;
    const vipThresholdCitas = loyaltyConfig?.vipCitasThreshold;
    const vipAmountThreshold = loyaltyConfig?.vipAmountThreshold;
    const citas = client.totalAppointments;
    const monto = client.totalSpent;

    if (tier === 'NORMAL' && citas >= freqThreshold * 0.8) {
      const missing = freqThreshold - citas;
      if (missing <= 0) return null;
      return locale === 'es'
        ? `${missing} cita${missing !== 1 ? 's' : ''} más para ser Frecuente`
        : `${missing} more appt${missing !== 1 ? 's' : ''} to reach Frequent`;
    }
    if (tier === 'FREQUENT' && vipThresholdCitas) {
      const missingCitas = vipThresholdCitas - citas;
      if (missingCitas > 0 && citas >= vipThresholdCitas * 0.8) {
        const missingAmount = vipAmountThreshold ? Math.max(0, vipAmountThreshold - monto) : 0;
        if (missingAmount > 0) {
          return locale === 'es'
            ? `${missingCitas} citas y $${missingAmount.toFixed(0)} más para VIP`
            : `${missingCitas} appts & $${missingAmount.toFixed(0)} more for VIP`;
        }
        return locale === 'es'
          ? `${missingCitas} cita${missingCitas !== 1 ? 's' : ''} más para VIP`
          : `${missingCitas} more appt${missingCitas !== 1 ? 's' : ''} for VIP`;
      }
    }
    return null;
  };

  // Save edited contact info
  const handleSaveContact = async () => {
    if (!selectedClient) return;
    setContactSaving(true);
    setContactMsg(null);
    const res = await updateClientContactAction({
      oldEmail: selectedClient.email,
      newEmail: contactEmail,
      newPhone: contactPhone,
    });
    setContactSaving(false);
    if (res.success) {
      // Update local state
      setSelectedClient((prev: any) => ({ ...prev, email: contactEmail, phone: contactPhone }));
      setContactMsg({ ok: true, text: locale === 'es' ? 'Contacto actualizado' : 'Contact updated' });
      setEditingContact(false);
    } else {
      setContactMsg({ ok: false, text: locale === 'es' ? 'Error al guardar' : 'Error saving' });
    }
  };

  // Build points balance map: email → balance (from loyaltyRows)
  const pointsBalanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of loyaltyRows) {
      if ((row as any).loyaltyPointsBalance !== undefined) {
        m[row.clientEmail.toLowerCase()] = (row as any).loyaltyPointsBalance as number;
      }
    }
    return m;
  }, [loyaltyRows]);

  // Fetch full points data when modal opens for an ENTERPRISE+points client
  const fetchClientPoints = useCallback(async (email: string) => {
    if (!email || plan !== 'ENTERPRISE' || !pointsEnabled) return;
    setPointsLoading(true);
    setClientPointsData(null);
    try {
      const result = await getClientPointsAction(email);
      if (result) {
        setClientPointsData({
          balance: result.balance ?? 0,
          transactions: (result.transactions ?? []) as PointsTransaction[],
          rewards: (result.rewards ?? []) as RewardItem[],
        });
      }
    } finally {
      setPointsLoading(false);
    }
  }, [plan, pointsEnabled]);

  useEffect(() => {
    if (selectedClient && plan === 'ENTERPRISE' && pointsEnabled && selectedClient.email) {
      fetchClientPoints(selectedClient.email);
    } else {
      setClientPointsData(null);
    }
    setShowRedeemModal(false);
    setRedeemError(null);
  }, [selectedClient, plan, pointsEnabled, fetchClientPoints]);

  const handleRedeem = async (rewardId: string, clientEmail: string, clientName: string) => {
    setRedeemingId(rewardId);
    setRedeemError(null);
    try {
      const result = await redeemRewardAction({ rewardId, clientEmail, clientName });
      if (result.success) {
        setShowRedeemModal(false);
        // Re-fetch points data
        await fetchClientPoints(clientEmail);
      } else {
        setRedeemError(result.error ?? (locale === 'es' ? 'Error al canjear' : 'Failed to redeem'));
      }
    } finally {
      setRedeemingId(null);
    }
  };

  const clientStats = useMemo(() => {
    const clientsMap = new Map<string, any>();
    
    bookings.forEach(booking => {
      const key = booking.customerEmail 
         ? booking.customerEmail.toLowerCase() 
         : booking.customerName.toLowerCase() + (booking.customerPhone || "");
      
      const price = parseFloat(booking.service.price) || 0;
      
      if (!clientsMap.has(key)) {
         clientsMap.set(key, {
           name: booking.customerName,
           email: booking.customerEmail,
           phone: booking.customerPhone,
           totalSpent: 0,
           totalAppointments: 0,
           lastVisit: booking.startTime,
           consumedServices: {} as Record<string, { count: number, total: number }>,
           history: [] as BookingDetail[]
         });
      }
      
      const stat = clientsMap.get(key);
      const serviceName = booking.service.name;
      
      stat.totalAppointments += 1;
      stat.totalSpent += price;
      stat.history.push(booking);
      
      // Capturar mejores datos de contacto si están disponibles
      if (booking.customerEmail && !stat.email) stat.email = booking.customerEmail;
      if (booking.customerPhone && !stat.phone) stat.phone = booking.customerPhone;
      
      if (!stat.consumedServices[serviceName]) {
        stat.consumedServices[serviceName] = { count: 0, total: 0 };
      }
      stat.consumedServices[serviceName].count += 1;
      stat.consumedServices[serviceName].total += price;
      
      if (new Date(booking.startTime) > new Date(stat.lastVisit)) {
         stat.lastVisit = booking.startTime;
         stat.name = booking.customerName;
      }
    });
    
    return Array.from(clientsMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings]);

  const filteredClients = clientStats.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm));
    if (!matchesSearch) return false;
    if (tierFilter === 'ALL') return true;
    return getClientTier(c) === tierFilter;
  });

  const topService = (client: any) => {
    return Object.entries(client.consumedServices)
      .sort(([, a]: any, [, b]: any) => b.count - a.count)[0];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="hidden md:flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
        {(['directory', 'loyalty', 'points', 'surveys'] as const).map(tab => {
          const icons = { directory: Contact, loyalty: MonitorCheck, points: Star, surveys: ClipboardList };
          const labels: Record<string, string> = {
            directory: t('tabDirectory'),
            loyalty: t('tabLoyalty'),
            points: t('tabPoints'),
            surveys: t('tabSurveys'),
          };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === tab ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
            >
              <Icon className="w-4 h-4 shrink-0" /> {labels[tab]}
            </button>
          );
        })}
      </div>
      {/* Mobile: select */}
      <div className="md:hidden relative">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value as any)}
          className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        >
          <option value="directory">{t('tabDirectory')}</option>
          <option value="loyalty">{t('tabLoyalty')}</option>
          <option value="points">{t('tabPoints')}</option>
          <option value="surveys">{t('tabSurveys')}</option>
        </select>
        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
      </div>

      {/* ---- DIRECTORY TAB ---- */}
      {activeTab === 'directory' && (<>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {loyaltyEnabled && plan !== 'BASIC' && (
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as any)}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-2 px-4 text-sm font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">{locale === 'es' ? 'Todos los niveles' : 'All levels'}</option>
              <option value="VIP">👑 VIP</option>
              <option value="FREQUENT">⭐ {locale === 'es' ? 'Frecuente' : 'Frequent'}</option>
              <option value="NORMAL">{locale === 'es' ? 'Normal' : 'Normal'}</option>
            </select>
          )}
          <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 focus-within:ring-2 focus-within:ring-purple-500 transition-all w-full md:w-96 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

      {clientStats.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Contact className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t('noClients')}</h3>
            <p className="text-slate-500 dark:text-zinc-400">{t('noClientsDescription')}</p>
          </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3 animate-in slide-in-from-top-2 duration-300">
            {filteredClients.map((client, idx) => {
              const tier = getClientTier(client);
              const nearUpgrade = getNearUpgrade(client, tier);
              const [topSvcName]: any = topService(client);
              return (
                <div
                  key={idx}
                  onClick={() => { setSelectedClient(client); setEditingContact(false); setContactEmail(client.email || ''); setContactPhone(client.phone || ''); setContactMsg(null); }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:border-purple-500/40 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg shrink-0 ${tier === 'VIP' ? 'bg-gradient-to-br from-purple-500 to-violet-700 shadow-purple-500/20' : tier === 'FREQUENT' ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/20' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20'}`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{client.name}</span>
                        {tier === 'VIP' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-black shrink-0">👑 VIP</span>
                        )}
                        {tier === 'FREQUENT' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-black shrink-0">⭐ {locale === 'es' ? 'Frecuente' : 'Frequent'}</span>
                        )}
                        {client.email && notesCounts[client.email.toLowerCase()] > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-md text-xs font-black shrink-0">
                            <StickyNote className="w-2.5 h-2.5" />
                            {notesCounts[client.email.toLowerCase()]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {client.email && <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[180px]">{client.email}</p>}
                        {client.phone && <p className="text-xs text-slate-400">{client.phone}</p>}
                      </div>
                      {nearUpgrade && (
                        <p className="text-xs text-purple-500 font-semibold mt-0.5">↑ {nearUpgrade}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 text-xs rounded-lg font-bold truncate max-w-[160px]">
                      {topSvcName}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full font-black text-xs ${tier === 'VIP' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10'}`}>
                      {t('table.frequencyCount', { count: client.totalAppointments })}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white text-sm inline-flex items-center gap-0.5 ml-auto">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />{client.totalSpent.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase">{t('table.client')}</th>
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase">{t('table.contact')}</th>
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase">{t('table.mainService')}</th>
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase text-center">{t('table.frequency')}</th>
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase text-right">{t('table.totalSpent')}</th>
                         <th className="p-6 text-xs font-black tracking-widest text-slate-400 uppercase text-right">{t('table.action')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredClients.map((client, idx) => {
                          const tier = getClientTier(client);
                          const nearUpgrade = getNearUpgrade(client, tier);
                          const [topSvcName]: any = topService(client);

                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { setSelectedClient(client); setEditingContact(false); setContactEmail(client.email || ''); setContactPhone(client.phone || ''); setContactMsg(null); }}>
                               <td className="p-6">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-lg ${tier === 'VIP' ? 'bg-gradient-to-br from-purple-500 to-violet-700 shadow-purple-500/20' : tier === 'FREQUENT' ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/20' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20'}`}>
                                        {client.name.charAt(0).toUpperCase()}
                                     </div>
                                     <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-1.5 flex-wrap">
                                          {client.name}
                                          {tier === 'VIP' && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-black">👑 VIP</span>
                                          )}
                                          {tier === 'FREQUENT' && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-black">⭐ {locale === 'es' ? 'Frecuente' : 'Frequent'}</span>
                                          )}
                                          {client.email && notesCounts[client.email.toLowerCase()] > 0 && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-md text-xs font-black">
                                              <StickyNote className="w-2.5 h-2.5" />
                                              {notesCounts[client.email.toLowerCase()]}
                                            </span>
                                          )}
                                        </span>
                                        {nearUpgrade && (
                                          <span className="text-xs text-purple-500 font-semibold">↑ {nearUpgrade}</span>
                                        )}
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="space-y-0.5">
                                      {client.email && <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{client.email}</p>}
                                      {client.phone && <p className="text-xs text-slate-400 dark:text-zinc-500">{client.phone}</p>}
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex items-center gap-2">
                                     <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 text-xs rounded-lg font-bold">
                                        {topSvcName}
                                     </span>
                                  </div>
                               </td>
                               <td className="p-6 text-center">
                                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-black text-xs ${tier === 'VIP' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10' : tier === 'FREQUENT' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10'}`}>
                                     {t('table.frequencyCount', { count: client.totalAppointments })}
                                  </span>
                               </td>
                               <td className="p-6 text-right">
                                  <span className="font-black text-slate-900 dark:text-white text-base inline-flex items-center gap-1">
                                     <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                     {client.totalSpent.toFixed(2)}
                                  </span>
                               </td>
                               <td className="p-6 text-right">
                                  <button className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg text-purple-600 transition-all opacity-0 group-hover:opacity-100">
                                     <ChevronRight className="w-4 h-4" />
                                  </button>
                               </td>
                            </tr>
                          );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
      </>)}

      {/* ---- LOYALTY TAB ---- */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
          {loyaltyMessage && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${loyaltyMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
              {loyaltyMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-bold text-sm">{loyaltyMessage.text}</p>
            </div>
          )}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg"><MonitorCheck className="w-5 h-5 text-purple-600" /></div>
                <h2 className="text-xl font-bold">{locale === 'es' ? 'Fidelización' : 'Loyalty'}</h2>
              </div>
              <button type="button" onClick={() => setLoyaltyEditEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loyaltyEditEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${loyaltyEditEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {loyaltyEditEnabled && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <input type="number" min="1" max="24" value={loyaltyWindowMonths}
                    onChange={e => setLoyaltyWindowMonths(parseInt(e.target.value) || 1)}
                    className="w-20 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{locale === 'es' ? 'Ventana de evaluación (meses)' : 'Evaluation window (months)'}</p>
                    <p className="text-xs text-slate-500">{locale === 'es' ? 'Citas dentro de este periodo cuentan para el nivel Frecuente y VIP' : 'Appointments within this period count toward Frequent and VIP tiers'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input type="number" min="1" max="100" value={loyaltyFreqThreshold}
                    onChange={e => setLoyaltyFreqThreshold(parseInt(e.target.value) || 1)}
                    className="w-20 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">⭐ {locale === 'es' ? 'Citas para nivel Frecuente' : 'Appointments for Frequent tier'}</p>
                    <p className="text-xs text-slate-500">{locale === 'es' ? 'Clientes con ≥ este número de citas en la ventana' : 'Clients with ≥ this many appointments in the window'}</p>
                  </div>
                </div>
                {(plan === 'PROFESSIONAL' || plan === 'ENTERPRISE') && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl space-y-4 border border-purple-200/60 dark:border-purple-500/20">
                    <p className="text-xs font-black text-purple-600 uppercase tracking-widest">👑 {locale === 'es' ? 'Nivel VIP' : 'VIP Tier'}</p>
                    <div className="flex items-center gap-4">
                      <input type="number" min="1" max="500" value={loyaltyVipCitas === '' ? '' : loyaltyVipCitas} placeholder="—"
                        onChange={e => setLoyaltyVipCitas(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                        className="w-20 p-3 bg-white dark:bg-white/10 border border-purple-300 dark:border-purple-500/40 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                      <p className="text-sm text-slate-700 dark:text-zinc-300 flex-1">{locale === 'es' ? 'Citas mínimas para VIP (dejar vacío = sin nivel VIP)' : 'Min appointments for VIP (leave blank = no VIP tier)'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input type="number" min="1" value={loyaltyVipAmount === '' ? '' : loyaltyVipAmount} placeholder="—"
                        onChange={e => setLoyaltyVipAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                        className="w-20 p-3 bg-white dark:bg-white/10 border border-purple-300 dark:border-purple-500/40 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                      <p className="text-sm text-slate-700 dark:text-zinc-300 flex-1">{locale === 'es' ? 'Monto mínimo ($) para VIP (dejar vacío = solo por citas)' : 'Min spend ($) for VIP (leave blank = appointments only)'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={handleSaveLoyalty} disabled={loyaltySaving}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all disabled:opacity-60">
                {loyaltySaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {locale === 'es' ? 'Guardar cambios' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- POINTS TAB ---- */}
      {activeTab === 'points' && (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
          {pointsMessage && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${pointsMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
              {pointsMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-bold text-sm">{pointsMessage.text}</p>
            </div>
          )}
          {plan === 'ENTERPRISE' ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Star className="w-5 h-5 text-amber-500" /></div>
                  <div>
                    <h2 className="text-xl font-bold">{locale === 'es' ? 'Programa de Puntos' : 'Points Program'}</h2>
                    <p className="text-xs text-slate-500">{locale === 'es' ? 'Independiente del sistema de niveles' : 'Independent of the tier system'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPointsEditEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pointsEditEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/20'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${pointsEditEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {pointsEditEnabled && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <input type="number" min="1" max="100" value={pointsPerDollar}
                      onChange={e => setPointsPerDollar(parseInt(e.target.value) || 1)}
                      className="w-20 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{locale === 'es' ? 'Puntos por cada $1 gastado' : 'Points per $1 spent'}</p>
                      <p className="text-xs text-slate-500">{locale === 'es' ? `Ej: servicio de $25 = ${25 * pointsPerDollar} puntos` : `E.g. $25 service = ${25 * pointsPerDollar} points`}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{locale === 'es' ? 'Los puntos expiran' : 'Points expire'}</p>
                        <p className="text-xs text-slate-500">{locale === 'es' ? 'Por inactividad del cliente' : 'Due to client inactivity'}</p>
                      </div>
                      <button type="button" onClick={() => setPointsExpireEnabled(v => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pointsExpireEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/20'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${pointsExpireEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {pointsExpireEnabled && (
                      <div className="flex items-center gap-4 pl-1">
                        <input type="number" min="1" max="36" value={pointsExpireMonths}
                          onChange={e => setPointsExpireMonths(parseInt(e.target.value) || 1)}
                          className="w-20 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                        <p className="text-sm text-slate-600 dark:text-zinc-400">{locale === 'es' ? 'meses sin actividad' : 'months of inactivity'}</p>
                      </div>
                    )}
                  </div>
                  {/* Rewards catalog */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{locale === 'es' ? 'Catálogo de Recompensas' : 'Rewards Catalog'}</p>
                      <span className="text-xs text-slate-400">{rewards.length}/10</span>
                    </div>
                    <div className="space-y-2">
                      {rewards.map(r => (
                        <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                          {editingRewardId === r.id ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                                defaultValue={r.name} id={`rew-name-${r.id}`} placeholder={locale === 'es' ? 'Nombre' : 'Name'} />
                              <input className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                                type="number" min="1" defaultValue={r.pointsCost} id={`rew-cost-${r.id}`} placeholder={locale === 'es' ? 'Puntos' : 'Points'} />
                              <div className="flex gap-2">
                                <button type="button" onClick={async () => {
                                  const nameEl = document.getElementById(`rew-name-${r.id}`) as HTMLInputElement;
                                  const costEl = document.getElementById(`rew-cost-${r.id}`) as HTMLInputElement;
                                  await updateRewardAction({ id: r.id, name: nameEl.value, pointsCost: parseInt(costEl.value) || r.pointsCost, isActive: r.isActive });
                                  const fresh = await getRewardsAction();
                                  if (fresh.success) setRewards((fresh as any).rewards);
                                  setEditingRewardId(null);
                                }} className="flex-1 py-2 bg-purple-600 text-white text-xs font-black rounded-lg">{locale === 'es' ? 'Guardar' : 'Save'}</button>
                                <button type="button" onClick={() => setEditingRewardId(null)} className="flex-1 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-black rounded-lg">{locale === 'es' ? 'Cancelar' : 'Cancel'}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.name}</p>
                                <p className="text-xs text-amber-600 font-bold">{r.pointsCost.toLocaleString()} pts</p>
                              </div>
                              <button type="button" onClick={async () => {
                                await updateRewardAction({ ...r, description: r.description ?? undefined, isActive: !r.isActive });
                                setRewards(prev => prev.map((x: any) => x.id === r.id ? { ...x, isActive: !r.isActive } : x));
                              }} className={`text-xs px-2 py-1 rounded-full font-black ${r.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                                {r.isActive ? (locale === 'es' ? 'Activa' : 'Active') : (locale === 'es' ? 'Inactiva' : 'Inactive')}
                              </button>
                              <button type="button" onClick={() => setEditingRewardId(r.id)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={async () => {
                                await deleteRewardAction(r.id);
                                setRewards(prev => prev.filter((x: any) => x.id !== r.id));
                              }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {rewards.length < 10 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/60 dark:border-amber-500/20">
                        <input className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm placeholder:text-slate-400"
                          value={newRewardName} onChange={e => setNewRewardName(e.target.value)}
                          placeholder={locale === 'es' ? 'Nombre de la recompensa' : 'Reward name'} />
                        <input className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                          type="number" min="1" value={newRewardCost} onChange={e => setNewRewardCost(parseInt(e.target.value) || 1)}
                          placeholder={locale === 'es' ? 'Puntos' : 'Points'} />
                        <button type="button" disabled={!newRewardName.trim()} onClick={async () => {
                          if (!newRewardName.trim()) return;
                          const res = await createRewardAction({ name: newRewardName, pointsCost: newRewardCost, isActive: true });
                          if (res.success) {
                            const fresh = await getRewardsAction();
                            if (fresh.success) setRewards((fresh as any).rewards);
                            setNewRewardName(''); setNewRewardCost(500);
                          }
                        }} className="py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-black rounded-lg transition-all">
                          {locale === 'es' ? '+ Agregar' : '+ Add'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={handleSavePoints} disabled={pointsSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all disabled:opacity-60">
                  {pointsSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {locale === 'es' ? 'Guardar cambios' : 'Save changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 rounded-3xl">
                <Lock className="w-6 h-6 text-slate-400" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-400 text-center px-6">
                  {locale === 'es' ? 'Disponible en el plan Business' : 'Available on Business plan'}
                </p>
                <a href={`/${locale}/admin/billing`} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all">
                  {locale === 'es' ? 'Mejorar plan' : 'Upgrade plan'}
                </a>
              </div>
              <div className="opacity-30 pointer-events-none space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Star className="w-5 h-5 text-amber-500" /></div>
                  <h2 className="text-xl font-bold">{locale === 'es' ? 'Programa de Puntos' : 'Points Program'}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-11 bg-slate-100 dark:bg-white/5 rounded-xl" />
                  <div className="space-y-1">
                    <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-40" />
                    <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-52" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- SURVEYS TAB ---- */}
      {activeTab === 'surveys' && surveyProps && (
        <div className="animate-in fade-in duration-300">
          {!surveyProps.canUseSurveys ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-3xl border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-200 dark:bg-white/10">
                <Lock className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="text-center max-w-sm">
                <p className="font-bold text-slate-800 dark:text-white text-lg">Encuestas no disponibles</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Las encuestas están disponibles desde el plan Professional. Actualiza tu plan para acceder.</p>
              </div>
              <a href={`/${locale}/admin/billing`} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full">
                {locale === 'es' ? 'Ver planes' : 'View plans'}
              </a>
            </div>
          ) : (
            <SurveyClient
              tenantId={surveyProps.tenantId}
              initialEnabled={surveyProps.initialEnabled}
              initialQuestions={surveyProps.initialQuestions}
              initialReviews={surveyProps.initialReviews}
              canUseAdvanced={surveyProps.canUseAdvanced}
              locale={surveyProps.locale}
              slug={surveyProps.slug}
              totalSurveySent={surveyProps.totalSurveySent}
            />
          )}
        </div>
      )}

      {/* MODAL DE HISTORIAL DETALLADO */}
      {selectedClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
           {/* Backdrop con Blur Dinámico - Fixed para cubrir todo incluso con scroll */}
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)} />
           
           <div className="relative z-10 bg-white dark:bg-zinc-900 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-white/10">
              {/* Header Modal - Refined Size */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 relative bg-slate-50/50 dark:bg-white/[0.02]">
                 <button onClick={() => setSelectedClient(null)} className="absolute top-5 right-5 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
                    <X className="w-4 h-4" />
                 </button>
                 
                 <div className="flex flex-row gap-4 items-center">
                    {(() => {
                      const selTier = getClientTier(selectedClient);
                      return (
                        <>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shrink-0 ${selTier === 'VIP' ? 'bg-gradient-to-br from-purple-500 to-violet-700 shadow-purple-500/30' : selTier === 'FREQUENT' ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/30' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'}`}>
                            {selectedClient.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{selectedClient.name}</h2>
                              {selTier === 'VIP' && (
                                <span className="px-2.5 py-0.5 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20 flex items-center gap-0.5">
                                  👑 VIP
                                </span>
                              )}
                              {selTier === 'FREQUENT' && (
                                <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 flex items-center gap-0.5">
                                  ⭐ {locale === 'es' ? 'Frecuente' : 'Frequent'}
                                </span>
                              )}
                            </div>
                       
                       {/* Contact info — editable for admins */}
                       {editingContact ? (
                         <div className="space-y-2 w-full max-w-sm">
                           <div className="flex items-center gap-2">
                             <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                             <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="flex-1 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="email@ejemplo.com" />
                           </div>
                           <div className="flex items-center gap-2">
                             <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                             <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="flex-1 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="+503 0000-0000" />
                           </div>
                           <div className="flex items-center gap-2">
                             <button onClick={handleSaveContact} disabled={contactSaving} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                               {contactSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                               {locale === 'es' ? 'Guardar' : 'Save'}
                             </button>
                             <button onClick={() => { setEditingContact(false); setContactMsg(null); }} className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-white/15">
                               {locale === 'es' ? 'Cancelar' : 'Cancel'}
                             </button>
                           </div>
                           {contactMsg && <p className={`text-xs font-bold ${contactMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{contactMsg.text}</p>}
                         </div>
                       ) : (
                         <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400">
                           {selectedClient.email ? (
                             <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 py-0.5 px-2 rounded-lg border border-slate-200 dark:border-white/5 truncate max-w-[200px]">
                               <Mail className="w-3 h-3 text-purple-500" /> {selectedClient.email}
                             </div>
                           ) : (
                             <div className="text-xs italic opacity-60">{t('noEmail')}</div>
                           )}
                           {selectedClient.phone ? (
                             <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 py-0.5 px-2 rounded-lg border border-slate-200 dark:border-white/5">
                               <Phone className="w-3 h-3 text-emerald-500" /> {selectedClient.phone}
                             </div>
                           ) : (
                             <div className="text-xs italic opacity-60">{t('noPhone')}</div>
                           )}
                           {isAdminRole && (
                             <button onClick={() => { setEditingContact(true); setContactEmail(selectedClient.email || ''); setContactPhone(selectedClient.phone || ''); }} className="p-1 text-slate-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10">
                               <Pencil className="w-3 h-3" />
                             </button>
                           )}
                         </div>
                       )}
                    </div>
                        </>
                      );
                    })()}
                 </div>
              </div>

              {/* Contenido Scrollable - Reduced Spacing */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.invested')}</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">${selectedClient.totalSpent.toFixed(2)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.appointments')}</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{selectedClient.totalAppointments}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                         <Scissors className="w-3.5 h-3.5 text-amber-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.favorite')}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={topService(selectedClient)[0] as string}>
                        {topService(selectedClient)[0]}
                      </p>
                   </div>
                </div>

                {/* ── ORDER: Fidelización → Notas → Historial ── */}

                {/* Client Notes — collapsible, alerts always visible */}
                <ClientNotes
                  clientEmail={selectedClient.email}
                  clientName={selectedClient.name}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  locale={locale}
                  collapsible
                />

                {/* Loyalty / Fidelización Panel — compact */}
                {loyaltyEnabled && plan !== 'BASIC' && (() => {
                  const selTier = getClientTier(selectedClient);
                  const nearUpgrade = getNearUpgrade(selectedClient, selTier);
                  const tierBorder = selTier === 'VIP' ? 'border-purple-500/20' : selTier === 'FREQUENT' ? 'border-orange-400/20' : 'border-indigo-200 dark:border-indigo-500/20';
                  const tierIconColor = selTier === 'VIP' ? 'text-purple-600 dark:text-purple-400' : selTier === 'FREQUENT' ? 'text-orange-500' : 'text-indigo-500 dark:text-indigo-400';
                  return (
                    <div className={`px-4 py-3 bg-white dark:bg-white/[0.03] border ${tierBorder} rounded-2xl`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className={`flex items-center gap-1.5 ${tierIconColor}`}>
                          <Award className="w-3.5 h-3.5" />
                          <span className="text-xs font-black uppercase tracking-widest">{locale === 'es' ? 'Fidelización' : 'Loyalty'}</span>
                          {selTier === 'VIP' && <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-black uppercase rounded-full ml-1">👑 VIP</span>}
                          {selTier === 'FREQUENT' && <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-black uppercase rounded-full ml-1">⭐ {locale === 'es' ? 'Frecuente' : 'Frequent'}</span>}
                        </div>
                        {isAdminRole && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedClient(null); setActiveTab('points'); }} className="flex items-center gap-1 text-xs font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/30 px-2 py-1 rounded-lg transition-all">
                            <Settings2 className="w-2.5 h-2.5" /> {locale === 'es' ? 'Configurar' : 'Settings'}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 font-medium flex-wrap">
                        <span>{selectedClient.totalAppointments} {locale === 'es' ? 'citas' : 'appts'}</span>
                        <span className="text-slate-300 dark:text-zinc-700">·</span>
                        <span>${selectedClient.totalSpent.toFixed(0)} {locale === 'es' ? 'gastados' : 'spent'}</span>
                        {nearUpgrade && <span className="flex items-center gap-0.5 text-indigo-500"><TrendingUp className="w-2.5 h-2.5" />{nearUpgrade}</span>}
                      </div>
                      {/* Points sub-panel — ENTERPRISE only */}
                      {plan === 'ENTERPRISE' && pointsEnabled && selectedClient.email && (() => {
                        if (pointsLoading) return <div className="flex items-center gap-1 text-xs text-slate-400 mt-2"><Loader2 className="w-3 h-3 animate-spin" />{locale === 'es' ? 'Cargando…' : 'Loading…'}</div>;
                        const balance = clientPointsData?.balance ?? 0;
                        const rewards = clientPointsData?.rewards ?? [];
                        const txns = clientPointsData?.transactions ?? [];
                        const activeRewards = rewards.filter(r => r.isActive);
                        const nextReward = activeRewards.find(r => r.pointsCost > balance)
                          ?? activeRewards.sort((a, b) => b.pointsCost - a.pointsCost)[0];
                        const progress = nextReward && nextReward.pointsCost > 0 ? Math.min(100, Math.round((balance / nextReward.pointsCost) * 100)) : 0;
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">{locale === 'es' ? 'Puntos' : 'Points'}</p>
                                <p className="text-lg font-black text-purple-600 dark:text-purple-400 leading-none">{balance.toLocaleString()} <span className="text-xs font-bold text-slate-400">pts</span></p>
                              </div>
                              {rewards.filter(r => r.isActive).length > 0 && (
                                <button onClick={() => setShowRedeemModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all">
                                  <Gift className="w-3 h-3" />{locale === 'es' ? 'Canjear' : 'Redeem'}
                                </button>
                              )}
                            </div>
                            {nextReward && (
                              <div>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-0.5">
                                  <span>{nextReward.name}</span><span>{balance} / {nextReward.pointsCost} pts</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            )}
                            {balance === 0 && txns.length === 0 && <p className="text-xs text-slate-400 italic">{locale === 'es' ? 'Sin puntos acumulados todavía.' : 'No points yet.'}</p>}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Service History */}
                <div className="space-y-3">
                   <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('history.title')}</h3>
                   </div>

                   {/* Mobile: card list (no horizontal scroll) */}
                   <div className="sm:hidden space-y-2">
                      {selectedClient.history.map((h: any, idx: number) => (
                         <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                               <span className="font-bold text-purple-600 dark:text-purple-400 text-sm leading-tight">{h.service.name}</span>
                               <span className="font-black text-slate-900 dark:text-white text-sm shrink-0">${parseFloat(h.service.price).toFixed(2)}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                               {format(h.startTime, "dd MMM yyyy", { locale: locale === 'es' ? es : enUS })} · {format(h.startTime, "HH:mm")}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                               {h.staff && <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{h.staff.name}</span>}
                               <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{h.branch?.name ?? '—'}</span>
                            </div>
                         </div>
                      ))}
                   </div>

                   {/* Desktop: table */}
                   <div className="hidden sm:block border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-zinc-800/50">
                      <table className="w-full text-left border-collapse">
                         <thead className="bg-slate-100/50 dark:bg-white/5">
                            <tr>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.date')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.service')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.staffBranch')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{t('history.amount')}</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {selectedClient.history.map((h: any, idx: number) => (
                               <tr key={idx} className="text-xs hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3">
                                     <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white">{format(h.startTime, "dd MMM yyyy", { locale: locale === 'es' ? es : enUS })}</span>
                                        <span className="text-xs text-slate-400 font-bold">{format(h.startTime, "HH:mm")}</span>
                                     </div>
                                  </td>
                                  <td className="p-3">
                                     <span className="font-bold text-purple-600 dark:text-purple-400">{h.service.name}</span>
                                  </td>
                                  <td className="p-3">
                                     <div className="flex flex-col">
                                        {h.staff && <span className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                                           <User className="w-2.5 h-2.5 opacity-50" /> {h.staff.name}
                                        </span>}
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                           <MapPin className="w-2.5 h-2.5 opacity-50" /> {h.branch?.name ?? '—'}
                                        </span>
                                     </div>
                                  </td>
                                  <td className="p-3 text-right">
                                     <span className="font-black text-slate-900 dark:text-white">${parseFloat(h.service.price).toFixed(2)}</span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

              </div>

              {/* Footer Modal - Refined */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 flex justify-end">
                 <button 
                   onClick={() => setSelectedClient(null)}
                   className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-sm tracking-tight hover:opacity-90 transition-all shadow-lg active:scale-95"
                 >
                    {t('closeProfile')}
                 </button>
              </div>
           </div>

           {/* Redeem Reward Modal */}
           {showRedeemModal && clientPointsData && selectedClient && (
             <div className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-[2.5rem] overflow-hidden">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowRedeemModal(false); setRedeemError(null); }} />
               <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
                 <div className="flex items-center gap-2 mb-4">
                   <Gift className="w-4 h-4 text-purple-600" />
                   <h4 className="text-base font-black text-slate-900 dark:text-white">
                     {locale === 'es' ? 'Canjear recompensa' : 'Redeem reward'}
                   </h4>
                   <button onClick={() => { setShowRedeemModal(false); setRedeemError(null); }} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                     <X className="w-4 h-4" />
                   </button>
                 </div>
                 <p className="text-xs text-slate-400 dark:text-zinc-500 mb-1">
                   {locale === 'es' ? 'Balance actual' : 'Current balance'}:{' '}
                   <strong className="text-purple-600">{clientPointsData.balance.toLocaleString()} pts</strong>
                 </p>
                 {redeemError && (
                   <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl mb-3 text-xs text-red-600 dark:text-red-400">
                     <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {redeemError}
                   </div>
                 )}
                 <div className="space-y-2 mt-3">
                   {clientPointsData.rewards.filter(r => r.isActive).map(reward => {
                     const canAfford = clientPointsData.balance >= reward.pointsCost;
                     const isRedeeming = redeemingId === reward.id;
                     return (
                       <div key={reward.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${canAfford ? 'border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] opacity-60'}`}>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{reward.name}</p>
                           {reward.description && (
                             <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{reward.description}</p>
                           )}
                           <p className="text-xs font-black text-purple-600 mt-0.5">{reward.pointsCost.toLocaleString()} pts</p>
                         </div>
                         <button
                           disabled={!canAfford || !!redeemingId}
                           onClick={() => handleRedeem(reward.id, selectedClient.email, selectedClient.name)}
                           className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${canAfford ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20' : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'}`}
                         >
                           {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                           {locale === 'es' ? 'Canjear' : 'Redeem'}
                         </button>
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
