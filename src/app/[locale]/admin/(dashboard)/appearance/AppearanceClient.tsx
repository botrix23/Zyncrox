"use client";

import { useState, useRef, useEffect } from "react";
import {
  Palette, CheckCircle2, AlertCircle, Save, Eye, Monitor, Moon, Sun,
  MonitorSmartphone, ExternalLink, Instagram, Facebook, Music, Building2,
  ImageIcon, Share2, Copy, Trash2, Mail, LayoutTemplate,
} from "lucide-react";
import { updateAppearanceAction } from "@/app/actions/tenant";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlanGateSection } from "@/components/PlanGate";
import { canUseFeature } from "@/core/plans";

export default function AppearanceClient({
  tenant,
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
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    contactEmail?: string | null;
    showStaffSelection?: boolean;
    bookingSettings?: {
      footerText?: string;
      step1Title?: string;
      step2Title?: string;
      step3Title?: string;
      step4Title?: string;
      [key: string]: any;
    };
  };
}) {
  const t = useTranslations('Dashboard');
  const tPortal = useTranslations('Dashboard.portal');
  const tWidget = useTranslations('BookingWidget');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Visual identity ────────────────────────────────────────────────────────
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
  const [contactEmail, setContactEmail] = useState(tenant.contactEmail || "");
  const [footerText, setFooterText] = useState(tenant.bookingSettings?.footerText || "");

  // ── Widget config ──────────────────────────────────────────────────────────
  const [step1Title, setStep1Title] = useState(tenant.bookingSettings?.step1Title || "");
  const [step2Title, setStep2Title] = useState(tenant.bookingSettings?.step2Title || "");
  const [step3Title, setStep3Title] = useState(tenant.bookingSettings?.step3Title || "");
  const [step4Title, setStep4Title] = useState(tenant.bookingSettings?.step4Title || "");
  const [bulkModeTitle, setBulkModeTitle] = useState(tenant.bookingSettings?.bulkModeTitle || "");
  const [bulkModeDesc, setBulkModeDesc] = useState(tenant.bookingSettings?.bulkModeDesc || "");
  const [separateModeTitle, setSeparateModeTitle] = useState(tenant.bookingSettings?.separateModeTitle || "");
  const [separateModeDesc, setSeparateModeDesc] = useState(tenant.bookingSettings?.separateModeDesc || "");

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

    const result = await updateAppearanceAction({
      tenantId: tenant.id,
      name,
      primaryColor,
      theme,
      coverUrl: coverUrl || null,
      logoUrl: logoUrl || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      tiktokUrl: tiktokUrl || null,
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      contactEmail: contactEmail || null,
      showStaffSelection: tenant.showStaffSelection ?? true,
      bookingSettings: {
        ...tenant.bookingSettings,
        footerText,
        step1Title: step1Title || undefined,
        step2Title: step2Title || undefined,
        step3Title: step3Title || undefined,
        step4Title: step4Title || undefined,
        bulkModeTitle: bulkModeTitle || undefined,
        bulkModeDesc: bulkModeDesc || undefined,
        separateModeTitle: separateModeTitle || undefined,
        separateModeDesc: separateModeDesc || undefined,
      },
    });

    if (result.success) {
      setMessage({ type: 'success', text: tPortal('successSave') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: tPortal('errorSave') });
    }
    setIsLoading(false);
  };

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
      setMessage({ type: 'error', text: tPortal('errorUpload') });
    }
  };

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-8rem)] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* LEFT COLUMN - CONTROLS */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 flex flex-col gap-6 min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{tPortal('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{tPortal('subtitle')}</p>
        </div>

        {/* Status message */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
            message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{message.text}</p>
          </div>
        )}

        {/* ── Sección: Identidad visual ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Public link */}
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

          {/* Identidad visual card */}
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

              {/* Hero subtitle */}
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

              {/* Contact email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{tPortal('form.contactEmailLabel')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="contacto@tunegocio.com"
                    className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{tPortal('form.contactEmailHint')}</p>
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Instagram className="w-4 h-4" /></div>
                  <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder={tPortal('form.instagram')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Facebook className="w-4 h-4" /></div>
                  <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder={tPortal('form.facebook')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Music className="w-4 h-4" /></div>
                  <input type="url" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder={tPortal('form.tiktok')} className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Theme */}
          <PlanGateSection plan={plan} feature="customTheme" upgradeMessage="La selección de tema claro/oscuro está disponible desde el plan Professional.">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-1.5 bg-purple-500/10 rounded-lg"><Monitor className="w-4 h-4 text-purple-600" /></div>
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

          {/* Color primario */}
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

        {/* ── Sección: Configuración del widget ──────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <LayoutTemplate className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tPortal('sections.widgetConfig')}</h2>
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
                  <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center shrink-0">{num}</span>
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

          {/* Scheduling mode labels — Professional+ */}
          <PlanGateSection plan={plan} feature="customSchedulingModeLabels" upgradeMessage="La personalización de los textos de modo de agendamiento está disponible desde el plan Profesional.">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">Textos de modos de agendamiento</label>
                <p className="text-xs text-slate-400 dark:text-zinc-500">Personaliza los títulos y descripciones que ve el cliente al elegir entre "Todo seguido" y "En días distintos".</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Todo seguido</p>
                <input
                  type="text"
                  value={bulkModeTitle}
                  onChange={e => setBulkModeTitle(e.target.value)}
                  placeholder="Todo seguido (Recomendado)"
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={bulkModeDesc}
                  onChange={e => setBulkModeDesc(e.target.value)}
                  placeholder="Reserva todo en una sola sesión continua, uno tras otro."
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">En días u horas distintas</p>
                <input
                  type="text"
                  value={separateModeTitle}
                  onChange={e => setSeparateModeTitle(e.target.value)}
                  placeholder="En días u horas distintas"
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={separateModeDesc}
                  onChange={e => setSeparateModeDesc(e.target.value)}
                  placeholder="Elige una fecha y horario diferente para cada reserva por separado."
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </PlanGateSection>
        </div>

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
      <div className="hidden xl:flex flex-col items-center w-[300px] xl:w-[320px] 2xl:w-[360px] shrink-0 sticky top-8 h-[calc(100vh-8rem)] max-h-[820px]">
        <div className="mb-4 flex items-center justify-end w-full px-2">
          <Link href={`/${tenant.slug}`} target="_blank" className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-bold bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full">
            <ExternalLink className="w-3 h-3" /> {tPortal('viewLive')}
          </Link>
        </div>

        {/* MOBILE EMULATOR */}
        <div className="w-full h-full max-h-[100%] aspect-[9/19] bg-white border-[10px] sm:border-[12px] border-slate-900 dark:border-[#27272a] rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center"
          style={{ backgroundColor: theme === 'dark' ? '#09090b' : theme === 'light' ? '#ffffff' : 'var(--background)' }}>
          <div className="w-full h-full overflow-y-auto no-scrollbar relative z-10">
            {/* Header */}
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

            {/* Body */}
            <div className={`p-4 xl:p-5 space-y-4 flex-1 relative -mt-6 rounded-t-3xl pt-8 flex flex-col min-h-[60%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-white'}`}>
              <div>
                <h3 className={`text-sm font-bold tracking-tight mb-4 ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-800'}`}>{tPortal('mockup.selectService')}</h3>
                <div className="space-y-3">
                  <div className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-slate-200'}`} style={{ borderColor: `${primaryColor}80`, backgroundColor: `${primaryColor}10` }}>
                    <div>
                      <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tPortal('mockup.service1')}</h4>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>{tPortal('mockup.service1Desc')}</p>
                    </div>
                    <div className="font-bold text-sm" style={{ color: primaryColor }}>$25.00</div>
                  </div>
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
  );
}
