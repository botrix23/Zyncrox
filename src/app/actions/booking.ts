"use server";

import { db } from "@/db";
import { bookings, services, staff, blocks, branches } from "@/db/schema";
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

    // 2. Obtener horario del branch
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId)
    });

    let dayStart = parseISO(`${dateStr}T08:00:00Z`);
    let dayEnd = parseISO(`${dateStr}T20:00:00Z`);
    let activeSlots: { open: string; close: string }[] = [{ open: '08:00', close: '20:00' }];
    let isOpen = true;

    if (branch?.businessHours) {
      try {
        const bh = JSON.parse(branch.businessHours);
        const dayOfWeek = format(parseISO(dateStr), 'EEEE').toLowerCase(); // monday, etc.
        const special = bh.special?.[dateStr];
        const regular = bh.regular?.[dayOfWeek];

        const schedule = special || regular;
        if (schedule) {
          isOpen = schedule.isOpen;
          activeSlots = schedule.slots || [];
        }
      } catch (e) {
        console.error("Error parsing business hours:", e);
      }
    }

    if (!isOpen || activeSlots.length === 0) return [];

    // 3. Obtener rangos ocupados (bookings y bloqueos)
    const dayStartRange = startOfDay(parseISO(dateStr));
    const dayEndRange = endOfDay(parseISO(dateStr));

    // Consultar citas existentes
    const existingBookings = await db.select().from(bookings).where(
      and(
        eq(bookings.branchId, branchId),
        staffId ? eq(bookings.staffId, staffId) : undefined,
        lte(bookings.startTime, dayEndRange),
        gte(bookings.endTime, dayStartRange),
        not(eq(bookings.status, 'CANCELLED'))
      )
    );

    const branchStaff = await db.select().from(staff).where(eq(staff.branchId, branchId));
    const totalStaffCount = branchStaff.length || 1;

    // Consultar bloqueos (vacaciones, descansos, etc)
    const existingBlocks = await db.select().from(blocks).where(
      and(
        eq(blocks.branchId, branchId),
        staffId ? or(isNull(blocks.staffId), eq(blocks.staffId, staffId)) : isNull(blocks.staffId),
        lte(blocks.startTime, dayEndRange),
        gte(blocks.endTime, dayStartRange)
      )
    );

    const occupiedRanges = [
      ...existingBookings.map(b => ({ start: b.startTime, end: b.endTime })),
      ...existingBlocks.map(b => ({ start: b.startTime, end: b.endTime }))
    ];

    // 5. Generar todos los slots posibles según los tramos horarios activos
    const slots: any[] = [];
    
    activeSlots.forEach(tramo => {
      let current = parseISO(`${dateStr}T${tramo.open}:00Z`);
      const tramoEnd = parseISO(`${dateStr}T${tramo.close}:00Z`);

      while (isBefore(addMinutes(current, duration), tramoEnd) || format(addMinutes(current, duration), 'HH:mm') === tramo.close) {
        const slotStart = current;
        const slotEnd = addMinutes(current, duration);
        
        let isOccupied = false;

        if (staffId) {
          isOccupied = [
            ...existingBookings.map(b => ({ start: b.startTime, end: b.endTime })),
            ...existingBlocks.map(b => ({ start: b.startTime, end: b.endTime }))
          ].some(range => isBefore(slotStart, range.end) && isAfter(slotEnd, range.start));
        } else {
          const hasBranchBlock = existingBlocks.filter(b => !b.staffId).some(b => 
            isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)
          );

          if (hasBranchBlock) {
            isOccupied = true;
          } else {
            const busyStaffIds = new Set();
            existingBookings.forEach(b => {
              if (isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)) busyStaffIds.add(b.staffId);
            });
            existingBlocks.forEach(b => {
              if (b.staffId && isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)) busyStaffIds.add(b.staffId);
            });
            isOccupied = busyStaffIds.size >= totalStaffCount;
          }
        }

        slots.push({
          time: format(slotStart, "HH:mm"),
          available: !isOccupied
        });
        
        current = addMinutes(current, 15); // Intervalos de 15 minutos
      }
    });

    // Consolidar slots por tiempo (si hay múltiples tramos que se solapan o para manejar Anyone)
    // Para simplificar, si el mismo tiempo aparece varias veces, es disponible si alguno es disponible.
    // Pero aquí solo tenemos un branch y (opcionalmente) un staff.
    
    return slots as any;
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
  customerPhone?: string;
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
      customerPhone: data.customerPhone,
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
  customerPhone?: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
}) {
  try {
    await db.update(bookings)
      .set({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
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
