"use client";

import { useState, useRef, useEffect } from "react";
import {
  Palette, CheckCircle2, AlertCircle, Upload, Save, Eye, MonitorSmartphone, Monitor, Moon, Sun, MonitorCheck, LayoutTemplate, Link as LinkIcon, ExternalLink, Instagram, Facebook, Music, Building2, ImageIcon, Truck, Info, Settings, Share2, Copy, Trash2, Lock, Mail, User, Star, Pencil
} from "lucide-react";
import { updatePortalSettingsAction } from "@/app/actions/tenant";
import { getRewardsAction, createRewardAction, updateRewardAction, deleteRewardAction } from "@/app/actions/loyalty";
import { 
  getCoverageZonesAction, 
  createCoverageZoneAction, 
  updateCoverageZoneAction, 
  deleteCoverageZoneAction 
} from "@/app/actions/zones";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlanGateSection } from "@/components/PlanGate";
import { canUseFeature } from "@/core/plans";

export default function AppearanceClient({
  tenant,
  initialZones,
  initialTab = 'design',
  plan,
}: {
plan?: string | null;
tenant: {
id: string;
name: string;
slug: string;
logoUrl?: string | null;
coverUrl?: string | null;
primaryColor: string;
theme: string;
instagramUrl?: string | null;
facebookUrl?: string | null;
tiktokUrl?: string | null;
whatsappNumber?: string | null;
homeServiceTerms?: string | null;
homeServiceTermsEnabled?: boolean;
waMessageTemplate?: string | null;
allowsHomeService?: boolean;
homeServiceLeadDays: number;
vipThreshold: number;
showStaffSelection?: boolean;
heroTitle?: string | null;
heroSubtitle?: string | null;
emailBodyTemplate?: string | null;
emailLocale?: string | null;
contactEmail?: string | null;
bookingSettings?: {
  footerText?: string;
  step1Title?: string;
  step2Title?: string;
  step3Title?: string;
  step4Title?: string;
  [key: string]: any;
};
timezone?: string | null;
// Loyalty levels
loyaltyEnabled?: boolean;
loyaltyWindowMonths?: number;
loyaltyFrequentThreshold?: number;
loyaltyVipCitasThreshold?: number | null;
loyaltyVipAmountThreshold?: number | null;
// Points program
pointsEnabled?: boolean;
pointsPerDollar?: number;
pointsExpireEnabled?: boolean;
pointsExpireMonths?: number;
},
initialZones: any[];
initialTab?: 'design' | 'rules';
}) {
  const t = useTranslations('Dashboard');
  const tPortal = useTranslations('Dashboard.portal');
  const tWidget = useTranslations('BookingWidget');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'design' | 'rules'>(initialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // Diseño y Marca (Visual)
  const [name, setName] = useState(tenant.name || "");
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor || "#9333ea");
  const [theme, setTheme] = useState(tenant.theme || "light");
  const [coverUrl, setCoverUrl] = useState(tenant.coverUrl || "");
const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || "");
const [instagramUrl, setInstagramUrl] = useState(tenant.instagramUrl || "");
const [facebookUrl, setFacebookUrl] = useState(tenant.facebookUrl || "");
const [tiktokUrl, setTiktokUrl] = useState(tenant.tiktokUrl || "");
const [heroTitle, setHeroTitle] = useState(tenant.heroTitle || "");
const [heroSubtitle, setHeroSubtitle] = useState(tenant.heroSubtitle || "");
const [emailBodyTemplate, setEmailBodyTemplate] = useState(tenant.emailBodyTemplate || "");
const [emailLocale, setEmailLocale] = useState(tenant.emailLocale || "es");
const [contactEmail, setContactEmail] = useState(tenant.contactEmail || "");
const [footerText, setFooterText] = useState(tenant.bookingSettings?.footerText || "");
const [step1Title, setStep1Title] = useState(tenant.bookingSettings?.step1Title || "");
const [step2Title, setStep2Title] = useState(tenant.bookingSettings?.step2Title || "");
const [step3Title, setStep3Title] = useState(tenant.bookingSettings?.step3Title || "");
const [step4Title, setStep4Title] = useState(tenant.bookingSettings?.step4Title || "");
  
  // Operación y Reglas (Lógico)
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || "");
  const [allowsHomeService, setAllowsHomeService] = useState(tenant.allowsHomeService ?? true);
  const [homeServiceTermsEnabled, setHomeServiceTermsEnabled] = useState(tenant.homeServiceTermsEnabled || false);
  const [homeServiceTerms, setHomeServiceTerms] = useState(tenant.homeServiceTerms || "");
  const [waMessageTemplate, setWaMessageTemplate] = useState(tenant.waMessageTemplate || "");
  const [homeServiceLeadDays, setHomeServiceLeadDays] = useState(tenant.homeServiceLeadDays || 0);
  const [vipThreshold, setVipThreshold] = useState(tenant.vipThreshold || 5);
  const [showStaffSelection, setShowStaffSelection] = useState(tenant.showStaffSelection ?? true);
  // Loyalty levels
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(tenant.loyaltyEnabled ?? false);
  const [loyaltyWindowMonths, setLoyaltyWindowMonths] = useState(tenant.loyaltyWindowMonths ?? 6);
  const [loyaltyFrequentThreshold, setLoyaltyFrequentThreshold] = useState(tenant.loyaltyFrequentThreshold ?? 5);
  const [loyaltyVipCitasThreshold, setLoyaltyVipCitasThreshold] = useState<number | ''>(tenant.loyaltyVipCitasThreshold ?? '');
  const [loyaltyVipAmountThreshold, setLoyaltyVipAmountThreshold] = useState<number | ''>(tenant.loyaltyVipAmountThreshold ?? '');
  // Points program
  const [pointsEnabled, setPointsEnabled] = useState(tenant.pointsEnabled ?? false);
  const [pointsPerDollar, setPointsPerDollar] = useState(tenant.pointsPerDollar ?? 10);
  const [pointsExpireEnabled, setPointsExpireEnabled] = useState(tenant.pointsExpireEnabled ?? false);
  const [pointsExpireMonths, setPointsExpireMonths] = useState(tenant.pointsExpireMonths ?? 6);
  // Rewards management
  const [rewards, setRewards] = useState<{id:string;name:string;description?:string|null;pointsCost:number;isActive:boolean;sortOrder:number}[]>([]);
  const [rewardsLoaded, setRewardsLoaded] = useState(false);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(500);
  const [editingReward, setEditingReward] = useState<string | null>(null);

  // Zona horaria
  const [timezone, setTimezone] = useState(tenant.timezone || 'America/El_Salvador');

  // Load rewards when points section becomes relevant
  useEffect(() => {
    if ((plan === 'ENTERPRISE') && !rewardsLoaded) {
      getRewardsAction().then(r => {
        if (r.success) setRewards(r.rewards as any);
        setRewardsLoaded(true);
      });
    }
  }, [plan, rewardsLoaded]);

  const TIMEZONES = [
    { group: 'América Central', options: [
      { value: 'America/El_Salvador', label: 'El Salvador, Guatemala, Honduras (GMT-6)' },
      { value: 'America/Costa_Rica',  label: 'Costa Rica, Nicaragua (GMT-6)' },
      { value: 'America/Panama',      label: 'Panamá (GMT-5)' },
      { value: 'America/Mexico_City', label: 'México Centro (GMT-6)' },
      { value: 'America/Monterrey',   label: 'México Norte (GMT-6)' },
      { value: 'America/Tijuana',     label: 'México Noroeste (GMT-7)' },
    ]},
    { group: 'América del Sur', options: [
      { value: 'America/Bogota',      label: 'Colombia, Ecuador, Perú (GMT-5)' },
      { value: 'America/Caracas',     label: 'Venezuela (GMT-4)' },
      { value: 'America/La_Paz',      label: 'Bolivia, Venezuela (GMT-4)' },
      { value: 'America/Santiago',    label: 'Chile (GMT-4/-3)' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina, Uruguay (GMT-3)' },
      { value: 'America/Sao_Paulo',   label: 'Brasil Este (GMT-3)' },
      { value: 'America/Manaus',      label: 'Brasil Oeste (GMT-4)' },
    ]},
    { group: 'América del Norte', options: [
      { value: 'America/New_York',    label: 'Este de EE.UU. (GMT-5/-4)' },
      { value: 'America/Chicago',     label: 'Centro de EE.UU. (GMT-6/-5)' },
      { value: 'America/Denver',      label: 'Montaña de EE.UU. (GMT-7/-6)' },
      { value: 'America/Los_Angeles', label: 'Pacífico de EE.UU. (GMT-8/-7)' },
      { value: 'America/Anchorage',   label: 'Alaska (GMT-9/-8)' },
      { value: 'Pacific/Honolulu',    label: 'Hawái (GMT-10)' },
    ]},
    { group: 'Caribe', options: [
      { value: 'America/Puerto_Rico', label: 'Puerto Rico, Rep. Dominicana (GMT-4)' },
      { value: 'America/Havana',      label: 'Cuba (GMT-5/-4)' },
      { value: 'America/Jamaica',     label: 'Jamaica (GMT-5)' },
    ]},
    { group: 'Europa', options: [
      { value: 'UTC',                 label: 'UTC (GMT+0)' },
      { value: 'Europe/London',       label: 'Londres (GMT+0/+1)' },
      { value: 'Europe/Madrid',       label: 'España, Francia (GMT+1/+2)' },
      { value: 'Europe/Berlin',       label: 'Alemania, Italia (GMT+1/+2)' },
      { value: 'Europe/Moscow',       label: 'Moscú (GMT+3)' },
    ]},
    { group: 'Asia / Pacífico', options: [
      { value: 'Asia/Dubai',          label: 'Dubai (GMT+4)' },
      { value: 'Asia/Kolkata',        label: 'India (GMT+5:30)' },
      { value: 'Asia/Bangkok',        label: 'Tailandia, Vietnam (GMT+7)' },
      { value: 'Asia/Singapore',      label: 'Singapur, Malasia (GMT+8)' },
      { value: 'Asia/Tokyo',          label: 'Japón (GMT+9)' },
      { value: 'Australia/Sydney',    label: 'Sídney (GMT+10/+11)' },
    ]},
  ];

  // Zonas de Cobertura
  const [zones, setZones] = useState<any[]>(initialZones || []);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', fee: '0', description: '' });

  const PRESET_COLORS = [
    { name: tPortal('colors.purple'), value: '#9333ea' },
    { name: tPortal('colors.blue'), value: '#2563eb' },
    { name: tPortal('colors.emerald'), value: '#10b981' },
    { name: tPortal('colors.rose'), value: '#e11d48' },
    { name: tPortal('colors.amber'), value: '#d97706' },
    { name: tPortal('colors.slate'), value: '#475569' },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'es';

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    
    const result = await updatePortalSettingsAction({
      tenantId: tenant.id,
      name,
      primaryColor,
      theme,
      coverUrl,
      logoUrl,
      instagramUrl,
      facebookUrl,
      tiktokUrl,
      whatsappNumber,
      waMessageTemplate,
allowsHomeService,
homeServiceTermsEnabled,
homeServiceLeadDays,
vipThreshold,
showStaffSelection,
heroTitle,
heroSubtitle,
emailBodyTemplate,
emailLocale,
contactEmail: contactEmail || null,
bookingSettings: {
  ...tenant.bookingSettings,
  footerText,
  step1Title: step1Title || undefined,
  step2Title: step2Title || undefined,
  step3Title: step3Title || undefined,
  step4Title: step4Title || undefined,
},
timezone,
});

    if (result.success) {
      setMessage({ type: 'success', text: tPortal('successSave') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: tPortal('errorSave') });
    }
    setIsLoading(false);
  };

// Convierte cualquier imagen a WebP usando Canvas (sin librerías externas)
async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas error')); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error('Conversion failed')); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load error')); };
    img.src = url;
  });
}

