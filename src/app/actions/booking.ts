"use server";

import { db } from "@/db";
import { bookings, services, staff, blocks } from "@/db/schema";
import { eq, and, gte, lte, or, isNull, desc, not } from "drizzle-orm";
import { addMinutes, format, parseISO, startOfDay, endOfDay, isBefore, isAfter, max, min } from "date-fns";

/**
 * Calcula los slots de tiempo disponibles para un servicio, fecha y sucursal/staff específicos.
 */
export async function getAvailableSlots(dateStr: string, serviceId: string, branchId: string, staffId?: string, durationOverride?: number) {
  try {
    let duration = durationOverride;
    
    if (!duration) {
      const service = await db.query.services.findFirst({
        where: eq(services.id, serviceId)
      });
      if (!service) return [];
      duration = service.durationMinutes;
    }

    // 2. Definir horario base (MOCK: 08:00 AM - 08:00 PM)
    // TODO: En el futuro leer de branches.businessHours
    const dayStart = parseISO(`${dateStr}T08:00:00Z`);
    const dayEnd = parseISO(`${dateStr}T20:00:00Z`);

    // 3. Obtener rangos ocupados (bookings y bloqueos)
    const dayStartRange = startOfDay(parseISO(dateStr));
    const dayEndRange = endOfDay(parseISO(dateStr));

    // Consultar citas existentes
    const existingBookings = await db.select().from(bookings).where(
      and(
        eq(bookings.branchId, branchId),
        staffId ? eq(bookings.staffId, staffId) : undefined,
        gte(bookings.startTime, dayStartRange),
        lte(bookings.startTime, dayEndRange),
        not(eq(bookings.status, 'CANCELLED'))
      )
    );

    // Consultar bloqueos (vacaciones, descansos, etc)
    const existingBlocks = await db.select().from(blocks).where(
      and(
        eq(blocks.branchId, branchId),
        staffId ? or(isNull(blocks.staffId), eq(blocks.staffId, staffId)) : isNull(blocks.staffId),
        gte(blocks.startTime, dayStartRange),
        lte(blocks.startTime, dayEndRange)
      )
    );

    const occupiedRanges = [
      ...existingBookings.map(b => ({ start: b.startTime, end: b.endTime })),
      ...existingBlocks.map(b => ({ start: b.startTime, end: b.endTime }))
    ];

    // 4. Generar slots cada 30 minutos
    const slots = [];
    let currentSlot = dayStart;

    while (isBefore(currentSlot, dayEnd)) {
      const slotEnd = addMinutes(currentSlot, duration);

      // No permitir slots que terminen después del cierre
      if (isAfter(slotEnd, dayEnd)) break;

      // Validar solapamiento: max(start1, start2) < min(end1, end2)
      const isOverlap = occupiedRanges.some(range => {
        const overlapStart = max([currentSlot, range.start]);
        const overlapEnd = min([slotEnd, range.end]);
        return overlapStart < overlapEnd;
      });

      if (!isOverlap) {
        slots.push({
          time: format(currentSlot, "hh:mm a"),
          available: true
        });
      }

      currentSlot = addMinutes(currentSlot, 30);
    }

    return slots;
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return [];
  }
}

/**
 * Crea una nueva reserva en la base de datos.
 */
export async function createBookingAction(data: {
  tenantId: string;
  branchId: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  customerEmail: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    const [newBooking] = await db.insert(bookings).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      serviceId: data.serviceId,
      staffId: data.staffId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'CONFIRMED'
    }).returning();

    return { success: true, booking: newBooking };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { success: false, error: "Failed to create booking" };
  }
}

/**
 * Actualiza una reserva existente.
 */
export async function updateBookingAction(data: {
  id: string;
  tenantId: string;
  customerName?: string;
  customerEmail?: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
}) {
  try {
    await db.update(bookings)
      .set({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status as any,
      })
      .where(and(eq(bookings.id, data.id), eq(bookings.tenantId, data.tenantId)));

    return { success: true };
  } catch (error) {
    console.error("Error updating booking:", error);
    return { success: false, error: "Failed to update booking" };
  }
}

/**
 * Elimina (cancela) una reserva.
 */
export async function deleteBookingAction(id: string, tenantId: string) {
  try {
    await db.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)));
    return { success: true };
  } catch (error) {
    console.error("Error deleting booking:", error);
    return { success: false, error: "Failed to delete booking" };
  }
}

/**
 * Obtiene todas las reservas de un tenant con detalles de servicio y sucursal.
 */
export async function getBookingsAction(tenantId: string) {
  try {
    // 1. Auto-finalizar citas pasadas (Opcional: solo las CONFIRMED/PENDING)
    const now = new Date();
    await db.update(bookings)
      .set({ status: 'FINALIZADA' as any })
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          not(eq(bookings.status, 'CANCELLED')),
          not(eq(bookings.status, 'FINALIZADA')),
          lte(bookings.endTime, now)
        )
      );

    return await db.query.bookings.findMany({
      where: eq(bookings.tenantId, tenantId),
      with: {
        service: true,
        branch: true,
        staff: true
      },
      orderBy: [desc(bookings.startTime)]
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
}
