import { db } from "@/db";
import { bookings, tenants, clientLoyalty, surveyQuestions, reviews as reviewsTable } from "@/db/schema";
import { eq, desc, asc, and, not, count } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import ClientsClient from "./ClientsClient";
import { getClientNotesCountsAction } from "@/app/actions/clientNotes";
import { getRewardsAction } from "@/app/actions/loyalty";
import { getPlanFeatures } from "@/core/plans";

export const metadata = {
  title: "Clientes | Zyncrox",
};

export default async function ClientsPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const session = await getSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const tenantId = session.role === 'SUPER_ADMIN' && session.impersonatedTenantId
    ? session.impersonatedTenantId
    : session.tenantId;

  if (!tenantId) redirect(`/${locale}/admin`);

  // Obtener el tenant para el umbral VIP
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });

  // Obtener citas con relaciones (Relational API)
  const tenantBookings = await db.query.bookings.findMany({
    where: and(
        eq(bookings.tenantId, tenantId),
        not(eq(bookings.status, 'CANCELLED'))
    ),
    with: {
        service: true,
        staff: true,
        branch: true
    },
    orderBy: [desc(bookings.startTime)]
  });

  const [notesCounts, loyaltyRows, questions, reviews, surveyEmailSentResult, rewardsResult] = await Promise.all([
    getClientNotesCountsAction(),
    db.select().from(clientLoyalty).where(eq(clientLoyalty.tenantId, tenantId!)),
    db.query.surveyQuestions.findMany({
      where: eq(surveyQuestions.tenantId, tenantId!),
      orderBy: [asc(surveyQuestions.sortOrder)],
    }),
    db.query.reviews.findMany({
      where: eq(reviewsTable.tenantId, tenantId!),
      with: {
        booking: {
          with: {
            staff: true,
            service: true,
          }
        }
      },
      orderBy: [desc(reviewsTable.createdAt)],
    }),
    db.select({ value: count() })
      .from(bookings)
      .where(and(eq(bookings.tenantId, tenantId!), eq(bookings.surveyEmailSent, true))),
    getRewardsAction(),
  ]);

  const totalSurveySent = surveyEmailSentResult[0]?.value ?? 0;
  const planFeatures = getPlanFeatures(tenant?.plan);
  const canUseSurveys = planFeatures.surveys;
  const canUseAdvanced = planFeatures.nps;
  const initialRewards = rewardsResult.success ? (rewardsResult as any).rewards : [];

  const loyaltyConfig = {
    enabled: tenant?.loyaltyEnabled ?? false,
    windowMonths: tenant?.loyaltyWindowMonths ?? 6,
    frequentThreshold: tenant?.loyaltyFrequentThreshold ?? 5,
    vipCitasThreshold: tenant?.loyaltyVipCitasThreshold ?? null,
    vipAmountThreshold: tenant?.loyaltyVipAmountThreshold ? Number(tenant.loyaltyVipAmountThreshold) : null,
    plan: tenant?.plan ?? 'BASIC',
    pointsEnabled: tenant?.pointsEnabled ?? false,
    pointsPerDollar: tenant?.pointsPerDollar ?? 10,
    pointsExpireEnabled: tenant?.pointsExpireEnabled ?? false,
    pointsExpireMonths: tenant?.pointsExpireMonths ?? 6,
    pointsRedemptionNote: (tenant as any)?.pointsRedemptionNote ?? null,
  };

  return (
    <ClientsClient
      bookings={tenantBookings}
      vipThreshold={tenant?.vipThreshold || 5}
      notesCounts={notesCounts}
      currentUserId={session.userId || ''}
      currentUserRole={session.role}
      loyaltyRows={loyaltyRows}
      loyaltyConfig={loyaltyConfig}
      tenantId={tenantId!}
      initialRewards={initialRewards}
      surveyProps={{
        tenantId: tenantId!,
        initialEnabled: tenant?.reviewsEnabled ?? false,
        initialQuestions: questions,
        initialReviews: reviews,
        canUseAdvanced,
        locale,
        slug: tenant?.slug ?? '',
        totalSurveySent,
        canUseSurveys,
      }}
    />
  );
}
