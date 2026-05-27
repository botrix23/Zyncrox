import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminsAction } from "@/app/actions/adminUsers";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  const locale = params.locale || 'es';

  if (!session || session.role === 'STAFF') {
    redirect(`/${locale}/admin`);
  }

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) redirect(`/${locale}/admin`);

  const [tenant, admins] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        plan: true,
        name: true,
        recoveryEmail: true,
        timezone: true,
        emailLocale: true,
        emailBodyTemplate: true,
        whatsappNumber: true,
        waMessageTemplate: true,
      },
    }),
    getAdminsAction(),
  ]);

  return (
    <SettingsClient
      initialAdmins={admins}
      plan={tenant?.plan ?? 'BASIC'}
      currentUserId={session.userId ?? ''}
      initialRecoveryEmail={tenant?.recoveryEmail ?? null}
      tenantId={tenantId}
      initialTimezone={tenant?.timezone ?? 'America/El_Salvador'}
      initialEmailLocale={tenant?.emailLocale ?? 'es'}
      initialEmailBodyTemplate={tenant?.emailBodyTemplate ?? ''}
      initialWhatsappNumber={tenant?.whatsappNumber ?? ''}
      initialWaMessageTemplate={tenant?.waMessageTemplate ?? ''}
    />
  );
}
