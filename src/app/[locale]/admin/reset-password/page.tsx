"use client";

import { useState, useEffect } from "react";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/auth";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Auth.resetPassword');
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  // Validaciones de Complejidad
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: password === confirmPassword && password !== ""
  };

  const isFormValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setMessage(null);

    const result = await resetPasswordAction(token, password);

    if (result.success) {
      setMessage({ type: 'success', text: t('success') });
      setTimeout(() => {
        router.push(`/${locale}/admin/login`);
      }, 3000);
    } else {
      const errCode = result.error;
      const msgKey = errCode === 'INVALID_TOKEN' ? 'errorInvalidToken' : 'error';
      setMessage({ type: 'error', text: t(msgKey) });
    }
    setIsLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FDFCFD] dark:bg-black flex flex-col items-center justify-center p-6">
        <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-3xl text-center space-y-4 max-w-md">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-2xl font-black">{t('invalidToken')}</h2>
            <p className="text-slate-500">{t('invalidTokenDesc')}</p>
            <button onClick={() => router.push(`/${locale}/admin/forgot-password`)} className="text-sm font-bold text-purple-600 hover:underline">{t('requestNew')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] dark:bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 mb-2">
            <ShieldCheck className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 font-medium">{t('subtitle')}</p>
        </div>

        {message ? (
          <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-500 text-center space-y-4 ${
            message.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/5 border-rose-500/20 text-rose-600'
          }`}>
            <div className="flex justify-center">
              {message.type === 'success' ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
            </div>
            <p className="font-bold">{message.text}</p>
            {message.type === 'success' && <p className="text-xs">{t('redirecting')}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Nueva Contraseña */}
                <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-slate-400 ml-1">{t('newPassword')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            required
                            type={showPassword ? "text" : "password"} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all shadow-sm"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-slate-400 ml-1">{t('confirmPassword')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            required
                            type={showPassword ? "text" : "password"} 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500/50 transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Complexity Indicator Grid */}
            <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/10 space-y-3">
                <p className="text-xs font-black tracking-widest text-slate-400">{t('requirements')}</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.length ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.length')}
                    </div>
                    <div className={`flex items-center gap-1.5 ${checks.upper ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.upper ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.upper')}
                    </div>
                    <div className={`flex items-center gap-1.5 ${checks.lower ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.lower ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.lower')}
                    </div>
                    <div className={`flex items-center gap-1.5 ${checks.number ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.number ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.number')}
                    </div>
                    <div className={`flex items-center gap-1.5 ${checks.special ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.special ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.special')}
                    </div>
                    <div className={`flex items-center gap-1.5 ${checks.match ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {checks.match ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {t('rules.match')}
                    </div>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !isFormValid}
              className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-5 rounded-3xl font-black text-sm tracking-widest hover:opacity-90 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>{t('submit')} <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
