"use server";

import { db } from "@/db";
import { bookings, services, staff, blocks, branches, tenants, staffAssignments, bookingSessions } from "@/db/schema";
import { eq, and, gte, lte, or, isNull, desc, not, lt, gt } from "drizzle-orm";
import { addMinutes, format, parseISO, startOfDay, endOfDay, isBefore, isAfter, max, min } from "date-fns";
import { resend } from "@/lib/resend";
import { BookingConfirmationEmail } from "@/components/emails/BookingConfirmationEmail";
import { es } from "date-fns/locale";
import { getPlanFeatures } from "@/core/plans";
import { v4 as uuidv4 } from "uuid";

/**
 * Obtiene el desplazamiento en minutos de una zona horaria IANA.
 * Ej: 'America/El_Salvador' -> -360
 */
function getTimezoneOffsetInMinutes(timeZone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    if (!offsetPart) return 0;
    
    // offsetPart.value es algo como "GMT-6" o "GMT+1"
    const val = offsetPart.value;
    if (val === 'GMT') return 0;
    
    const [hoursStr, minutesStr] = val.replace('GMT', '').split(':');
    const hours = parseInt(hoursStr) || 0;
    const minutes = parseInt(minutesStr) || 0;
    
    // Si hours es negativo (ej -6), sumamos los minutos negativamente
    return hours * 60 + (hours < 0 ? -minutes : minutes);
  } catch (e) {
    console.error("Error calculating TZ offset:", e);
    return -360; // Fallback El Salvador
  }
}

/**
 * Normaliza el nombre del día a inglés minúsculas (formato usado en DB)
 */
