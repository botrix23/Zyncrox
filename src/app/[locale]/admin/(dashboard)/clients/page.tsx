import { db } from "@/db";
import { bookings, tenants } from "@/db/schema";
import { eq, desc, and, not } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import ClientsClient from "./ClientsClient";

export const metadata = {
  title: "Clientes | ZyncSlot",
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

  return (
    <ClientsClient 
      bookings={tenantBookings} 
      vipThreshold={tenant?.vipThreshold || 5}
    />
  );
}