const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

if (!file.type.startsWith('image/')) {
  setMessage({ type: 'error', text: tPortal('errorLogo') });
  e.target.value = '';
  return;
}

if (file.size > 2 * 1024 * 1024) {
  setMessage({ type: 'error', text: tPortal('errorCoverSize') });
  e.target.value = '';
  return;
}

setIsUploadingCover(true);
try {
  const webpFile = await convertToWebP(file, 0.85);
  const form = new FormData();
  form.append('file', webpFile);
  form.append('type', 'cover');

  const res = await fetch('/api/upload-asset', { method: 'POST', body: form });
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || 'Upload failed');

  setCoverUrl(json.url);
  setMessage({ type: 'success', text: tPortal('coverLoaded') });
} catch (err: any) {
  console.error("Upload error:", err);
  setMessage({ type: 'error', text: tPortal('errorUpload') });
} finally {
  setIsUploadingCover(false);
}
};

const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

if (!file.type.startsWith('image/')) {
  setMessage({ type: 'error', text: tPortal('errorLogo') });
  e.target.value = '';
  return;
}

if (file.size > 1 * 1024 * 1024) {
  setMessage({ type: 'error', text: tPortal('errorLogoSize') });
  e.target.value = '';
  return;
}

try {
  const webpFile = await convertToWebP(file, 0.90);
  const form = new FormData();
  form.append('file', webpFile);
  form.append('type', 'logo');

  const res = await fetch('/api/upload-asset', { method: 'POST', body: form });
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || 'Upload failed');

  setLogoUrl(json.url);
  setMessage({ type: 'success', text: tPortal('logoLoaded') });
} catch (err: any) {
  console.error("Logo upload error:", err);
  setMessage({ type: 'error', text: tPortal('errorUpload') });
}
};

  const handleAddZone = async () => {
    if (!newZone.name) return;
    const res = await createCoverageZoneAction({
      tenantId: tenant.id,
      ...newZone,
    });
    if (res.success) {
      setZones([...zones, (res as any).zone]);
      setNewZone({ name: '', fee: '0', description: '' });
      setIsAddingZone(false);
      setMessage({ type: 'success', text: tPortal('form.addZone') });
    }
  };

  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);

  const handleDeleteZone = (id: string) => {
    setDeleteZoneId(id);
  };

  const confirmDeleteZone = async () => {
    if (!deleteZoneId) return;
    const id = deleteZoneId;
    setDeleteZoneId(null);
    const res = await deleteCoverageZoneAction(id);
    if (res.success) {
      setZones(zones.filter(z => z.id !== id));
      setMessage({ type: 'success', text: tPortal('successSave') });
    }
  };

  return (
    <>
    <div className="flex flex-col xl:flex-row h-[calc(100vh-8rem)] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* LEFT COLUMN - CONTROLS */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 flex flex-col gap-6 min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{tPortal('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{tPortal('subtitle')}</p>
        </div>

        {/* COMPONENTE DE TABS */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
           <button
             onClick={() => setActiveTab('design')}
             className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${activeTab === 'design' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
           >
              <Palette className="w-4 h-4 shrink-0" /> {tPortal('tabs.design')}
           </button>
           <button
             onClick={() => setActiveTab('rules')}
             className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${activeTab === 'rules' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
           >
              <Settings className="w-4 h-4 shrink-0" /> {tPortal('tabs.rules')}
           </button>
        </div>

        {/* MENSAJE DE ESTADO */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
            message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{message.text}</p>
          </div>
        )}

        {/* CONTENIDO TAB Diseño y Marca */}
        {activeTab === 'design' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            {/* ENLACE PÚBLICO */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg overflow-hidden relative group border border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Share2 className="w-16 h-16" />
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="text-md font-bold tracking-tight flex items-center gap-2">
                    {tPortal('link.title')}
                    <span className="px-2 py-0.5 bg-emerald-500 rounded-full text-xs font-black tracking-widest">{tPortal('link.status')}</span>
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <code className="flex-1 px-2 py-1 text-xs font-mono text-purple-100 truncate">
                    {mounted ? `${window.location.host}/${tenant.slug}` : `/${tenant.slug}`}
                  </code>
                  <button 
                    onClick={() => {
                      const url = `${window.location.protocol}//${window.location.host}/${tenant.slug}`;
                      navigator.clipboard.writeText(url);
                      setMessage({ text: tPortal('link.copied'), type: 'success' });
                      setTimeout(() => setMessage(null), 2000);
                    }}
                    className="px-3 py-1.5 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all active:scale-95 font-bold text-xs"
                  >
                    {tPortal('link.copy')}
                  </button>
                </div>
              </div>
            </div>

            {/* Identidad de Negocio */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tPortal('sections.identity')}</h2>
              </div>
              
              <div className="space-y-6">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.businessName')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={tPortal('form.businessPlaceholder')}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                </div>


                {/* Subtitle */}
                <PlanGateSection plan={plan} feature="customHero" upgradeMessage="El subtítulo personalizado del hero está disponible desde el plan Professional.">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.heroSubtitle')}</label>
                  <input
                    type="text"
                    value={heroSubtitle}
                    onChange={e => setHeroSubtitle(e.target.value)}
                    placeholder={tWidget('hero_subtitle')}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{tPortal('form.heroSubtitleHint')}</p>
                </div>
                </PlanGateSection>


                {/* WhatsApp / Phone */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.phone')}</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="Ej: 50370000000"
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Se muestra en los correos de confirmación para que el cliente pueda contactarte.</p>
                </div>

                {/* Widget Footer */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.footerLabel')}</label>
                  <textarea
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    placeholder={tPortal('form.footerPlaceholder')}
                    className="w-full min-h-[80px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{tPortal('form.footerHint')}</p>
                </div>

                {/* Widget Step Titles — Business plan */}
                <PlanGateSection plan={plan} feature="customWidgetSteps" upgradeMessage={tPortal('form.widgetStepsUpgrade')}>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">{tPortal('form.widgetStepsLabel')}</label>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">{tPortal('form.widgetStepsHint')}</p>
                    </div>
                    {[
                      { num: 1, value: step1Title, set: setStep1Title, placeholder: tWidget('title_branch') },
                      { num: 2, value: step2Title, set: setStep2Title, placeholder: tWidget('title_service') },
                      { num: 3, value: step3Title, set: setStep3Title, placeholder: tWidget('title_specialist') },
                      { num: 4, value: step4Title, set: setStep4Title, placeholder: tWidget('title_data') },
                    ].map(({ num, value, set, placeholder }) => (
                      <div key={num} className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center shrink-0">
                          {num}
                        </span>
                        <input
                          type="text"
                          value={value}
                          onChange={e => set(e.target.value)}
                          placeholder={placeholder}
                          className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </PlanGateSection>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.logoLabel')}</label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative group w-20 h-20 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shrink-0">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => setLogoUrl('')} className="text-white hover:text-rose-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-purple-500 transition-all shrink-0">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                        <span className="text-xs font-bold">{tPortal('form.upload')}</span>
                      </button>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">{tPortal('form.logoSpecs')}</p>
                      {logoUrl
                        ? <button onClick={() => setLogoUrl('')} className="text-xs font-bold text-rose-500 hover:underline">{tPortal('logo.delete')}</button>
                        : <button onClick={() => logoInputRef.current?.click()} className="text-xs font-bold text-purple-600 hover:underline">{tPortal('logo.hint')}</button>
                      }
                    </div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.coverLabel')}</label>
                  <div className="flex items-center gap-4">
                    {coverUrl ? (
                      <div className="relative group w-20 h-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white flex items-center justify-center overflow-hidden shrink-0">
                        <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => setCoverUrl('')} className="text-white hover:text-rose-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover} className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-purple-500 transition-all shrink-0 disabled:opacity-50">
                        {isUploadingCover
                          ? <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                          : <><ImageIcon className="w-6 h-6 mb-1 opacity-50" /><span className="text-xs font-bold">{tPortal('form.upload')}</span></>
                        }
                      </button>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">{tPortal('form.coverSpecs2')}</p>
                      {coverUrl
                        ? <button onClick={() => setCoverUrl('')} className="text-xs font-bold text-rose-500 hover:underline">{tPortal('cover.delete')}</button>
                        : <button onClick={() => coverInputRef.current?.click()} className="text-xs font-bold text-purple-600 hover:underline">{tPortal('cover.hint')}</button>
                      }
                    </div>
                    <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                  </div>
                </div>

                {/* Social Links */}
                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('sections.social')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder={tPortal('form.instagram')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Facebook className="w-4 h-4" />
                    </div>
                    <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder={tPortal('form.facebook')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Music className="w-4 h-4" />
                    </div>
                    <input type="url" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder={tPortal('form.tiktok')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tema del Portal */}
            <PlanGateSection plan={plan} feature="customTheme" upgradeMessage="La selección de tema claro/oscuro está disponible desde el plan Professional.">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <Monitor className="w-4 h-4 text-purple-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{tPortal('sections.theme')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-black/20 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                <button type="button" onClick={() => setTheme('light')} className={`py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm ${theme === 'light' ? 'bg-white dark:bg-zinc-800 text-purple-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  <Sun className="w-4 h-4" /> {tPortal('theme.light')}
                </button>
                <button type="button" onClick={() => setTheme('dark')} className={`py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm ${theme === 'dark' ? 'bg-zinc-800 text-purple-400 shadow-md transform scale-[1.02] border border-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  <Moon className="w-4 h-4" /> {tPortal('theme.dark')}
                </button>
              </div>
            </div>
            </PlanGateSection>

            {!canUseFeature(plan, 'customTheme') && (
              <div className="flex items-start gap-3 px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                <Eye className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-0.5">Tu portal usa actualmente:</p>
                  <p className="text-sm text-slate-700 dark:text-zinc-200">
                    {theme === 'dark' ? '🌙 Tema Oscuro' : '☀️ Tema Claro'}
                  </p>
                </div>
              </div>
            )}

            {/* Color Primario */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-1.5 bg-purple-500/10 rounded-lg"><Palette className="w-4 h-4 text-purple-600" /></div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{tPortal('sections.color')}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value} type="button" onClick={() => setPrimaryColor(c.value)}
                    className={`w-7 h-7 rounded-full border-[2px] transition-all hover:scale-110 shadow-sm shrink-0 ${primaryColor.toLowerCase() === c.value ? 'border-slate-800 dark:border-white scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }} title={c.name}
                  />
                ))}
                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0" />
                  <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value.toUpperCase())} className="flex-1 py-2 px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-mono font-bold uppercase text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB Operación y Reglas */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            {/* Zona Horaria */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Zona Horaria</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Define el horario local de tu negocio. Los clientes verán sus citas en esta zona horaria.</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Zona horaria del negocio</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                >
                  {TIMEZONES.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Zona actual: <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">{timezone}</span>
                </p>
              </div>
            </div>

{/* Email de Confirmación */}
<PlanGateSection plan={plan} feature="customEmailTemplate" upgradeMessage="El template de email personalizado está disponible desde el plan Professional.">
<div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
<div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
<div className="p-2 bg-blue-500/10 rounded-lg">
<Mail className="w-5 h-5 text-blue-600" />
</div>
<h2 className="text-xl font-bold">{tPortal('sections.email')}</h2>
</div>
<div className="space-y-4">
<div className="space-y-2">
  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Idioma de los correos</label>
  <div className="flex gap-3">
    {[{ value: 'es', label: '🇪🇸 Español' }, { value: 'en', label: '🇺🇸 English' }].map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => setEmailLocale(opt.value)}
        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
          emailLocale === opt.value
            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
  <p className="text-xs text-slate-500 dark:text-zinc-500">Los correos de confirmación, recordatorio, cancelación y encuesta se enviarán en este idioma.</p>
</div>
<div className="space-y-2">
  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Correo de contacto</label>
  <input
    type="email"
    value={contactEmail}
    onChange={e => setContactEmail(e.target.value)}
    placeholder="contacto@tunegocio.com"
    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
  />
  <p className="text-xs text-slate-500 dark:text-zinc-500">Se mostrará en los correos al cliente para que pueda contactarte. Déjalo vacío para ocultarlo.</p>
</div>
<div className="space-y-2">
<label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.emailTitle')}</label>
<textarea
value={emailBodyTemplate}
onChange={e => setEmailBodyTemplate(e.target.value)}
placeholder={tPortal('form.emailPlaceholder')}
className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none text-sm"
/>
</div>
<div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
<p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-widest">{tPortal('form.emailVariables')}</p>
<div className="flex flex-wrap gap-2">
{['{cliente}', '{servicio}', '{fecha}', '{hora}', '{negocio}', '{sucursal}'].map(v => (
<code key={v} className="text-xs bg-white dark:bg-white/5 text-blue-500 px-2 py-1 rounded border border-blue-500/20">{v}</code>
))}
</div>
</div>
</div>
</div>
</PlanGateSection>

          </div>
        )}

        <div className="pt-2">
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Save className="w-5 h-5" />}
            {tPortal('form.save')}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN - LIVE PREVIEW (Desktop only) */}
      <div className={`${activeTab === 'rules' ? 'hidden' : 'hidden xl:flex'} flex-col items-center w-[300px] xl:w-[320px] 2xl:w-[360px] shrink-0 sticky top-8 h-[calc(100vh-8rem)] max-h-[820px]`}>
        <div className="mb-4 flex items-center justify-end w-full px-2">
           <Link href={`/${tenant.slug}`} target="_blank" className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-bold bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full">
              <ExternalLink className="w-3 h-3" /> {tPortal('viewLive')}
           </Link>
        </div>
        
        {/* MOBILE EMULATOR */}
        <div className="w-full h-full max-h-[100%] aspect-[9/19] bg-white border-[10px] sm:border-[12px] border-slate-900 dark:border-[#27272a] rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center" 
             style={{ backgroundColor: theme === 'dark' ? '#09090b' : theme === 'light' ? '#ffffff' : 'var(--background)' }}>
             
             <div className="w-full h-full overflow-y-auto no-scrollbar relative z-10">
               {/* MOCKUP HEADER */}
               <div className={`relative w-full h-[200px] flex flex-col items-center justify-center pb-8 transition-all duration-500 shrink-0 overflow-hidden ${!coverUrl ? (theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100') : ''}`}>
                  {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-0" />

                  <div className="relative z-10 flex flex-col items-center gap-1 mt-2 px-4 text-center">
                    {logoUrl ? (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mb-1">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-lg border border-white/20 mb-1">
                        <span className="text-white font-black text-xl">{name.charAt(0) || 'Z'}</span>
                      </div>
                    )}
                    <h2 className="text-lg font-black tracking-tight text-white drop-shadow-md px-1 leading-tight line-clamp-2">{name || tPortal('mockup.defaultBusiness')}</h2>
                    {heroSubtitle && <p className="text-xs text-zinc-300 leading-tight line-clamp-1 mt-0.5">{heroSubtitle}</p>}
                  </div>
               </div>

               {/* MOCKUP BODY */}
               <div className={`p-4 xl:p-5 space-y-4 flex-1 relative -mt-6 rounded-t-3xl pt-8 flex flex-col min-h-[60%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-white'}`}>
                 <div>
                   <h3 className={`text-sm font-bold tracking-tight mb-4 ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-800'}`}>{tPortal('mockup.selectService')}</h3>
                   
                   <div className="space-y-3">
                     {/* Dummy Service 1 */}
                     <div className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-slate-200'}`} style={{ borderColor: `${primaryColor}80`, backgroundColor: `${primaryColor}10` }}>
                       <div>
                         <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tPortal('mockup.service1')}</h4>
                         <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>{tPortal('mockup.service1Desc')}</p>
                       </div>
                       <div className="font-bold text-sm" style={{ color: primaryColor }}>$25.00</div>
                     </div>

                     {/* Dummy Service 2 */}
                     <div className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                       <div>
                         <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'}`}>{tPortal('mockup.service2')}</h4>
                         <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>{tPortal('mockup.service2Desc')}</p>
                       </div>
                       <div className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'}`}>$15.00</div>
                     </div>
                   </div>
                 </div>

                 <button className="w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center mt-auto mb-2 opacity-90 hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}>
                   {tPortal('mockup.schedule')}
                 </button>
               </div>
             </div>
        </div>
      </div>
    </div>
    </>
  );
}
