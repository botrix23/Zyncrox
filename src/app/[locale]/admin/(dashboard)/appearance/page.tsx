import { getSession } from "@/lib/auth-session";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppearanceClient from "./AppearanceClient";

export default async function AppearancePage({ params, searchParams }: { params: { locale: string }, searchParams?: { tab?: string } }) {
  const session = await getSession();
  if (!session || !session.tenantId) {
    redirect(`/${params.locale}/admin/login`);
  }

  // Obtener negocio actual
  const tenantData = await db.query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId)
  });

  if (!tenantData) {
    redirect(`/${params.locale}/admin/login`);
  }

  // Obtener zonas de cobertura
  const coverageZones = await db.query.coverageZones.findMany({
    where: (zones, { eq }) => eq(zones.tenantId, tenantData.id),
  });

  return (
    <AppearanceClient
      plan={tenantData.plan}
      initialTab={searchParams?.tab === 'rules' ? 'rules' : 'design'}
      tenant={{
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        logoUrl: tenantData.logoUrl,
        coverUrl: tenantData.coverUrl,
        primaryColor: tenantData.primaryColor,
        theme: tenantData.theme,
        instagramUrl: tenantData.instagramUrl,
        facebookUrl: tenantData.facebookUrl,
        tiktokUrl: tenantData.tiktokUrl,
        whatsappNumber: tenantData.whatsappNumber,
        homeServiceTerms: tenantData.homeServiceTerms,
        homeServiceTermsEnabled: tenantData.homeServiceTermsEnabled,
        waMessageTemplate: tenantData.waMessageTemplate,
        allowsHomeService: tenantData.allowsHomeService,
        homeServiceLeadDays: tenantData.homeServiceLeadDays,
        vipThreshold: tenantData.vipThreshold,
        showStaffSelection: tenantData.showStaffSelection,
        heroTitle: tenantData.heroTitle,
        heroSubtitle: tenantData.heroSubtitle,
        emailBodyTemplate: tenantData.emailBodyTemplate,
        emailLocale: tenantData.emailLocale,
        contactEmail: tenantData.contactEmail,
        bookingSettings: tenantData.bookingSettings as any,
        timezone: tenantData.timezone,
        // Loyalty levels
        loyaltyEnabled: tenantData.loyaltyEnabled,
        loyaltyWindowMonths: tenantData.loyaltyWindowMonths,
        loyaltyFrequentThreshold: tenantData.loyaltyFrequentThreshold,
        loyaltyVipCitasThreshold: tenantData.loyaltyVipCitasThreshold,
        loyaltyVipAmountThreshold: tenantData.loyaltyVipAmountThreshold ? Number(tenantData.loyaltyVipAmountThreshold) : null,
        // Points program
        pointsEnabled: tenantData.pointsEnabled,
        pointsPerDollar: tenantData.pointsPerDollar,
        pointsExpireEnabled: tenantData.pointsExpireEnabled,
        pointsExpireMonths: tenantData.pointsExpireMonths,
      }}
      initialZones={coverageZones}
    />
  );
}
