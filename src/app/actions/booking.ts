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
  allowPast: boolean = false,
  allowedStaffIds?: string[]
): Promise<{
  slots: any[],
  errorType: 'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null,
  allowSimultaneous?: boolean
}> {
  try {
    let duration = durationOverride;
    let serviceData = null;
    
    if (!duration || !serviceData) {
      serviceData = await db.query.services.findFirst({
        where: eq(services.id, serviceId)
      });
      if (!serviceData) return { slots: [], errorType: null };
      if (!duration) duration = serviceData.durationMinutes;
    }

    // 2. Obtener branch y tenant para timezone
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
      with: {
        tenant: true
      }
    });

    const timezone = branch?.tenant?.timezone || 'America/El_Salvador';
    const travelTime = (branch?.tenant as any)?.homeServiceTravelTime ?? 0;
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

    // 5b. Filtrar por categorías de servicio si se especificaron IDs permitidos
    if (allowedStaffIds && allowedStaffIds.length > 0) {
      finalActiveStaffIds = finalActiveStaffIds.filter(id => allowedStaffIds.includes(id));
    }

    if (finalActiveStaffIds.length === 0) return { slots: [], errorType: 'BRANCH_CLOSED' };

    // Si se pidió un staff específico, verificar si quedó en la lista de activos resolviendo prioridad y domicilio
    if (staffId && !finalActiveStaffIds.includes(staffId)) {
        return { slots: [], errorType: 'STAFF_UNAVAILABLE' };
    }

    const effectiveStaffIds = staffId ? [staffId] : finalActiveStaffIds;
    const totalStaffCount = effectiveStaffIds.length;

    // Sanitizar staffId para tratar nulos, undefined o strings "null" por igual
    const sanitizedStaffId = (!staffId || staffId === "null" || staffId === "") ? null : staffId;

    // Consultar citas existentes
    const existingBookings = await db.select().from(bookings).where(
      and(
        eq(bookings.branchId, branchId),
        sanitizedStaffId ? eq(bookings.staffId, sanitizedStaffId) : undefined,
        lte(bookings.startTime, dayEndRange),
        gte(bookings.endTime, dayStartRange),
        not(eq(bookings.status, 'CANCELLED'))
      )
    );

    // Consultar bloqueos (vacaciones, descansos, etc)
    // TECH LEAD: Obtenemos todos los bloqueos relevantes de una vez para filtrar en memoria
    const allBlocks = await db.select().from(blocks).where(
      and(
        or(eq(blocks.branchId, branchId), isNull(blocks.branchId)),
        lte(blocks.startTime, dayEndRange),
        gte(blocks.endTime, dayStartRange)
      )
    );

    // Filtrar bloqueos según si es consulta individual o global
    const relevantBlocks = allBlocks.filter(b => {
        // Bloqueo de sucursal (staffId es nulo en el bloque) aplica a todos
        if (!b.staffId) return true;
        // Bloqueo de staff específico aplica solo si consultamos a ese staff o si es búsqueda global
        if (sanitizedStaffId) return b.staffId === sanitizedStaffId;
        return true; 
    });

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

        const checkStaffIsFree = (sId: string) => {
           // 1. ¿Está asignado para trabajar en este horario?
           if (!staffIsAssignedInTime(sId)) return false;

           // Buffer de traslado para el NUEVO slot si es a domicilio
           const newSlotStart = isHomeService && travelTime > 0 ? addMinutes(slotStart, -travelTime) : slotStart;
           const newSlotEnd   = isHomeService && travelTime > 0 ? addMinutes(slotEnd,   travelTime)  : slotEnd;

           // 2. ¿Tiene una cita que se solape?
           // Las citas a domicilio existentes también expanden su ventana por el tiempo de traslado.
           const hasBookingConflict = existingBookings.some(b => {
              if (b.staffId !== sId) return false;
              const existStart = (b as any).isHomeService && travelTime > 0 ? addMinutes(b.startTime, -travelTime) : b.startTime;
              const existEnd   = (b as any).isHomeService && travelTime > 0 ? addMinutes(b.endTime,    travelTime)  : b.endTime;
              return isBefore(newSlotStart, existEnd) && isAfter(newSlotEnd, existStart);
           });
           if (hasBookingConflict) return false;

           // 3. ¿Tiene un bloqueo (descanso/vacación) que se solape?
           const hasBlockConflict = relevantBlocks.some(b =>
              b.staffId === sId && isBefore(newSlotStart, b.endTime) && isAfter(newSlotEnd, b.startTime)
           );
           if (hasBlockConflict) return false;

           return true;
        };

        // El bloque completo está bloqueado si la sucursal tiene un bloqueo global
        const checkStart = isHomeService && travelTime > 0 ? addMinutes(slotStart, -travelTime) : slotStart;
        const checkEnd   = isHomeService && travelTime > 0 ? addMinutes(slotEnd,    travelTime)  : slotEnd;
        const isBranchBlocked = relevantBlocks.some(b =>
           !b.staffId && isBefore(checkStart, b.endTime) && isAfter(checkEnd, b.startTime)
        );

        let isOccupied = false;
        let availableStaffForThisSlot: string[] = [];

        if (isBranchBlocked) {
          isOccupied = true;
        } else {
          if (sanitizedStaffId) {
            isOccupied = !checkStaffIsFree(sanitizedStaffId);
            if (!isOccupied) availableStaffForThisSlot = [sanitizedStaffId];
          } else {
            availableStaffForThisSlot = finalActiveStaffIds.filter(id => checkStaffIsFree(id));
            isOccupied = availableStaffForThisSlot.length === 0;
          }
        }

        const isPast = isBefore(slotStart, new Date());

        if (!isPast || allowPast) {
          slots.push({
            time: format(slotStart, "HH:mm"),
            available: !isOccupied && (!isPast || allowPast),
            staffId: sanitizedStaffId || undefined,
            availableStaffIds: !sanitizedStaffId ? availableStaffForThisSlot : undefined
          });
        }
        
        current = addMinutes(current, 15); // Intervalos de 15 minutos
      }
    });

    const anyAvailable = slots.some(s => s.available);
    let errorType: 'BRANCH_CLOSED' | 'STAFF_UNAVAILABLE' | null = null;
    
    if (!anyAvailable) {
      if (relevantBlocks.some(b => !b.staffId)) {
        errorType = 'BRANCH_CLOSED';
      } else {
        errorType = 'STAFF_UNAVAILABLE';
      }
    }

    return {
      slots,
      errorType,
      allowSimultaneous: serviceData?.allowSimultaneous ?? false
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
  isHomeService?: boolean;
  bookings: {
    branchId: string;
    serviceId: string;
    staffId: string;
    startTime: string; // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    endTime: string;   // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    price: string;
    allowedStaffIds?: string[]; // IDs de staff permitidos por filtro de categorías
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
      const sessionStaffAssignments: { staffId: string, start: Date, end: Date }[] = [];
      // Para modo bulk: el primer staff asignado se prefiere para el resto de la sesión
      let sessionPreferredStaffId: string | null = null;

      for (const bData of data.bookings) {
        const utcStart = convertToUtc(bData.startTime);
        const utcEnd = convertToUtc(bData.endTime);
        
        let assignedStaffId = bData.staffId;

        // Si el staffId es vacío/null o fue "Cualquiera", intentamos buscar uno disponible
        if (!assignedStaffId || assignedStaffId === "" || assignedStaffId === "null") {
          const slotTime = format(utcStart, 'HH:mm');

          // Intentar asignar el staff preferido de la sesión (para bulk: misma persona para todos los servicios)
          if (sessionPreferredStaffId) {
            const isInSessionConflict = sessionStaffAssignments.some(sas =>
              sas.staffId === sessionPreferredStaffId && sas.start < utcEnd && sas.end > utcStart
            );
            if (!isInSessionConflict) {
              const preferredData = await getAvailableSlots(
                format(utcStart, 'yyyy-MM-dd'),
                bData.serviceId,
                bData.branchId,
                sessionPreferredStaffId,
                undefined,
                !!data.zoneId
              );
              const preferredSlot = preferredData.slots.find(s => s.time === slotTime && s.available);
              if (preferredSlot) {
                assignedStaffId = sessionPreferredStaffId;
              }
            }
          }

          // Si aún no fue asignado, buscar entre los staff permitidos por categorías
          if (!assignedStaffId || assignedStaffId === "" || assignedStaffId === "null") {
           const availableData = await getAvailableSlots(
             format(utcStart, 'yyyy-MM-dd'),
             bData.serviceId,
             bData.branchId,
             null, // Cualquiera
             undefined,
             !!data.zoneId,
             false,
             bData.allowedStaffIds
           );

           // IMPORTANTE: Filtrar staff que YA fue asignado en esta misma sesión para este mismo horario
            const eligibleSlots = availableData.slots.filter(s => {
              const isTimeMatch = s.time === slotTime && s.available;
              if (!isTimeMatch) return false;

              const isAlreadyTakenInSession = sessionStaffAssignments.some(sas =>
                sas.staffId === s.staffId &&
                sas.start < utcEnd &&
                sas.end > utcStart
              );

              return !isAlreadyTakenInSession;
            });

            if (eligibleSlots.length === 0) {
              throw new Error("STAFF_UNAVAILABLE");
            }

            // Balanceo de Carga: Elegir uno al azar de los elegibles
            // IMPORTANTE: Un slot puede tener múltiples staff disponibles
            const randomSlot = eligibleSlots[Math.floor(Math.random() * eligibleSlots.length)];

            if (bData.staffId) {
                assignedStaffId = bData.staffId;
            } else {
                // Candidatos disponibles en ese slot que no estén ya asignados en esta sesión
                const possibleStaffIds = (randomSlot.availableStaffIds || []).filter((id: string) =>
                  !sessionStaffAssignments.some(sas => sas.staffId === id && sas.start < utcEnd && sas.end > utcStart)
                );

                if (possibleStaffIds.length === 0) throw new Error("STAFF_UNAVAILABLE");

                // Asignación equitativa: preferir al staff con menos citas ese día
                const dayStart = new Date(`${format(utcStart, 'yyyy-MM-dd')}T00:00:00Z`);
                const dayEnd   = new Date(`${format(utcStart, 'yyyy-MM-dd')}T23:59:59Z`);

                const dayBookings = await tx
                  .select({ staffId: bookings.staffId })
                  .from(bookings)
                  .where(
                    and(
                      eq(bookings.tenantId, data.tenantId),
                      not(eq(bookings.status, 'CANCELLED')),
                      gte(bookings.startTime, dayStart),
                      lte(bookings.startTime, dayEnd)
                    )
                  );

                const loadMap = new Map<string, number>();
                for (const b of dayBookings) {
                  if (b.staffId) loadMap.set(b.staffId, (loadMap.get(b.staffId) ?? 0) + 1);
                }

                const minLoad = Math.min(...possibleStaffIds.map((id: string) => loadMap.get(id) ?? 0));
                const leastLoaded = possibleStaffIds.filter((id: string) => (loadMap.get(id) ?? 0) === minLoad);

                assignedStaffId = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
            }
          } // end: inner if (!assignedStaffId after preferred check)
        } // end: outer if (Cualquiera)

        // Guardar el primer staff asignado como preferido para el resto de la sesión (bulk mode)
        if (!sessionPreferredStaffId && assignedStaffId) {
          sessionPreferredStaffId = assignedStaffId;
        }

        // 3c. Verificar solapamiento (Staff Ocupado en DB)
        const conflicts = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.tenantId, data.tenantId),
              eq(bookings.staffId, assignedStaffId),
              not(eq(bookings.status, 'CANCELLED')),
              lt(bookings.startTime, utcEnd),
              gt(bookings.endTime, utcStart)
            )
          )
          .limit(1);

        if (conflicts.length > 0) {
          throw new Error("STAFF_BUSY");
        }

        // Registrar asignación para la lógica de la sesión
        sessionStaffAssignments.push({ staffId: assignedStaffId, start: utcStart, end: utcEnd });

        const [nb] = await tx.insert(bookings).values({
          tenantId: data.tenantId,
          branchId: bData.branchId,
          serviceId: bData.serviceId,
          staffId: assignedStaffId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          startTime: utcStart,
          endTime: utcEnd,
          notes: data.notes,
          isHomeService: data.isHomeService ?? false,
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
