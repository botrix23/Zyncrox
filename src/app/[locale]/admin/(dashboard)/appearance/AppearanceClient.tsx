"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Palette, CheckCircle2, AlertCircle, Upload, Save, Eye, MonitorSmartphone, Monitor, Moon, Sun, MonitorCheck, LayoutTemplate, Link as LinkIcon, ExternalLink, Instagram, Facebook, Music, Building2, ImageIcon, Truck, Info, Phone, Settings, Share2, Copy
} from "lucide-react";
import { updatePortalSettingsAction } from "@/app/actions/tenant";
import { 
  getCoverageZonesAction, 
  createCoverageZoneAction, 
  updateCoverageZoneAction, 
  deleteCoverageZoneAction 
} from "@/app/actions/zones";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PhoneInput from "@/components/PhoneInput";

export default function AppearanceClient({
  tenant
}: {
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
  },
  initialZones: any[];
}) {
  const t = useTranslations('Dashboard');
  const tPortal = useTranslations('Dashboard.portal');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'design' | 'rules'>('design');
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
  
  // Operación y Reglas (Lógico)
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || "");
  const [allowsHomeService, setAllowsHomeService] = useState(tenant.allowsHomeService ?? true);
  const [homeServiceTermsEnabled, setHomeServiceTermsEnabled] = useState(tenant.homeServiceTermsEnabled || false);
  const [homeServiceTerms, setHomeServiceTerms] = useState(tenant.homeServiceTerms || "");
  const [waMessageTemplate, setWaMessageTemplate] = useState(tenant.waMessageTemplate || "");
  const [homeServiceLeadDays, setHomeServiceLeadDays] = useState(tenant.homeServiceLeadDays || 7);
  
  // Zonas de Cobertura
  const [zones, setZones] = useState<any[]>(initialZones || []);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', fee: '0', description: '' });

  const PRESET_COLORS = [
    { name: 'Púrpura', value: '#9333ea' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Esmeralda', value: '#10b981' },
    { name: 'Rosa', value: '#e11d48' },
    { name: 'Ámbar', value: '#d97706' },
    { name: 'Pizarra', value: '#475569' },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      allowsHomeService,
      homeServiceTermsEnabled,
      homeServiceTerms,
      waMessageTemplate,
      homeServiceLeadDays
    });

    if (result.success) {
      setMessage({ type: 'success', text: "Portal actualizado correctamente" });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: "Error al guardar la configuración" });
    }
    setIsLoading(false);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: "El archivo de portada debe ser imagen" });
      return;
    }

    setIsUploadingCover(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCoverUrl(base64);
      setMessage({ type: 'success', text: "Portada cargada. Recuerda Guardar." });
      setIsUploadingCover(false);
    };
    reader.onerror = () => setIsUploadingCover(false);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: "El archivo del logo debe ser imagen" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      setMessage({ type: 'success', text: "Logo cargado. Recuerda Guardar." });
    };
    reader.readAsDataURL(file);
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
      setMessage({ type: 'success', text: "Zona añadida" });
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("¿Eliminar esta zona?")) return;
    const res = await deleteCoverageZoneAction(id);
    if (res.success) {
      setZones(zones.filter(z => z.id !== id));
      setMessage({ type: 'success', text: "Zona eliminada" });
    }
  };

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-8rem)] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* LEFT COLUMN - CONTROLS */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 flex flex-col gap-6 min-w-[320px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Mi Portal Web</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Configura la Identidad y Reglas de tu sitio público de reservas.</p>
        </div>

        {/* COMPONENTE DE TABS */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
           <button 
             onClick={() => setActiveTab('design')} 
             className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'design' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-zinc-300'}`}
           >
             <Palette className="w-4 h-4" /> Diseño y Marca
           </button>
           <button 
             onClick={() => setActiveTab('rules')} 
             className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'rules' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-zinc-300'}`}
           >
             <Settings className="w-4 h-4" /> Operación y Reglas
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


        {/* CONTENIDO TAB 1: Diseño y Marca */}
        {activeTab === 'design' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            {/* TARJETA DE ENLACE PÚBLICO (INTEGRADA) */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg overflow-hidden relative group border border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Share2 className="w-16 h-16" />
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="text-md font-bold tracking-tight flex items-center gap-2">
                    Enlace de tu Portal
                    <span className="px-2 py-0.5 bg-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">Online</span>
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
                      setMessage({ text: "¡Copiado!", type: 'success' });
                      setTimeout(() => setMessage(null), 2000);
                    }}
                    className="px-3 py-1.5 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all active:scale-95 font-bold text-[10px]"
                  >
                    COPIAR
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Identidad y Redes</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Nombre Comercial</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. ZyncSalón Spa"
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Logo del Negocio</label>
                   <div className="flex items-center gap-4">
                     {logoUrl ? (
                        <div className="relative group w-20 h-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white flex items-center justify-center overflow-hidden shrink-0">
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button onClick={() => setLogoUrl('')} className="text-white hover:text-rose-400 p-1">
                               <Upload className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                     ) : (
                        <button onClick={() => logoInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-purple-500 transition-all shrink-0">
                           <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                           <span className="text-[9px] font-bold">SUBIR</span>
                        </button>
                     )}
                     <div className="flex-1">
                        <input type="text" value={logoUrl.startsWith('data:') ? 'Imagen cargada localmente' : logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://ejemplo.com/logo.png" readOnly={logoUrl.startsWith('data:')} className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                     </div>
                     <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                   </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Redes Sociales</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Instagram className="w-4 h-4" />
                     </div>
                     <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="Instagram URL" className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Facebook className="w-4 h-4" />
                     </div>
                     <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder="Facebook URL" className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Music className="w-4 h-4" />
                     </div>
                     <input type="url" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder="TikTok URL" className="w-full pl-10 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Estilos Automáticos y Tema */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Monitor className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tema del Portal</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-black/20 p-2 rounded-2xl border border-slate-200 dark:border-white/5">
                <button type="button" onClick={() => setTheme('light')} className={`py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-white dark:bg-zinc-800 text-purple-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  <Sun className="w-5 h-5"/> Claro
                </button>
                <button type="button" onClick={() => setTheme('dark')} className={`py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-zinc-800 text-purple-400 shadow-md transform scale-[1.02] border border-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  <Moon className="w-5 h-5"/> Oscuro
                </button>
              </div>
            </div>

            {/* Imagen de Portada (Cover) */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Imagen de Portada (Cover)</h2>
              </div>

              <div 
                onClick={() => coverInputRef.current?.click()}
                className={`w-full h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${coverUrl ? 'border-transparent bg-black/5' : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10'}`}
              >
                <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                
                {isUploadingCover ? (
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                     <p className="font-bold text-purple-600 text-sm">Subiendo...</p>
                   </div>
                ) : coverUrl ? (
                   <>
                     <img src={coverUrl} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover group-hover:blur-sm transition-all" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                       <Upload className="w-8 h-8 text-white mb-2" />
                       <span className="text-white font-bold">Reemplazar Portada</span>
                     </div>
                   </>
                ) : (
                   <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-purple-600 transition-colors">
                     <Upload className="w-10 h-10 mb-2" />
                     <span className="font-bold">Sube una imagen de portada</span>
                     <span className="text-xs opacity-70">Recomendado: 1200x500px, máx 2MB</span>
                   </div>
                )}
              </div>
              {coverUrl && (
                <div className="flex justify-end">
                  <button onClick={() => setCoverUrl('')} className="text-sm font-bold text-rose-500 hover:underline">Eliminar portada actual</button>
                </div>
              )}
            </div>

            {/* Identidad de Color */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 bg-purple-500/10 rounded-lg"><Palette className="w-5 h-5 text-purple-600" /></div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Color Primario</h2>
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                {PRESET_COLORS.map(c => (
                  <button 
                    key={c.value} type="button" onClick={() => setPrimaryColor(c.value)}
                    className={`w-10 h-10 rounded-full border-[3px] transition-all hover:scale-110 shadow-sm ${primaryColor.toLowerCase() === c.value ? 'border-slate-800 dark:border-white scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }} title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0 bg-transparent" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value.toUpperCase())} className="flex-1 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-mono font-bold uppercase" />
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 2: Operación y Reglas */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            {/* Servicio a Domicilio y Contacto */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Truck className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold">{tPortal('sections.homeService')}</h2>
              </div>

              {/* Teléfono General */}
              <div className="space-y-2">
                 <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.phone')}</label>
                 <PhoneInput value={whatsappNumber || ""} onChange={val => setWhatsappNumber(val)} placeholder="Teléfono del negocio" />
              </div>

              {/* Master Switch: Domicilio */}
              <div className="space-y-2">
                 <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Ofrecer Servicio a Domicilio</label>
                 <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 h-[64px]">
                    <div className="pr-4">
                       <p className="text-sm font-medium text-slate-900 dark:text-white">Permitir a los clientes elegir la modalidad "A mi domicilio"</p>
                       <p className="text-xs text-slate-500">Si se desactiva, el portal solo mostrará agendamiento en Sucursal.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" checked={allowsHomeService} onChange={e => setAllowsHomeService(e.target.checked)} className="sr-only peer" />
                       <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                 </div>
              </div>

              {/* Reglas de Domicilio (solo si maestro activo) */}
              {allowsHomeService && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 border-l-2 border-purple-500 pl-4 ml-2">
                   <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.terms')}</label>
                     <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 h-[58px]">
                       <div className="pr-4">
                         <p className="text-sm font-medium text-slate-900 dark:text-white">{tPortal('form.termsRequired')}</p>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" checked={homeServiceTermsEnabled} onChange={(e) => setHomeServiceTermsEnabled(e.target.checked)} className="sr-only peer" />
                         <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                       </label>
                     </div>
                   </div>
                   
                   {homeServiceTermsEnabled && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                          {tPortal('form.termsContent')} <span title="Estas políticas de costo, distancia y tiempos se mostrarán al agendar."><Info className="w-3.5 h-3.5 text-zinc-500" /></span>
                        </label>
                        <textarea value={homeServiceTerms} onChange={e => setHomeServiceTerms(e.target.value)} placeholder={tPortal('form.termsPlaceholder')} className="w-full min-h-[120px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none text-sm" />
                      </div>
                   )}
                </div>
              )}
            </div>

            {/* Template WhatsApp */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold">{tPortal('sections.whatsapp')}</h2>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">{tPortal('form.waTemplate')}</label>
                   <textarea value={waMessageTemplate} onChange={e => setWaMessageTemplate(e.target.value)} placeholder="Ejemplo: ¡Hola! Confirmo mi cita para {servicio} el {fecha} a las {hora}. Mi nombre es {cliente} y mi número es {telefono}." className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none text-sm font-mono" />
                 </div>
                 <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-purple-500 tracking-widest"><Info className="w-3 h-3" /> {tPortal('form.variablesGuide')}</div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {['{servicio}', '{fecha}', '{hora}', '{cliente}', '{telefono}'].map(v => (
                       <code key={v} className="text-[10px] bg-purple-500/10 text-purple-400 p-1 rounded text-center">{v}</code>
                     ))}
                   </div>
                   <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                     <p className="text-[10px] font-bold text-zinc-400 mb-2">{tPortal('form.quickEmojis')}</p>
                     <div className="flex flex-wrap gap-2">
                       {['📍', '📅', '⏰', '👤', '📞', '✨', '✂️', '💅', '✅'].map(emoji => (
                         <button key={emoji} type="button" onClick={() => setWaMessageTemplate(prev => prev + emoji)} className="p-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:border-purple-500 transition-all">{emoji}</button>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Save className="w-5 h-5" />}
            Guardar Configuración
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN - LIVE PREVIEW (Desktop only) */}
      <div className={`${activeTab === 'rules' ? 'hidden' : 'hidden xl:flex'} flex-col items-center w-[300px] xl:w-[320px] 2xl:w-[360px] shrink-0 sticky top-8 h-[calc(100vh-8rem)] max-h-[820px]`}>
        <div className="mb-4 flex items-center justify-between w-full px-2">
           <h3 className="font-bold text-slate-400 flex items-center gap-2 text-sm tracking-widest uppercase"><Eye className="w-4 h-4"/> Live Preview</h3>
           <Link href={`/${tenant.slug}`} target="_blank" className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-bold bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full">
              <ExternalLink className="w-3 h-3" /> Ver Real
           </Link>
        </div>
        
        {/* MOBILE EMULATOR */}
        <div className="w-full h-full max-h-[100%] aspect-[9/19] bg-white border-[10px] sm:border-[12px] border-slate-900 dark:border-[#27272a] rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center" 
             style={{ backgroundColor: theme === 'dark' ? '#09090b' : theme === 'light' ? '#ffffff' : 'var(--background)' }}>
             
             <div className="w-full h-full overflow-y-auto no-scrollbar relative z-10">
               {/* MOCKUP HEADER */}
               <div className={`relative w-full h-[180px] ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} flex flex-col items-center justify-center pb-8 transition-all duration-500 shrink-0`}>
                  {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay" /> }
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-2 mt-2 px-4 text-center">
                    {logoUrl ? (
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg border border-white/20 p-1 mb-1">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-lg border border-white/20 mb-1">
                        <span className="text-white font-black text-2xl">{name.charAt(0) || 'Z'}</span>
                      </div>
                    )}

                    {/* Logística Pro: Anticipación y Zonas */}
                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5">
                      <div className="space-y-2">
                         <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Anticipación requerida (Días)</label>
                         <div className="flex items-center gap-4">
                            <input 
                              type="number" 
                              min="0"
                              max="90"
                              value={homeServiceLeadDays}
                              onChange={e => setHomeServiceLeadDays(parseInt(e.target.value))}
                              className="w-24 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-black text-center"
                            />
                            <p className="text-xs text-slate-500 italic flex-1">Tiempo mínimo requerido para organizar la logística del traslado.</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Zonas de Cobertura y Tarifas</label>
                            <button 
                              type="button"
                              onClick={() => setIsAddingZone(true)}
                              className="px-4 py-2 bg-purple-500/10 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all active:scale-95"
                            >
                              + Añadir Zona
                            </button>
                         </div>

                         {isAddingZone && (
                           <div className="p-5 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/20 rounded-3xl space-y-4 animate-in zoom-in-95 duration-200">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="col-span-2 sm:col-span-1">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre Zona</label>
                                   <input 
                                     placeholder="Ej. Santa Tecla" 
                                     value={newZone.name}
                                     onChange={e => setNewZone({...newZone, name: e.target.value})}
                                     className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold" 
                                   />
                                 </div>
                                 <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tarifa Extra</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">$</span>
                                      <input 
                                        type="number"
                                        placeholder="0.00" 
                                        value={newZone.fee}
                                        onChange={e => setNewZone({...newZone, fee: e.target.value})}
                                        className="w-full p-3 pl-8 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black" 
                                      />
                                    </div>
                                 </div>
                              </div>
                              <div className="flex justify-end gap-3 pt-2">
                                 <button type="button" onClick={() => setIsAddingZone(false)} className="text-xs font-bold text-slate-500">CANCELAR</button>
                                 <button type="button" onClick={handleAddZone} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 transition-all">CREAR</button>
                              </div>
                           </div>
                         )}

                         <div className="flex flex-col gap-2">
                            {zones.map(zone => (
                              <div key={zone.id} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 group hover:border-purple-500/50 transition-all">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                      <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 dark:text-white">{zone.name}</p>
                                       <p className="text-[10px] text-emerald-600 font-bold tracking-tight">+${zone.fee} Tarifa traslado</p>
                                    </div>
                                 </div>
                                 <button 
                                   type="button"
                                   onClick={() => handleDeleteZone(zone.id)}
                                   className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                 >
                                    <Save className="w-4 h-4 rotate-45" />
                                 </button>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white drop-shadow-md px-1 leading-tight">{name || 'Mi Negocio'}</h2>
                  </div>
               </div>

               {/* MOCKUP BODY */}
               <div className={`p-4 xl:p-5 space-y-4 flex-1 relative -mt-6 rounded-t-3xl pt-8 flex flex-col min-h-[60%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-white'}`}>
                 <div>
                   <h3 className={`text-sm font-bold tracking-tight mb-4 ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-800'}`}>Selecciona un servicio</h3>
                   
                   <div className="space-y-3">
                     {/* Dummy Service 1 */}
                     <div className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-slate-200'}`} style={{ borderColor: `${primaryColor}80`, backgroundColor: `${primaryColor}10` }}>
                       <div>
                         <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Corte de Cabello</h4>
                         <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>45 min</p>
                       </div>
                       <div className="font-bold text-sm" style={{ color: primaryColor }}>$25.00</div>
                     </div>

                     {/* Dummy Service 2 */}
                     <div className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                       <div>
                         <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'}`}>Arreglo de Barba</h4>
                         <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>20 min</p>
                       </div>
                       <div className={`font-bold text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'}`}>$15.00</div>
                     </div>
                   </div>
                 </div>

                 <button className="w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center mt-auto mb-2 opacity-90 hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}>
                   Agendar Cita
                 </button>
               </div>
             </div>
        </div>
      </div>
    </div>
  );
}
