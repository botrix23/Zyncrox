import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyCancelToken } from "@/lib/cancelToken";
import { formatEmailDate, formatEmailTime, t as emailT, type EmailLocale } from "@/lib/emailI18n";
import { getTranslations } from "next-intl/server";
import { resend } from "@/lib/resend";
import { BookingCancellationEmail } from "@/components/emails/BookingCancellationEmail";
import { getPlatformEmailTemplates, buildEmailPayload } from "@/lib/emailTemplates";
import {
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  CalendarX2,
  CalendarDays,
  Phone,
} from "lucide-react";
import React from "react";

/** Horas mínimas de anticipación para cancelar online */
const CANCEL_WINDOW_HOURS = 2;

// ─── Icon variants ────────────────────────────────────────────────────────────
type InfoVariant = 'error' | 'search' | 'success' | 'clock' | 'cancelled';

const infoVariantConfig: Record<InfoVariant, { Icon: React.ElementType; iconBg: string; iconColor: string }> = {
  error:     { Icon: AlertCircle,  iconBg: 'bg-rose-500/10',   iconColor: 'text-rose-400' },
  search:    { Icon: HelpCircle,   iconBg: 'bg-slate-500/10',  iconColor: 'text-slate-400' },
  success:   { Icon: CheckCircle2, iconBg: 'bg-green-500/10',  iconColor: 'text-green-500' },
  clock:     { Icon: Clock,        iconBg: 'bg-amber-500/10',  iconColor: 'text-amber-400' },
  cancelled: { Icon: CalendarX2,   iconBg: 'bg-slate-500/10',  iconColor: 'text-slate-400' },
};

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
    return <InfoPage variant="error" title={t('invalidToken')} desc={t('invalidTokenDesc')} />;
  }

  // Fetch the booking
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { service: true, branch: true, staff: true, tenant: true },
  });

  if (!booking) {
    return <InfoPage variant="search" title={t('notFound')} desc={t('notFoundDesc')} />;
  }

  if (booking.status === 'CANCELLED') {
    return <InfoPage variant="success" title={t('alreadyCancelled')} desc={t('alreadyCancelledDesc')} />;
  }

  if (booking.status === 'FINALIZADA') {
    return <InfoPage variant="success" title={t('alreadyFinished')} desc={t('alreadyFinishedDesc')} />;
  }

  const tenant = booking.tenant as any;
  const tenantName = tenant?.name || '';
  const tenantPhone: string = tenant?.whatsappNumber || tenant?.phone || '';
  const localeKey = (locale === 'en' ? 'en' : 'es') as EmailLocale;

  // ── Ventana de cancelación ──────────────────────────────────────────────────
  const deadlineDate = new Date(booking.startTime.getTime() - CANCEL_WINDOW_HOURS * 60 * 60 * 1000);
  const isPastDeadline = new Date() > deadlineDate;

  const deadlineStr = deadlineDate.toLocaleString(locale === 'en' ? 'en-US' : 'es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // User chose to keep the appointment
  if (action === 'keep') {
    return <InfoPage variant="success" title={t('keptTitle')} desc={t('keptDesc')} />;
  }

  // User chose to cancel
  if (action === 'cancel') {
    if (isPastDeadline) {
      return (
        <InfoPage
          variant="clock"
          title={t('tooLateTitle')}
          desc={t('tooLateDesc', { hours: CANCEL_WINDOW_HOURS })}
          tenantName={tenantName}
          tenantPhone={tenantPhone}
        />
      );
    }

    // Mark as cancelled
    await db.update(bookings)
      .set({ status: 'CANCELLED' })
      .where(eq(bookings.id, bookingId));

    const dateStr = formatEmailDate(booking.startTime, localeKey);
    const timeStr = formatEmailTime(booking.startTime);
    const branchName = (booking.branch as any)?.name || '';
    const serviceName = (booking.service as any)?.name || '';
    const staffName = (booking.staff as any)?.name || '';

    // ── Email 1: Confirmación de cancelación al CLIENTE ─────────────────────
    if (booking.customerEmail) {
      try {
        const emailCfg = await getPlatformEmailTemplates();
        const vars = {
          customerName: booking.customerName,
          serviceName,
          date: dateStr,
          time: timeStr,
          branchName,
          tenantName,
          phone: tenantPhone,
          contactEmail: tenant?.contactEmail || '',
        };
        const emailPayload = buildEmailPayload(
          emailCfg?.emailTplCancellation,
          React.createElement(BookingCancellationEmail, {
            ...vars,
            locale: localeKey,
            tenantLogo: tenant?.logoUrl || undefined,
            phone: tenantPhone || undefined,
            contactEmail: tenant?.contactEmail || undefined,
          }),
          vars
        );
        await resend.emails.send({
          from: `${tenantName} <notificaciones@zyncrox.com>`,
          replyTo: tenant?.contactEmail || undefined,
          to: booking.customerEmail,
          subject: emailT.cancellationSubject(tenantName, localeKey),
          ...emailPayload,
        });
      } catch (e) {
        console.error('[CancelPage] Error sending cancellation email to client:', e);
      }
    }

    // ── Email 2: Notificación al ADMIN/TENANT ───────────────────────────────
    const adminEmail = tenant?.contactEmail;
    if (adminEmail) {
      try {
        const isEn = localeKey === 'en';
        const subject = isEn
          ? `Booking cancelled by client – ${booking.customerName}`
          : `Cita cancelada por el cliente – ${booking.customerName}`;

        const html = isEn ? `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
            <h2 style="color:#dc2626;margin:0 0 16px">Appointment Cancelled</h2>
            <p style="color:#374151;margin:0 0 20px">A client has cancelled their appointment online:</p>
            <table style="width:100%;border-collapse:collapse;background:#fef2f2;border-radius:8px;padding:16px;">
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Client</td><td style="padding:8px 12px;color:#111827;">${booking.customerName}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Email</td><td style="padding:8px 12px;color:#111827;">${booking.customerEmail || '—'}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Service</td><td style="padding:8px 12px;color:#111827;">${serviceName}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Date</td><td style="padding:8px 12px;color:#111827;">${dateStr}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Time</td><td style="padding:8px 12px;color:#111827;">${timeStr}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Branch</td><td style="padding:8px 12px;color:#111827;">${branchName}</td></tr>
              ${staffName ? `<tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Specialist</td><td style="padding:8px 12px;color:#111827;">${staffName}</td></tr>` : ''}
            </table>
            <p style="color:#6b7280;font-size:13px;margin:20px 0 0">That time slot is now available for new bookings.</p>
          </div>` : `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
            <h2 style="color:#dc2626;margin:0 0 16px">Cita cancelada</h2>
            <p style="color:#374151;margin:0 0 20px">Un cliente ha cancelado su cita en línea:</p>
            <table style="width:100%;border-collapse:collapse;background:#fef2f2;border-radius:8px;padding:16px;">
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Cliente</td><td style="padding:8px 12px;color:#111827;">${booking.customerName}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Email</td><td style="padding:8px 12px;color:#111827;">${booking.customerEmail || '—'}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Servicio</td><td style="padding:8px 12px;color:#111827;">${serviceName}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Fecha</td><td style="padding:8px 12px;color:#111827;">${dateStr}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Hora</td><td style="padding:8px 12px;color:#111827;">${timeStr}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Sucursal</td><td style="padding:8px 12px;color:#111827;">${branchName}</td></tr>
              ${staffName ? `<tr><td style="padding:8px 12px;color:#6b7280;font-weight:600;">Especialista</td><td style="padding:8px 12px;color:#111827;">${staffName}</td></tr>` : ''}
            </table>
            <p style="color:#6b7280;font-size:13px;margin:20px 0 0">El horario ya está disponible para nuevas reservas.</p>
          </div>`;

        await resend.emails.send({
          from: `Zyncrox <notificaciones@zyncrox.com>`,
          to: adminEmail,
          subject,
          html,
        });
      } catch (e) {
        console.error('[CancelPage] Error sending cancellation notification to admin:', e);
      }
    }

    return (
      <InfoPage
        variant="cancelled"
        title={t('cancelledTitle')}
        desc={t('cancelledDesc')}
        tenantName={tenantName}
        tenantPhone={tenantPhone}
      />
    );
  }

  // ── Default: show confirmation page ────────────────────────────────────────
  const dateStr = formatEmailDate(booking.startTime, localeKey);
  const timeStr = formatEmailTime(booking.startTime);
  const tenantLogo = tenant?.logoUrl || null;
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
          <div className="flex items-center justify-center w-14 h-14 bg-violet-500/10 rounded-2xl mx-auto">
            <CalendarDays className="w-7 h-7 text-violet-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-3">
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

        {/* Cancellation deadline notice */}
        {!isPastDeadline && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
            {t('deadline', { deadline: deadlineStr })}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href={keepUrl}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-center py-3 px-6 rounded-xl transition-colors"
          >
            {t('keepButton')}
          </a>
          {isPastDeadline ? (
            <p className="text-center text-sm text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
              {t('tooLateInline', { tenantName })}
            </p>
          ) : (
            <a
              href={cancelUrl}
              className="w-full bg-slate-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium text-center py-3 px-6 rounded-xl transition-colors text-sm"
            >
              {t('cancelButton')}
            </a>
          )}
        </div>

        {/* Contact footer */}
        {(tenantName || tenantPhone) && (
          <div className="text-center border-t border-slate-100 dark:border-white/5 pt-4 space-y-1">
            <p className="text-xs text-slate-400 dark:text-zinc-600">
              {t('contactNote', { tenantName })}
            </p>
            {tenantPhone && (
              <a
                href={`tel:${tenantPhone}`}
                className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium"
              >
                <Phone className="w-3 h-3" />
                {tenantPhone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared info/result page ──────────────────────────────────────────────────
function InfoPage({
  variant,
  title,
  desc,
  tenantName,
  tenantPhone,
}: {
  variant: InfoVariant;
  title: string;
  desc: string;
  tenantName?: string;
  tenantPhone?: string;
}) {
  const cfg = infoVariantConfig[variant];
  const Icon = cfg.Icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
        <div className={`flex items-center justify-center w-14 h-14 ${cfg.iconBg} rounded-2xl mx-auto`}>
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
        <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
        {(tenantName || tenantPhone) && (
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
            {tenantName && (
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{tenantName}</p>
            )}
            {tenantPhone && (
              <a
                href={`tel:${tenantPhone}`}
                className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                {tenantPhone}
              </a>
            )}
          </div>
        )}
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
