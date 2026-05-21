"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { changePasswordAction } from "@/app/actions/changePassword";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";

export default function ChangePasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('ChangePassword');
  const searchParams = useSearchParams();
  // forced=1 cuando viene del redirect por mustChangePassword (no se pide contraseña actual)
  const isForced = searchParams.get('forced') === '1';
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await changePasswordAction(
      newPassword,
      confirmPassword,
      isForced ? undefined : currentPassword
    );

    if (result.success) {
      window.location.href = `/${locale}/admin/bookings`;
    } else {
      const code = (result as any).errorCode as string | undefined;
      setError(code ? t(code as any) : t('error'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] p-10 shadow-2xl space-y-8">
          {!isForced && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver
            </button>
          )}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t('title')}</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contraseña actual — solo si NO es cambio forzado */}
            {!isForced && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('currentPassword')}</label>
                <div className="relative">
                  <input
                    required
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full p-4 pr-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('newPassword')}</label>
              <div className="relative">
                <input
                  required
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('confirmPassword')}</label>
              <div className="relative">
                <input
                  required
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-1.5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('requirements')}</p>
              {[
                { key: "length",  ok: newPassword.length >= 8 },
                { key: "upper",   ok: /[A-Z]/.test(newPassword) },
                { key: "lower",   ok: /[a-z]/.test(newPassword) },
                { key: "number",  ok: /[0-9]/.test(newPassword) },
                { key: "special", ok: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
              ].map(req => (
                <div key={req.key} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${req.ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'}`} />
                  <span className={`text-xs font-medium ${req.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {t(`rules.${req.key}` as any)}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-rose-500 font-semibold text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  {t('submit')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
