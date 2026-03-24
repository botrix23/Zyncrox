"use client";

import { useState, useRef } from "react";
import { 
  Settings, 
  Truck, 
  Save, 
  Info,
  CheckCircle2,
  AlertCircle,
  Phone,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { updateTenantSettingsAction } from "@/app/actions/tenant";
import { useRouter } from "next/navigation";
import PhoneInput from "@/components/PhoneInput";

export default function SettingsPage({ 
  tenant 
}: { 
  tenant: { 
    id: string; 
    name: string; 
    logoUrl?: string | null;
    whatsappNumber?: string | null;
    homeServiceTerms: string | null; 
    homeServiceTermsEnabled: boolean;
    waMessageTemplate?: string | null;
  } 
}) {
  const [name, setName] = useState(tenant.name);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || '');
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || '');
  const [homeServiceTerms, setHomeServiceTerms] = useState(tenant.homeServiceTerms || '');
  const [homeServiceTermsEnabled, setHomeServiceTermsEnabled] = useState(tenant.homeServiceTermsEnabled);
  const [waMessageTemplate, setWaMessageTemplate] = useState(tenant.waMessageTemplate || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    
    const result = await updateTenantSettingsAction({
      tenantId: tenant.id,
      name,
      logoUrl,
      whatsappNumber,
      homeServiceTerms,
      homeServiceTermsEnabled,
      waMessageTemplate: waMessageTemplate.trim() || null
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    }
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación básica
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor selecciona una imagen.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      setMessage({ type: 'success', text: 'Logo cargado. No olvides guardar los cambios.' });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Negocio</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1">Personaliza el comportamiento de tu plataforma ZyncSlot.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm space-y-10">
        
        {/* Sección: Identidad de Marca */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Settings className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold">Identidad de Marca</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: ZyncSalón Spa"
                  className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">URL del Logo</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={logoUrl.startsWith('data:') ? 'Imagen subida (Base64)' : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    readOnly={logoUrl.startsWith('data:')}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm pr-12"
                  />
                  {logoUrl.startsWith('data:') && (
                    <button 
                      onClick={() => setLogoUrl('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-500 hover:text-purple-400"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Logo del Negocio</label>
               <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center overflow-hidden group">
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="Logo Preview" className="absolute inset-0 w-full h-full object-contain p-4" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold flex items-center gap-2"
                        >
                          <Upload className="w-3 h-3" /> Cambiar Imagen
                        </button>
                      </div>
                    </>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 text-slate-400 hover:text-purple-500 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-medium">Click para subir logo</p>
                      <p className="text-[10px]">Recomendado: 512x512px (PNG/JPG)</p>
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                    accept="image/*"
                  />
               </div>
            </div>
          </div>
        </div>

        {/* Sección: Servicio a Domicilio y WhatsApp */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold">Servicio a Domicilio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Teléfono</label>
              <div className="relative">
                <PhoneInput 
                  value={whatsappNumber}
                  onChange={val => setWhatsappNumber(val)}
                  placeholder="Teléfono del negocio"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Términos y Condiciones</label>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 h-[58px]">
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Obligatorio al reservar a domicilio</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={homeServiceTermsEnabled} 
                    onChange={(e) => setHomeServiceTermsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {homeServiceTermsEnabled && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 group flex items-center gap-2">
                Contenido de Términos
                <span title="Estos términos se mostrarán al cliente cuando elija servicio a domicilio.">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                </span>
              </label>
              <textarea 
                value={homeServiceTerms}
                onChange={(e) => setHomeServiceTerms(e.target.value)}
                placeholder="Ej: El costo de domicilio varía según la zona. El pago se realiza al finalizar el servicio..."
                className="w-full min-h-[120px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Sección: Template de WhatsApp */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Phone className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold">Personalización de WhatsApp</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Template del Mensaje (Domicilio)</label>
              <textarea 
                value={waMessageTemplate}
                onChange={(e) => setWaMessageTemplate(e.target.value)}
                placeholder="¡Hola! Me gustaría confirmar mi cita para {servicio}..."
                className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none text-sm font-mono"
              />
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                <Info className="w-3 h-3" /> Guía de Variables
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['{servicio}', '{fecha}', '{hora}', '{cliente}', '{telefono}'].map(v => (
                  <code key={v} className="text-[10px] bg-purple-500/10 text-purple-400 p-1 rounded text-center">{v}</code>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-zinc-400 mb-2 uppercase">Emojis rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {['📍', '📅', '⏰', '👤', '📞', '✨', '✂️', '💅', '✅'].map(emoji => (
                    <button 
                      key={emoji}
                      type="button"
                      onClick={() => setWaMessageTemplate(prev => prev + emoji)}
                      className="p-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:border-purple-500 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-4 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Save className="w-5 h-5" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
