'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullUrl = typeof window !== 'undefined'
      ? window.location.origin + url
      : url;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
    >
      {copied
        ? <Check className="w-4 h-4 text-emerald-500" />
        : <Copy className="w-4 h-4" />
      }
      {copied ? 'Enlace copiado' : 'Copiar enlace'}
    </button>
  );
}
