import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppearanceClient from "./AppearanceClient";

export default async function AppearancePage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!session || !tenantId) {
    redirect(`/${params.locale}/admin/login`);
  }

  const tenantData = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      logoUrl: true,
      coverUrl: true,
      primaryColor: true,
      theme: true,
      instagramUrl: true,
      facebookUrl: true,
      tiktokUrl: true,
      heroTitle: true,
      heroSubtitle: true,
      contactEmail: true,
      showStaffSelection: true,
      bookingSettings: true,
    },
  });

  if (!tenantData) {
    redirect(`/${params.locale}/admin/login`);
  }

  return (
    <AppearanceClient
      plan={tenantData.plan}
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
        heroTitle: tenantData.heroTitle,
        heroSubtitle: tenantData.heroSubtitle,
        contactEmail: tenantData.contactEmail,
        showStaffSelection: tenantData.showStaffSelection,
        bookingSettings: tenantData.bookingSettings as any,
      }}
    />
  );
}
