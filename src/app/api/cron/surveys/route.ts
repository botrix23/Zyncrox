import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, tenants, reviews } from "@/db/schema";
import { and, eq, lte, not } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { SurveyInviteEmail } from "@/components/emails/SurveyInviteEmail";
import { logAuditEvent } from "@/lib/audit";
import { getPlatformEmailTemplates, buildEmailPayload } from "@/lib/emailTemplates";
import { t as emailT, type EmailLocale } from "@/lib/emailI18n";
import { getPlanFeatures } from "@/core/plans";
import React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zyncrox.com";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Auto-finalizar todas las citas cuya hora de fin ya pasó
    const finalized = await db
      .update(bookings)
      .set({ status: "FINALIZADA" as any })
      .where(
        and(
          not(eq(bookings.status, "CANCELLED")),
          not(eq(bookings.status, "FINALIZADA")),
          lte(bookings.endTime, now)
        )
      )
      .returning({ id: bookings.id, tenantId: bookings.tenantId });

    // 2. Buscar todas las citas FINALIZADAS pendientes de encuesta
    const pending = await db.query.bookings.findMany({
      where: and(
        eq(bookings.status, "FINALIZADA"),
        eq(bookings.surveyEmailSent, false)
      ),
      with: { tenant: true, service: true },
    });

    const emailCfg = await getPlatformEmailTemplates();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const booking of pending) {
      const tenant = booking.tenant as any;

      // Solo enviar si el tenant tiene encuestas activas y plan que lo permite
      if (!tenant?.reviewsEnabled) { skipped++; continue; }
      if (!getPlanFeatures(tenant.plan).surveys) { skipped++; continue; }
      if (!booking.customerEmail) { skipped++; continue; }

      try {
        // No enviar si el cliente ya respondió la encuesta para esta cita
        const existingReview = await db.query.reviews.findFirst({
          where: eq(reviews.bookingId, booking.id),
          columns: { id: true },
        });
        if (existingReview) {
          await db.update(bookings)
            .set({ surveyEmailSent: true })
            .where(eq(bookings.id, booking.id));
          skipped++;
          continue;
        }

        const locale = (tenant.emailLocale || "es") as EmailLocale;
        const surveyUrl = `${APP_URL}/${locale}/review/${booking.id}`;

        const vars = {
          customerName: booking.customerName,
          tenantName: tenant.name,
          surveyUrl,
        };

        const emailPayload = buildEmailPayload(
          emailCfg?.emailTplSurveyInvite,
          React.createElement(SurveyInviteEmail, {
            ...vars,
            locale,
            tenantLogo: tenant.logoUrl || undefined,
          }),
          vars
        );

        await resend.emails.send({
          from: `${tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: tenant.contactEmail || undefined,
          to: booking.customerEmail,
          subject: emailT.surveySubject(tenant.name, locale),
          ...emailPayload,
        });

        await db.update(bookings)
          .set({ surveyEmailSent: true })
          .where(eq(bookings.id, booking.id));

        sent++;
      } catch (e) {
        console.error(`[Survey Cron] Error enviando encuesta para booking ${booking.id}:`, e);
        failed++;
      }
    }

    await logAuditEvent({
      action: "CRON_SURVEYS_RUN",
      details: {
        finalized: finalized.length,
        surveySent: sent,
        surveySkipped: skipped,
        surveyFailed: failed,
        success: true,
      },
    });

    return NextResponse.json({
      ok: true,
      finalized: finalized.length,
      surveySent: sent,
      surveySkipped: skipped,
      surveyFailed: failed,
    });
  } catch (error) {
    console.error("[Survey Cron] Error:", error);
    await logAuditEvent({
      action: "CRON_SURVEYS_RUN",
      details: { success: false, error: String(error) },
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
