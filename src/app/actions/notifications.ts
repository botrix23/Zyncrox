"use server";

import { db } from "@/db";
import { absenceRequests, bookings } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";
import { subHours } from "date-fns";

export async function getNotificationsAction() {
  const session = await getSession();
  if (!session) return [];

  const tenantId = session.role === 'SUPER_ADMIN' && session.impersonatedTenantId
    ? session.impersonatedTenantId
    : session.tenantId;

  if (!tenantId) return [];

  try {
    if (session.role === 'STAFF' && session.staffId) {
      // STAFF: ver el estado de sus propias solicitudes
      const requests = await db.query.absenceRequests.findMany({
        where: and(
          eq(absenceRequests.tenantId, tenantId),
          eq(absenceRequests.staffId, session.staffId)
        ),
        orderBy: [desc(absenceRequests.createdAt)],
        limit: 10,
      });

      return requests.map(r => ({
        id: r.id,
        type: 'absence' as const,
        title: r.status === 'PENDING' ? 'Solicitud enviada' : r.status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        body: r.reason || 'Sin motivo especificado',
        date: r.startTime,
        status: r.status,
        read: r.status !== 'PENDING',
        canAct: false,
      }));
    } else {
      // ADMIN: ausencias pendientes + reservas recientes (últimas 48h)
      const since48h = subHours(new Date(), 48);
      const since2h = subHours(new Date(), 2);

      const [pendingAbsences, recentBookings] = await Promise.all([
        db.query.absenceRequests.findMany({
          where: and(
            eq(absenceRequests.tenantId, tenantId),
            eq(absenceRequests.status, 'PENDING')
          ),
          with: { staff: true },
          orderBy: [desc(absenceRequests.createdAt)],
          limit: 10,
        }),
        db.query.bookings.findMany({
          where: and(
            eq(bookings.tenantId, tenantId),
            gte(bookings.createdAt, since48h)
          ),
          with: { service: true },
          orderBy: [desc(bookings.createdAt)],
          limit: 15,
        }),
      ]);

      const absenceNotifs = pendingAbsences.map(r => ({
        id: r.id,
        type: 'absence' as const,
        title: `Solicitud de ${(r as any).staff?.name || 'profesional'}`,
        body: r.reason || 'Sin motivo especificado',
        date: r.createdAt,
        status: r.status,
        read: false,
        canAct: true,
        requestId: r.id,
      }));

      const bookingNotifs = recentBookings.map(b => ({
        id: b.id,
        type: 'booking' as const,
        title: `Nueva cita: ${b.customerName}`,
        body: (b as any).service?.name || 'Servicio',
        date: b.createdAt,
        // unread if created in last 2 hours
        read: new Date(b.createdAt) < since2h,
        canAct: false,
      }));

      // Mezclar y ordenar por fecha descendente
      return [...absenceNotifs, ...bookingNotifs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markNotificationsReadAction() {
  return { success: true };
}