function getDayNameInEnglish(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Calcula los slots de tiempo disponibles para un servicio, fecha y sucursal/staff específicos.
 */
export async function getAvailableSlots(
  dateStr: string,
  serviceId: string,
  branchId: string,
  staffId?: string | null,
  durationOverride?: number,
  isHomeService: boolean = false,
  allowPast: boolean = false
): Promise<{ slots: any[], errorType: 'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null }> {
  try {
    let duration = durationOverride;
    
    if (!duration) {
      const service = await db.query.services.findFirst({
        where: eq(services.id, serviceId)
      });
      if (!service) return { slots: [], errorType: null };
      duration = service.durationMinutes;
    }

    // 2. Obtener branch y tenant para timezone
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
      with: {
        tenant: true
      }
    });

    const timezone = branch?.tenant?.timezone || 'America/El_Salvador';
    const offsetMinutes = getTimezoneOffsetInMinutes(timezone, parseISO(dateStr));

    let activeSlots: { open: string; close: string }[] = [];
    let isOpen = false;

    if (branch?.businessHours) {
      try {
        const bh = JSON.parse(branch.businessHours);
        
        // Soporte para formato simplificado: {"open": "08:00", "close": "18:00"}
        if (bh.open && bh.close) {
          isOpen = true;
          activeSlots = [{ open: bh.open, close: bh.close }];
        } else {
          // Formato complejo: {"regular": {...}, "special": {...}}
          const dayOfWeek = getDayNameInEnglish(parseISO(dateStr));
          const special = bh.special?.[dateStr];
          const regular = bh.regular?.[dayOfWeek];

          const schedule = special || regular;
          if (schedule) {
            isOpen = schedule.isOpen;
            activeSlots = schedule.slots || [];
          }
        }
      } catch (e) {
        console.error("Error parsing business hours:", e);
      }
    }

    if (!isOpen || activeSlots.length === 0) return { slots: [], errorType: 'BRANCH_CLOSED' };

    // 3. Obtener rangos ocupados (bookings y bloqueos)
    const localTargetDate = parseISO(dateStr);
    const dayOfWeek = getDayNameInEnglish(localTargetDate);
    
    // Ajustar el rango del día local a UTC absoluto
    const localDayStart = startOfDay(localTargetDate);
    const localDayEnd = endOfDay(localTargetDate);
    
    const dayStartRange = addMinutes(localDayStart, -offsetMinutes);
    const dayEndRange = addMinutes(localDayEnd, -offsetMinutes);

    // 4. Identificar STAFF ACTIVO en esta sucursal para este día
    // Un staff está activo en esta sucursal si:
    // a) Tiene un override temporal (isPermanent=false) en ESTA sucursal para HOY.
    // b) O tiene una asignación permanente (isPermanent=true) en ESTA sucursal Y NO tiene ningún override temporal en OTRA sucursal para hoy.
    
    const utcDayStart = new Date(`${dateStr}T00:00:00Z`);
    const utcDayEnd   = new Date(`${dateStr}T23:59:59Z`);

    // Traemos TODAS las asignaciones de todos los staff para este día (de cualquier sucursal)
    // para poder detectar si alguien tiene un override en otro lugar.
    const allRellevantAssignments = await db.query.staffAssignments.findMany({
      where: and(
        eq(staffAssignments.tenantId, branch?.tenantId || ''),
        or(isNull(staffAssignments.startDate), lte(staffAssignments.startDate, utcDayEnd)),
        or(isNull(staffAssignments.endDate), gte(staffAssignments.endDate, utcDayStart))
      )
    });

    const activeStaffIds: string[] = [];
    const staffToAssignmentMap = new Map<string, any>();

    // Agrupar asignaciones por staff para resolver prioridad
    const assignmentsByStaff = allRellevantAssignments.reduce((acc, curr) => {
      if (!acc[curr.staffId]) acc[curr.staffId] = [];
      acc[curr.staffId].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(assignmentsByStaff).forEach(([sId, as]) => {
      // 1. Ver si tiene override temporal hoy (en cualquier sucursal)
      const temporalOverride = as.find(a => !a.isPermanent && a.daysOfWeek.includes(dayOfWeek));
      
      if (temporalOverride) {
        // Si el override es en ESTA sucursal, lo agregamos
        if (temporalOverride.branchId === branchId) {
          activeStaffIds.push(sId);
          staffToAssignmentMap.set(sId, temporalOverride);
        }
        // Si el override es en OTRA sucursal, ignoramos cualquier permanente que tenga aquí
      } else {
        // 2. Si no hay override, ver si tiene permanente en ESTA sucursal
        const permanentInBranch = as.find(a => a.isPermanent && a.branchId === branchId && a.daysOfWeek.includes(dayOfWeek));
        if (permanentInBranch) {
          activeStaffIds.push(sId);
          staffToAssignmentMap.set(sId, permanentInBranch);
        }
      }
    });
    if (activeStaffIds.length === 0) return { slots: [], errorType: 'BRANCH_CLOSED' };

    // 5. Filtrar por disponibilidad domiciliaria si es necesario
    let finalActiveStaffIds = activeStaffIds;
    if (isHomeService) {
      const staffDetails = await db.query.staff.findMany({
        where: or(...activeStaffIds.map(id => eq(staff.id, id)))
      });
      finalActiveStaffIds = staffDetails
        .filter(s => s.allowsHomeService !== false)
        .map(s => s.id);
    }

    if (finalActiveStaffIds.length === 0) return { slots: [], errorType: 'BRANCH_CLOSED' };

    // Si se pidió un staff específico, verificar si quedó en la lista de activos resolviendo prioridad y domicilio
    if (staffId && !finalActiveStaffIds.includes(staffId)) {
        return { slots: [], errorType: 'STAFF_UNAVAILABLE' };
    }

    const effectiveStaffIds = staffId ? [staffId] : finalActiveStaffIds;
    const totalStaffCount = effectiveStaffIds.length;

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

    // Consultar bloqueos (vacaciones, descansos, etc)
    const existingBlocks = await db.select().from(blocks).where(
      and(
        or(eq(blocks.branchId, branchId), isNull(blocks.branchId)),
        staffId ? or(isNull(blocks.staffId), eq(blocks.staffId, staffId)) : isNull(blocks.staffId),
        lte(blocks.startTime, dayEndRange),
        gte(blocks.endTime, dayStartRange)
      )
    );

    const occupiedRanges = [
      ...existingBookings.map(b => ({ start: b.startTime, end: b.endTime, staffId: b.staffId })),
      ...existingBlocks.map(b => ({ start: b.startTime, end: b.endTime, staffId: b.staffId }))
    ];

    // 5. Generar todos los slots posibles según los tramos horarios activos
    const slots: any[] = [];
    
    activeSlots.forEach(tramo => {
      // Generar tiempo "de pared" inicial en UTC y luego desplazarlo para que sea el UTC real
      // Ej: dateStr + "08:00:00Z" -> 8 AM UTC. Si offset es -360, movemos a 2 PM UTC.
      const localTramoStart = parseISO(`${dateStr}T${tramo.open}:00Z`);
      const localTramoEnd = parseISO(`${dateStr}T${tramo.close}:00Z`);
      
      let current = addMinutes(localTramoStart, -offsetMinutes);
      const tramoEndUtc = addMinutes(localTramoEnd, -offsetMinutes);

      while (isBefore(addMinutes(current, duration), tramoEndUtc) || format(addMinutes(current, duration), 'HH:mm') === tramo.close) {
        const slotStart = current;
        const slotEnd = addMinutes(current, duration);
        
        const shiftedStart = addMinutes(slotStart, offsetMinutes);
        const shiftedEnd = addMinutes(slotEnd, offsetMinutes);
        
        const localSlotStartStr = `${String(shiftedStart.getUTCHours()).padStart(2, '0')}:${String(shiftedStart.getUTCMinutes()).padStart(2, '0')}`;
        const localSlotEndStr = `${String(shiftedEnd.getUTCHours()).padStart(2, '0')}:${String(shiftedEnd.getUTCMinutes()).padStart(2, '0')}`;
        
        const staffIsAssignedInTime = (staffIdCheck: string) => {
           const a = staffToAssignmentMap.get(staffIdCheck);
           if (!a) return false;
           
           const assignStart = a.startTime || '00:00';
           const assignEnd = a.endTime || '23:59';
           return localSlotStartStr >= assignStart && localSlotEndStr <= assignEnd;
        };
        
        let isOccupied = false;

        if (staffId) {
          if (!staffIsAssignedInTime(staffId)) {
            isOccupied = true;
          } else {
            isOccupied = [
              ...existingBookings.map(b => ({ start: b.startTime, end: b.endTime })),
              ...existingBlocks.map(b => ({ start: b.startTime, end: b.endTime }))
            ].some(range => isBefore(slotStart, range.end) && isAfter(slotEnd, range.start));
          }
        } else {
          const hasBranchBlock = existingBlocks.filter(b => !b.staffId).some(b => 
            isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)
          );

          if (hasBranchBlock) {
            isOccupied = true;
          } else {
            const busyStaffIds = new Set<string>();
            existingBookings.forEach(b => {
              if (isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)) busyStaffIds.add(b.staffId);
            });
            existingBlocks.forEach(b => {
              if (b.staffId && isBefore(slotStart, b.endTime) && isAfter(slotEnd, b.startTime)) busyStaffIds.add(b.staffId);
            });
            const availableStaffIds = activeStaffIds.filter((id) => typeof id === 'string' && staffIsAssignedInTime(id) && !busyStaffIds.has(id));
            isOccupied = availableStaffIds.length === 0;
          }
        }

        const isPast = isBefore(slotStart, new Date());

        // Si no se permite el pasado, no agregamos slots que ya pasaron
        if (!isPast || allowPast) {
          slots.push({
            time: format(slotStart, "HH:mm"),
            available: !isOccupied && (!isPast || allowPast)
          });
        }
        
        current = addMinutes(current, 15); // Intervalos de 15 minutos
      }
    });

    const anyAvailable = slots.some(s => s.available);
    let errorType: 'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null = null;
    
    if (!anyAvailable) {
      if (existingBlocks.some(b => !b.staffId)) {
        errorType = 'BRANCH_CLOSED';
      } else {
        errorType = 'STAFF_UNAVAILABLE';
      }
    }

    return {
      slots,
      errorType
    };
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return { slots: [], errorType: null };
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
    // 1. Verificar solapamiento (Aislamiento de personal)
    const conflict = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.tenantId, data.tenantId),
        eq(bookings.staffId, data.staffId),
        not(eq(bookings.status, 'CANCELLED')),
        and(
          lt(bookings.startTime, data.endTime),
          gt(bookings.endTime, data.startTime)
        )
      )
    });

    if (conflict) {
      return { success: false, error: "STAFF_BUSY" };
    }

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

    // 3. Enviar Correo de Confirmación
    try {
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, data.tenantId) });
      const service = await db.query.services.findFirst({ where: eq(services.id, data.serviceId) });
      const branch = await db.query.branches.findFirst({ where: eq(branches.id, data.branchId) });
      const staffMember = await db.query.staff.findFirst({ where: eq(staff.id, data.staffId) });

      if (tenant && service && branch) {
        console.log(`[Email] Intentando enviar a ${data.customerEmail} para tenant ${tenant.name}`);
        try {
          const result = await resend.emails.send({
            from: 'ZyncSlot <onboarding@resend.dev>', // Cambiado temporalmente para asegurar entrega en cuentas no verificadas
            to: data.customerEmail,
            subject: `Cita Confirmada - ${tenant.name}`,
            react: BookingConfirmationEmail({
              customerName: data.customerName,
              serviceName: service.name,
              date: format(data.startTime, "EEEE, d 'de' MMMM", { locale: es }),
              time: format(data.startTime, "hh:mm a"),
              branchName: branch.name,
              staffName: staffMember?.name,
              tenantName: tenant.name,
              tenantLogo: tenant.logoUrl || undefined,
              customBody: tenant.emailBodyTemplate
            }),
          });
          console.log(`[Email] Respuesta de Resend:`, result);
        } catch (innerError: any) {
          console.error("[Email] Error en la llamada a Resend:", innerError?.message || innerError);
        }
      }
    } catch (emailError: any) {
      console.error("[Email] Error crítico al enviar:", emailError?.message || emailError);
      // No fallamos la acción si el email falla, pero lo logueamos
    }

    return { success: true, booking: newBooking };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { success: false, error: "Failed to create booking" };
  }
}

