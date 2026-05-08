import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq, gte, lte, not } from "drizzle-orm";
import { addHours, format } from "date-fns";
import { es } from "date-fns/locale";
import { resend } from "@/lib/resend";
import { BookingReminderEmail } from "@/components/emails/BookingReminderEmail";
import { logAuditEvent } from "@/lib/audit";

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
      ),
      with: { service: true, branch: true, staff: true, tenant: true },
    });

    let sent = 0;
    let failed = 0;

    for (const booking of upcoming) {
      if (!booking.customerEmail) continue;
      try {
        await resend.emails.send({
          from: 'Zyncrox <noreply@zyncrox.com>',
          to: booking.customerEmail,
          subject: `Recordatorio: tu cita mañana en ${booking.tenant.name}`,
          react: BookingReminderEmail({
            customerName: booking.customerName,
            serviceName: booking.service.name,
            date: format(booking.startTime, "EEEE, d 'de' MMMM", { locale: es }),
            time: format(booking.startTime, "hh:mm a"),
            branchName: booking.branch.name,
            staffName: booking.staff?.name,
            tenantName: booking.tenant.name,
            tenantLogo: booking.tenant.logoUrl || undefined,
          }),
        });
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
