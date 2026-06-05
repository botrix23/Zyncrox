'use client';

import { useState } from 'react';
import { Megaphone, X, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PriceChangePlan {
  plan: string;
  currentPrice: number;
  newPrice: number;
}

interface PriceChangeNotice {
  effectiveDate: string;
  messageEs: string;
  messageEn: string;
  plans: PriceChangePlan[];
}

interface PriceChangeBannerProps {
  notice: PriceChangeNotice;
  locale: string;
}

export default function PriceChangeBanner({ notice, locale }: PriceChangeBannerProps) {
  const t = useTranslations('PriceChangeBanner');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isEn = locale === 'en';
  const message = isEn ? notice.messageEn : notice.messageEs;

  // Format effective date
  const dateObj = new Date(notice.effectiveDate + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString(isEn ? 'en-US' : 'es-SV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-3 shadow-md z-40">
      <div className="max-w-5xl mx-auto flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 bg-white/20 rounded-full">
          <Megaphone className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Message */}
          <p className="text-sm font-medium leading-snug opacity-95">
            {message}
          </p>

          {/* Date + plans row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs font-semibold opacity-80">
              {t('effectiveDate')} <span className="font-black opacity-100">{formattedDate}</span>
            </span>

            {notice.plans.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {notice.plans.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full">
                    <span className="opacity-80">{p.plan}</span>
                    <span className="opacity-60 line-through text-xs">${p.currentPrice}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                    <span className="font-black">${p.newPrice}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          title={t('dismiss')}
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
