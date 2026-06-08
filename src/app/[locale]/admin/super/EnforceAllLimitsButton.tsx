'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { enforceAllTenantsLimitsAction } from '@/app/actions/superAdmin';

export function EnforceAllLimitsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ processed: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await enforceAllTenantsLimitsAction();
        if (res.success) {
          setResult({ processed: res.processed, errors: res.errors });
        }
      } catch (err) {
        setError('Error al ejecutar la acción.');
        console.error(err);
      }
    });
  }

  return (
    <div className="pt-3 border-t border-zinc-100 dark:border-white/5">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
        Aplica los límites del plan actual a todos los tenants activos. Desactiva el exceso de sucursales, especialistas, servicios y admins.
      </p>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aplicando límites...</>
          : <><ShieldCheck className="w-3.5 h-3.5" /> Aplicar límites a todos</>
        }
      </button>

      {result && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            {result.processed} tenant{result.processed !== 1 ? 's' : ''} procesado{result.processed !== 1 ? 's' : ''}
            {result.errors > 0 && ` · ${result.errors} con error`}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
