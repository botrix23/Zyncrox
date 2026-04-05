import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, surveyQuestions, reviews as reviewsTable } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { getPlanFeatures } from "@/core/plans";
import SurveyClient from "./SurveyClient";
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

  const [questions, reviews] = await Promise.all([
    db.query.surveyQuestions.findMany({
      where: eq(surveyQuestions.tenantId, tenantId),
      orderBy: [asc(surveyQuestions.sortOrder)],
    }),
    db.query.reviews.findMany({
      where: eq(reviewsTable.tenantId, tenantId),
      with: {
        booking: {
          with: {
            staff: true,
            service: true
          }
        }
      },
      orderBy: [desc(reviewsTable.createdAt)],
    })
  ]);

  const planFeatures = getPlanFeatures(tenant.plan);
  const canUseAdvanced = planFeatures.advancedSurveys;

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

      <SurveyClient 
        tenantId={tenantId}
        initialEnabled={tenant.reviewsEnabled}
        initialQuestions={questions}
        initialReviews={reviews}
        canUseAdvanced={canUseAdvanced}
        locale={locale}
        slug={tenant.slug}
      />
    </div>
  );
}
