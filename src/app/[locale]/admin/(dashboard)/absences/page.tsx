import { db } from "@/db";
import { blocks, staff, branches, absenceRequests } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import AbsencesClient from "./AbsencesClient";

export const metadata = {
  title: "Ausencias | Zyncrox",
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

  const isStaff = session.role === 'STAFF';
  const currentStaffId = session.staffId ?? undefined;

  const allBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId));
  const allStaff = await db.select().from(staff).where(eq(staff.tenantId, tenantId));

  let initialBlocks: any[];
  let pendingRequests: any[] = [];

  if (isStaff && currentStaffId) {
    // STAFF: ver sus propias solicitudes de ausencia
    initialBlocks = await db.select()
      .from(absenceRequests)
      .where(and(
        eq(absenceRequests.tenantId, tenantId),
        eq(absenceRequests.staffId, currentStaffId)
      ))
      .orderBy(desc(absenceRequests.startTime));
  } else {
    // ADMIN: ver todos los bloqueos + solicitudes pendientes
    [initialBlocks, pendingRequests] = await Promise.all([
      db.select().from(blocks).where(eq(blocks.tenantId, tenantId)).orderBy(desc(blocks.startTime)),
      db.select().from(absenceRequests).where(
        and(
          eq(absenceRequests.tenantId, tenantId),
          eq(absenceRequests.status, 'PENDING')
        )
      ).orderBy(desc(absenceRequests.createdAt)),
    ]);
  }

  return (
    <AbsencesClient
      initialBlocks={initialBlocks}
      branches={allBranches}
      staff={allStaff}
      tenantId={tenantId}
      role={session.role}
      currentStaffId={currentStaffId}
      pendingRequests={pendingRequests}
    />
  );
}
