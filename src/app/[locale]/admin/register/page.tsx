"use client";

import React, { useState, useMemo } from 'react';
import { Building, User, Mail, Lock, ChevronRight, Calendar, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LangToggle } from '@/components/LangToggle';
import { useTranslations } from 'next-intl';
import { registerTenantAction } from '@/app/actions/auth';

// ── Estándares NIST 800-63B + OWASP ─────────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'length',    label: 'Mínimo 8 caracteres',                   test: (p: string) => p.length >= 8 },
  { id: 'upper',     label: 'Al menos una mayúscula (A-Z)',           test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'Al menos una minúscula (a-z)',           test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'Al menos un número (0-9)',               test: (p: string) => /[0-9]/.test(p) },
  { id: 'special',   label: 'Al menos un carácter especial (!@#$...)',test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

type StrengthLevel = { label: string; color: string; bars: number };
const STRENGTH_LEVELS: StrengthLevel[] = [
  { label: 'Muy débil',  color: 'bg-rose-500',   bars: 1 },
  { label: 'Débil',      color: 'bg-orange-500',  bars: 2 },
  { label: 'Regular',    color: 'bg-amber-400',   bars: 3 },
  { label: 'Fuerte',     color: 'bg-emerald-500', bars: 4 },
  { label: 'Muy fuerte', color: 'bg-emerald-400', bars: 5 },
];

function getStrength(password: string): StrengthLevel {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (!password) return STRENGTH_LEVELS[0];
  const idx = Math.min(Math.max(passed - 1, 0), STRENGTH_LEVELS.length - 1);
  return STRENGTH_LEVELS[idx];
}

export default function RegisterPage() {
  const t = useTranslations('Register');

  const [businessName, setBusinessName] = useState('');
  const [adminName,    setAdminName]    = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [touched,      setTouched]      = useState(false); // Mostrar errores de contraseña solo si ya escribió

  const ruleResults  = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) })), [password]);
  const allPassed    = ruleResults.every(r => r.passed);
  const strength     = getStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!allPassed) return;

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('businessName', businessName);
    formData.append('adminName', adminName);
    formData.append('email', email);
    formData.append('password', password);

    const locale = window.location.pathname.split('/')[1] || 'es';
    const result = await registerTenantAction(formData, locale);

    if (result.success) {
      window.location.href = `/${locale}/admin`;
    } else {
      setError(result.error || 'Error al registrar');
      setIsLoading(false);
    }
  };

  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'es' : 'es';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="z-10 w-full max-w-lg">
        <div className="absolute top-8 right-8 flex gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl shadow-xl shadow-purple-500/20 mb-4">
            <Calendar className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">ZyncSlot</h1>
          <p className="text-slate-500 dark:text-zinc-500 font-medium mt-2">La nueva era de las reservas</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{t('title')}</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nombre del negocio + Nombre del admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-500 tracking-widest ml-1">{t('businessName')}</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder={t('businessNamePlaceholder')}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-purple-500/50 rounded-2xl py-3 pl-11 pr-4 text-slate-900 dark:text-white outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-500 tracking-widest ml-1">{t('adminName')}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder={t('adminNamePlaceholder')}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-purple-500/50 rounded-2xl py-3 pl-11 pr-4 text-slate-900 dark:text-white outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-500 tracking-widest ml-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-purple-500/50 rounded-2xl py-3 pl-11 pr-4 text-slate-900 dark:text-white outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Contraseña con show/hide + strength meter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-500 tracking-widest ml-1">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setTouched(true); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-purple-500/50 rounded-2xl py-3 pl-11 pr-12 text-slate-900 dark:text-white outline-none transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar (visible solo cuando el usuario escribe) */}
              {touched && password.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  {/* Barra de fortaleza */}
                  <div className="flex gap-1 h-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          i < strength.bars ? strength.color : 'bg-slate-200 dark:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-bold ${strength.bars >= 4 ? 'text-emerald-500' : strength.bars >= 3 ? 'text-amber-500' : 'text-rose-400'}`}>
                    {strength.label}
                  </p>

                  {/* Checklist de requisitos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                    {ruleResults.map(r => (
                      <div key={r.id} className={`flex items-center gap-1.5 text-xs transition-colors ${r.passed ? 'text-emerald-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                        {r.passed
                          ? <Check className="w-3.5 h-3.5 shrink-0" />
                          : <X className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-zinc-600" />
                        }
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error general */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || (touched && !allPassed)}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 transition-all mt-2"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('submit')}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 dark:text-zinc-500 text-sm">
          {t('hasAccount')}{' '}
          <a href={`/${locale}/admin/login`} className="text-purple-600 font-bold hover:underline">
            {t('login')}
          </a>
        </p>
      </div>
    </div>
  );
}
