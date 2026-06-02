import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, surveyQuestions, reviews as reviewsTable, bookings } from "@/db/schema";
import { eq, asc, desc, and, count } from "drizzle-orm";
import { getPlanFeatures } from "@/core/plans";
import SurveyClient from "./SurveyClient";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function SurveysPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('Surveys');
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect(`/${locale}/admin/login`);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    redirect(`/${locale}/admin/login`);
  }

  const [questions, reviews, surveyEmailSentResult] = await Promise.all([
    db.query.surveyQuestions.findMany({
      where: eq(surveyQuestions.tenantId, tenantId),
      orderBy: [asc(surveyQuestions.sortOrder)],
    }),
    db.query.reviews.findMany({
      where: eq(reviewsTable.tenantId, tenantId),
      with: {
        booking: {
          columns: {
            id: true,
            startTime: true,
            customerName: true,
            customerEmail: true,
          },
          with: {
            staff: true,
            service: true
          }
        }
      },
      orderBy: [desc(reviewsTable.createdAt)],
    }),
    db.select({ value: count() })
      .from(bookings)
      .where(and(eq(bookings.tenantId, tenantId), eq(bookings.surveyEmailSent, true))),
  ]);

  const totalSurveySent = surveyEmailSentResult[0]?.value ?? 0;

  const planFeatures = getPlanFeatures(tenant.plan);
  const canUseSurveys = planFeatures.surveys;
  // canUseAdvanced = can use NPS question type (Enterprise only)
  const canUseAdvanced = planFeatures.nps;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {!canUseSurveys ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-3xl border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-200 dark:bg-white/10">
            <Lock className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="text-center max-w-sm">
            <p className="font-bold text-slate-800 dark:text-white text-lg">{t('upgradeTitle')}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('upgradeDesc2')}</p>
          </div>
          <a href={`/${locale}/admin/billing`} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity">
            {t('upgradeCta')}
          </a>
        </div>
      ) : (
        <SurveyClient
          tenantId={tenantId}
          initialEnabled={tenant.reviewsEnabled}
          initialQuestions={questions}
          initialReviews={reviews}
          canUseAdvanced={canUseAdvanced}
          locale={locale}
          slug={tenant.slug}
          totalSurveySent={totalSurveySent}
        />
      )}
    </div>
  );
}
