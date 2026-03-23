import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import SettingsPage from "./SettingsPage";

export default async function SettingsPageWrapper({ params }: { params: { locale: string } }) {
  const session = await getSession();
  const locale = params.locale || 'es';

  const tenantId = getEffectiveTenantId(session);
  
  if (!tenantId) {
    redirect(`/${locale}/admin/login`);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });

  if (!tenant) {
    return <div>Negocio no encontrado.</div>;
  }

  return (
    <SettingsPage 
      tenant={{
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        whatsappNumber: tenant.whatsappNumber,
        homeServiceTerms: tenant.homeServiceTerms,
        homeServiceTermsEnabled: tenant.homeServiceTermsEnabled,
        waMessageTemplate: tenant.waMessageTemplate
      }} 
    />
  );
}