/**
 * Crea una sesión de reserva con múltiples citas.
 */
export async function createBookingSessionAction(data: {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  zoneId?: string;
  notes?: string;
  bookings: {
    branchId: string;
    serviceId: string;
    staffId: string;
    startTime: string; // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    endTime: string;   // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    price: string;
  }[];
}) {
  try {
    // 1. Validar Plan del Tenant
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, data.tenantId) });
    if (!tenant) return { success: false, error: "Tenant not found" };

    const features = getPlanFeatures(tenant.plan);

    // Si intenta agendar más de 1 servicio pero su plan no lo permite (Omitido para admin temporario)
    // if (data.bookings.length > 1 && !features.multiServiceBooking) {
    //   return { success: false, error: "MULTI_SERVICE_NOT_ALLOWED" };
    // }

    // 2. Calcular Tarifa de Traslado (Servidor)
    let transferTotal = 0;
    if (data.zoneId) {
      const zone = await db.query.coverageZones.findFirst({ where: (gz, { eq }) => eq(gz.id, data.zoneId!) });
      if (zone) {
        const zoneFee = parseFloat(zone.fee);
        let blocksCount = 1;
        
        // Ordenar citas por tiempo convirtiendo el string a objeto local Date para su comparación
        const sorted = [...data.bookings]
          .map(b => ({ ...b, parsedDate: new Date(b.startTime) }))
          .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i-1];
          const curr = sorted[i];
          
          const isDifferentDay = format(prev.parsedDate, 'yyyy-MM-dd') !== format(curr.parsedDate, 'yyyy-MM-dd');
          const isDifferentStaff = prev.staffId !== curr.staffId;
          const prevEndTimeMs = new Date(prev.endTime).getTime();
          const hasGap = curr.parsedDate.getTime() > prevEndTimeMs;
          
          if (isDifferentDay || isDifferentStaff || hasGap) {
            blocksCount++;
          }
        }
        transferTotal = blocksCount * zoneFee;
      }
    }

    const servicesTotal = data.bookings.reduce((sum, b) => sum + parseFloat(b.price), 0);
    const finalTotalPrice = (servicesTotal + transferTotal).toFixed(2);

    // 2.5 Normalizar fechas según Timezone del Tenant
    const tenantTz = tenant.timezone || 'America/El_Salvador';
    
    // Función auxiliar para convertir string local a Date UTC usando el offset del tenant
    const convertToUtc = (localIso: string) => {
      // localIso format: YYYY-MM-DDTHH:mm:ss. Se extrae manual para evitar colisiones con el Timezone del Node.
      const [datePart, timePart] = localIso.split('T');
      const [yyyy, mm, dd] = datePart.split('-').map(Number);
      const [HH, min, ss] = (timePart || '00:00:00').split(':').map(Number);
      
      const nominalUtc = new Date(Date.UTC(yyyy, mm - 1, dd, HH, min, ss || 0));
      const offset = getTimezoneOffsetInMinutes(tenantTz, nominalUtc);
      return new Date(nominalUtc.getTime() - offset * 60000);
    };

    // 3. Transacción de Base de Datos
    // NOTA: Usamos tx.select() en lugar de tx.query.X.findFirst() dentro de la transacción
    // para garantizar que se use la misma conexión y evitar deadlocks con el pool.
    const result = await db.transaction(async (tx) => {
      // 3a. Crear la sesión agrupadora
      const [session] = await tx.insert(bookingSessions).values({
        tenantId: data.tenantId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        zoneId: data.zoneId,
        notes: data.notes,
        totalPrice: finalTotalPrice,
        status: data.zoneId ? 'PENDING' : 'CONFIRMED'
      }).returning();

      // 3b. Crear cada booking individual, verificando conflictos primero
      const newBookings = [];
      for (const bData of data.bookings) {
        const utcStart = convertToUtc(bData.startTime);
        const utcEnd = convertToUtc(bData.endTime);

        // 3c. Verificar solapamiento usando select() para mantener la misma conexión de TX
        const conflicts = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.tenantId, data.tenantId),
              eq(bookings.staffId, bData.staffId),
              not(eq(bookings.status, 'CANCELLED')),
              lt(bookings.startTime, utcEnd),
              gt(bookings.endTime, utcStart)
            )
          )
          .limit(1);

        if (conflicts.length > 0) {
          throw new Error("STAFF_BUSY");
        }

        const [nb] = await tx.insert(bookings).values({
          tenantId: data.tenantId,
          branchId: bData.branchId,
          serviceId: bData.serviceId,
          staffId: bData.staffId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          startTime: utcStart,
          endTime: utcEnd,
          notes: data.notes,
          sessionId: session.id,
          status: data.zoneId ? 'PENDING' : 'CONFIRMED'
        }).returning();
        newBookings.push(nb);
      }

      return { session, bookings: newBookings };
    });

    // 4. Enviar Correo de Confirmación (fire-and-forget: no bloqueamos la respuesta al usuario)
    // El await es intencional para no bloquear el return del success.
    // Si el correo falla, simplemente se loguea y el usuario recibe la confirmación de todas formas.
    Promise.resolve().then(async () => {
      try {
        const firstBooking = data.bookings[0];
        const [service, branch, staffMember] = await Promise.all([
          db.query.services.findFirst({ where: eq(services.id, firstBooking.serviceId) }),
          db.query.branches.findFirst({ where: eq(branches.id, firstBooking.branchId) }),
          db.query.staff.findFirst({ where: eq(staff.id, firstBooking.staffId) }),
        ]);

        if (service && branch) {
          const startDate = parseISO(firstBooking.startTime);
          await resend.emails.send({
            from: 'ZyncSlot <onboarding@resend.dev>',
            to: data.customerEmail,
            subject: `${data.bookings.length > 1 ? 'Sesión de Reservas Confirmada' : 'Cita Confirmada'} - ${tenant.name}`,
            react: BookingConfirmationEmail({
              customerName: data.customerName,
              serviceName: service.name + (data.bookings.length > 1 ? ` (+${data.bookings.length - 1} más)` : ''),
              date: format(startDate, "EEEE, d 'de' MMMM", { locale: es }),
              time: format(startDate, "hh:mm a"),
              branchName: branch.name,
              staffName: staffMember?.name,
              tenantName: tenant.name,
              tenantLogo: tenant.logoUrl || undefined,
              customBody: tenant.emailBodyTemplate
            }),
          });
        }
      } catch (emailError) {
        console.error("[createBookingSessionAction] Email send failed (non-critical):", emailError);
      }
    });

    return { success: true, session: result.session, bookings: result.bookings };
  } catch (error) {
    console.error("Error creating booking session:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create booking session" };
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
    // 1. Verificar solapamiento si se cambió el horario o personal
    if (data.startTime && data.endTime) {
      const conflict = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.tenantId, data.tenantId),
          eq(bookings.staffId, data.staffId || ''),
          not(eq(bookings.id, data.id)), // Ignorar la cita actual
          not(eq(bookings.status, 'CANCELLED')),
          and(
            lt(bookings.startTime, data.endTime),
            gt(bookings.endTime, data.startTime)
          )
        )
      });

      if (conflict) {
        return { success: false, error: "STAFF_BUSY" };
      }
    }

    await db.update(bookings)
      .set({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status as any,
        notes: (data as any).notes,
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
 * Obtiene una reserva por ID con todos sus detalles.
 */
export async function getBookingAction(id: string) {
  try {
    return await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        service: true,
        branch: true,
        staff: true,
        tenant: true
      }
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
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
