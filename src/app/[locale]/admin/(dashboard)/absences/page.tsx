import { db } from "@/db";
import { blocks, staff, branches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import AbsencesClient from "./AbsencesClient";

export const metadata = {
  title: "Ausencias | ZyncSlot",
};

export default async function AbsencesPage({
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

  // Cargar datos
  const allBlocks = await db.select().from(blocks).where(eq(blocks.tenantId, tenantId)).orderBy(desc(blocks.startTime));
  const allBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId));
  const allStaff = await db.select().from(staff).where(eq(staff.tenantId, tenantId));

  return (
    <AbsencesClient 
      initialBlocks={allBlocks} 
      branches={allBranches}
      staff={allStaff}
      tenantId={tenantId}
    />
  );
}
