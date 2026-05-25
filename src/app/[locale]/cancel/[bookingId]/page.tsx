import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyCancelToken } from "@/lib/cancelToken";
import { formatEmailDate, formatEmailTime } from "@/lib/emailI18n";
import { getTranslations } from "next-intl/server";

interface CancelPageProps {
  params: { locale: string; bookingId: string };
  searchParams: { token?: string; action?: string };
}

export default async function CancelBookingPage({ params, searchParams }: CancelPageProps) {
  const { locale, bookingId } = params;
  const token = searchParams.token || '';
  const action = searchParams.action; // 'keep' | 'cancel'
  const t = await getTranslations('CancelBooking');

  // Verify the HMAC token
  if (!token || !verifyCancelToken(bookingId, token)) {
    return <InfoPage emoji="⚠️" title={t('invalidToken')} desc={t('invalidTokenDesc')} />;
  }

  // Fetch the booking
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { service: true, branch: true, staff: true, tenant: true },
  });

  if (!booking) {
    return <InfoPage emoji="🔍" title={t('notFound')} desc={t('notFoundDesc')} />;
  }

  if (booking.status === 'CANCELLED') {
    return <InfoPage emoji="✅" title={t('alreadyCancelled')} desc={t('alreadyCancelledDesc')} />;
  }

  if (booking.status === 'FINALIZADA') {
    return <InfoPage emoji="✅" title={t('alreadyFinished')} desc={t('alreadyFinishedDesc')} />;
  }

  const tenantName = (booking.tenant as any)?.name || '';

  // User chose to keep the appointment
  if (action === 'keep') {
    return <InfoPage emoji="🎉" title={t('keptTitle')} desc={t('keptDesc')} />;
  }

  // User chose to cancel
  if (action === 'cancel') {
    await db.update(bookings)
      .set({ status: 'CANCELLED' })
      .where(eq(bookings.id, bookingId));

    return (
      <InfoPage
        emoji="🗑️"
        title={t('cancelledTitle')}
        desc={t('cancelledDesc', { tenantName })}
      />
    );
  }

  // Default: show confirmation page
  const localeKey = (locale === 'en' ? 'en' : 'es') as 'es' | 'en';
  const dateStr = formatEmailDate(booking.startTime, localeKey);
  const timeStr = formatEmailTime(booking.startTime);
  const tenantLogo = (booking.tenant as any)?.logoUrl || null;
  const staffName = (booking.staff as any)?.name || null;
  const branchName = (booking.branch as any)?.name || '';
  const serviceName = (booking.service as any)?.name || '';

  const keepUrl = `/${locale}/cancel/${bookingId}?token=${token}&action=keep`;
  const cancelUrl = `/${locale}/cancel/${bookingId}?token=${token}&action=cancel`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-white/5">
        {tenantLogo && (
          <div className="flex justify-center">
            <img src={tenantLogo} alt={tenantName} className="h-10 object-contain" />
          </div>
        )}

        <div className="text-center space-y-1">
          <div className="text-4xl">📅</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {t('question')}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            {t('questionSub')}
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2 border border-slate-100 dark:border-white/5">
          <DetailRow label={t('service')} value={serviceName} />
          <DetailRow label={t('date')} value={dateStr} />
          <DetailRow label={t('time')} value={timeStr} />
          <DetailRow label={t('branch')} value={branchName} />
          {staffName && <DetailRow label={t('specialist')} value={staffName} />}
        </div>

        {/* Actions — "Sí, asistiré" is the safe/primary button */}
        <div className="flex flex-col gap-3">
          <a
            href={keepUrl}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-center py-3 px-6 rounded-xl transition-colors"
          >
            {t('keepButton')}
          </a>
          <a
            href={cancelUrl}
            className="w-full bg-slate-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium text-center py-3 px-6 rounded-xl transition-colors text-sm"
          >
            {t('cancelButton')}
          </a>
        </div>

        {tenantName && (
          <p className="text-center text-xs text-slate-400 dark:text-zinc-600">
            {t('contactNote', { tenantName })}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoPage({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
        <div className="text-4xl">{emoji}</div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
        <p className="text-slate-500 dark:text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500 dark:text-zinc-400 font-medium">{label}</span>
      <span className="text-slate-800 dark:text-zinc-200 font-semibold text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
