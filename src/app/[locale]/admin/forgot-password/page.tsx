"use client";

import { useState } from "react";
import { 
  KeyRound, 
  Mail, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('ForgotPassword');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const result = await forgotPasswordAction(email);

    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: t('successMessage') 
      });
      // MOCK: Para propósitos de desarrollo (borrar luego)
      if (result.token) {
        console.log("DEBUG TOKEN:", result.token);
      }
    } else {
      setMessage({ type: 'error', text: t('errorMessage') });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] dark:bg-black flex flex-col items-center justify-center p-6 selection:bg-purple-100 selection:text-purple-900">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Logo / Icon */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-purple-500/10 dark:bg-purple-500/5 border border-purple-500/20 mb-2">
            <KeyRound className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium">{t('subtitle')}</p>
        </div>

        {message ? (
          <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-500 text-center space-y-4 ${
            message.type === 'success' 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            <div className="flex justify-center">
              {message.type === 'success' ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
            </div>
            <p className="font-bold">{message.text}</p>
            <Link 
              href={`/${locale}/admin/login`}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black tracking-widest text-slate-400 ml-1">{t('emailLabel')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-5 rounded-2xl font-black text-sm tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-slate-900/20 dark:shadow-white/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('submit')}
            </button>

            <div className="text-center">
              <Link 
                href={`/${locale}/admin/login`}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t('backToLogin')}
              </Link>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} ZyncSlot · Seguridad de Grado Industrial
        </div>
      </div>
    </div>
  );
}
