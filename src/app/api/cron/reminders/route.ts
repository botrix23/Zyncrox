import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq, gte, lte, not } from "drizzle-orm";
import { addHours } from "date-fns";
import { resend } from "@/lib/resend";
import { BookingReminderEmail } from "@/components/emails/BookingReminderEmail";
import { logAuditEvent } from "@/lib/audit";
import { getPlatformEmailTemplates, buildEmailPayload } from "@/lib/emailTemplates";
import { formatEmailDate, formatEmailTime, t as emailT, type EmailLocale } from "@/lib/emailI18n";
import { generateCancelToken } from "@/lib/cancelToken";
import React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zyncrox.com';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Window: bookings starting between 23h and 25h from now
    const windowStart = addHours(now, 23);
    const windowEnd = addHours(now, 25);

    const upcoming = await db.query.bookings.findMany({
      where: and(
        gte(bookings.startTime, windowStart),
        lte(bookings.startTime, windowEnd),
        not(eq(bookings.status, 'CANCELLED')),
        not(eq(bookings.status, 'FINALIZADA')),
        // Anti-duplicate: only send to bookings that haven't been reminded yet
        eq(bookings.reminderSent, false),
      ),
      with: { service: true, branch: true, staff: true, tenant: true },
    });

    let sent = 0;
    let failed = 0;

    const emailCfg = await getPlatformEmailTemplates();

    for (const booking of upcoming) {
      if (!booking.customerEmail) continue;
      try {
        const locale = ((booking.tenant as any).emailLocale || 'es') as EmailLocale;
        const tenantPhone = (booking.tenant as any).whatsappNumber || undefined;
        const tenantContactEmail = (booking.tenant as any).contactEmail || undefined;

        // Generate signed cancel URL
        const cancelToken = generateCancelToken(booking.id);
        const cancelUrl = `${APP_URL}/${locale}/cancel/${booking.id}?token=${cancelToken}`;

        const vars = {
          customerName: booking.customerName,
          serviceName: booking.service.name,
          date: formatEmailDate(booking.startTime, locale),
          time: formatEmailTime(booking.startTime),
          branchName: booking.branch.name,
          staffName: booking.staff?.name ?? '',
          tenantName: booking.tenant.name,
          phone: tenantPhone || '',
          contactEmail: tenantContactEmail || '',
          cancelUrl,
        };
        const emailPayload = buildEmailPayload(
          emailCfg?.emailTplReminder,
          React.createElement(BookingReminderEmail, {
            ...vars,
            tenantLogo: (booking.tenant as any).logoUrl || undefined,
            locale,
            phone: tenantPhone,
            contactEmail: tenantContactEmail,
            cancelUrl,
          }),
          vars
        );
        await resend.emails.send({
          from: `${booking.tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: tenantContactEmail || undefined,
          to: booking.customerEmail,
          subject: emailT.reminderSubject(booking.tenant.name, locale),
          ...emailPayload,
        });

        // Mark reminder as sent to prevent duplicates
        await db.update(bookings)
          .set({ reminderSent: true })
          .where(eq(bookings.id, booking.id));

        sent++;
      } catch (e) {
        console.error(`[Reminder] Failed for booking ${booking.id}:`, e);
        failed++;
      }
    }

    await logAuditEvent({
      action: 'CRON_REMINDERS_RUN',
      details: { sent, failed, total: upcoming.length, success: true },
    });

    return NextResponse.json({ ok: true, sent, failed, total: upcoming.length });
  } catch (error) {
    console.error("[Reminder Cron] Error:", error);
    await logAuditEvent({
      action: 'CRON_REMINDERS_RUN',
      details: { success: false, error: String(error) },
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
