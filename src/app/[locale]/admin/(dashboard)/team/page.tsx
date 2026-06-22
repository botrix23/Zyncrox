import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPlanFeatures } from "@/core/plans";
import { TeamClient } from "./TeamClient";

export default async function TeamPage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  const locale = params.locale || 'es';

  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    redirect(`/${locale}/admin`);
  }

  const tenantId = session.role === 'SUPER_ADMIN'
    ? session.impersonatedTenantId
    : session.tenantId;

  if (!tenantId) redirect(`/${locale}/admin`);

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) redirect(`/${locale}/admin`);

  const features = getPlanFeatures(tenant.plan);

  const [admins, receptionists] = await Promise.all([
    db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN')),
      columns: { id: true, name: true, email: true, isActive: true, isOwner: true, createdAt: true },
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    }),
    db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'RECEPTIONIST')),
      columns: { id: true, name: true, email: true, isActive: true, createdAt: true },
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    }),
  ]);

  return (
    <TeamClient
      initialAdmins={admins}
      initialReceptionists={receptionists}
      plan={tenant.plan}
      maxAdmins={features.maxAdmins}
      isOwner={session.isOwner ?? false}
      locale={locale}
    />
  );
}
