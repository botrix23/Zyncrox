"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const nextLocale = locale === "es" ? "en" : "es";
    // Guardar preferencia en cookie (1 año) para que el middleware la respete
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    startTransition(() => {
      router.replace(newPath);
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      aria-label={locale === "es" ? "Switch to English" : "Cambiar a Español"}
      className={`flex items-center gap-1.5 text-[13px] font-semibold px-3 py-[7px] rounded-lg border transition-all duration-150 whitespace-nowrap
        border-black/[0.13] dark:border-white/[0.13]
        text-slate-500 dark:text-zinc-400
        hover:text-slate-900 dark:hover:text-white
        hover:border-purple-500/40 hover:bg-purple-500/[0.06]
        ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      <span className="text-[14px]">{locale === "es" ? "🇺🇸" : "🇦🇷"}</span>
      <span>{locale === "es" ? "EN" : "ES"}</span>
    </button>
  );
}
