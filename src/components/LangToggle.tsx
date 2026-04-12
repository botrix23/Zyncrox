"use client"

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  // pathname returned by next/navigation may not include the locale prefix if it's implicitly handled, 
  // but next-intl usually requires using exact matching or next-intl navigation hooks.
  // Instead of using complex path replacements, we can just replace the locale segment directly using window.location for simplicity, or we can use next-intl navigation if set up. 
  // We'll do a simple pathname swap.
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === 'es' ? 'en' : 'es';
    const pathParts = pathname.split('/');
    let newPath = '';
    // pathParts[0] es "", pathParts[1] es el locale (es o en)
    if (pathParts[1] === 'es' || pathParts[1] === 'en') {
      pathParts[1] = nextLocale;
      newPath = pathParts.join('/');
    } else {
      newPath = `/${nextLocale}${pathname === '/' ? '' : pathname}`;
    }
    
    // Forzar recarga completa para Next-intl y override middleware cookie
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    window.location.href = `${newPath}${window.location.search}`;
  };

  return (
    <button
      onClick={toggleLocale}
      className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-bold text-sm tracking-wider transition-all"
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  )
}
