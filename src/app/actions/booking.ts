"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { db } from "@/db";
import { bookings, services, staff, blocks, branches, tenants, staffAssignments, bookingSessions, slotLocks, reviews } from "@/db/schema";
import { eq, and, gte, lte, or, isNull, desc, not, lt, gt, ne, inArray } from "drizzle-orm";
import { addMinutes, format, parseISO, startOfDay, endOfDay, isBefore, isAfter, max, min } from "date-fns";
import { resend } from "@/lib/resend";
import { BookingConfirmationEmail } from "@/components/emails/BookingConfirmationEmail";
import { BookingCancellationEmail } from "@/components/emails/BookingCancellationEmail";
import { BookingRescheduleEmail } from "@/components/emails/BookingRescheduleEmail";
import { SurveyInviteEmail } from "@/components/emails/SurveyInviteEmail";
import { getPlatformEmailTemplates, buildEmailPayload } from "@/lib/emailTemplates";
import { formatEmailDate, formatEmailTime, t as emailT, type EmailLocale } from "@/lib/emailI18n";
import React from "react";
import { es } from "date-fns/locale";
import { getPlanFeatures } from "@/core/plans";
import { v4 as uuidv4 } from "uuid";
import { earnPointsForBookingAction } from "@/app/actions/loyalty";
import { logAuditEvent } from "@/lib/audit";

/**
 * Envía un email con hasta `maxRetries` reintentos con backoff exponencial.
 * Silencia el error final para no bloquear el flujo de reserva.
 */
async function sendWithRetry(
  payload: Parameters<typeof resend.emails.send>[0],
  maxRetries = 2
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(payload);
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`[sendWithRetry] All ${maxRetries + 1} attempts failed:`, err);
        return; // no-throw: el email es no-crítico
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // 1s, 2s
    }
  }
}

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
  return days[date.getUTCDay()];
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
  allowedStaffIds?: string[],
  simultaneousCount: number = 1,
  sessionToken?: string  // token de la sesión actual (sus propios locks NO bloquean)
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

        // Formato: {"regular": {...}, "special": {...}}
        const dayOfWeek = getDayNameInEnglish(parseISO(dateStr));
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

    if (!isOpen || activeSlots.length === 0) {
      return { slots: [], errorType: 'BRANCH_CLOSED' };
    }

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

    // 4b. Descartar staff desactivado (isActive = false).
    // staffAssignments no guarda el estado activo/inactivo del empleado,
    // así que hay que consultarlo ahora para no ofrecer slots con staff desactivado.
    const activeStaffRecords = await db.query.staff.findMany({
      where: and(
        inArray(staff.id, activeStaffIds),
        eq(staff.isActive, true)
      ),
      columns: { id: true, allowsHomeService: true }
    });
    const enabledStaffIdSet = new Set(activeStaffRecords.map(s => s.id));

    // Limpiar activeStaffIds y staffToAssignmentMap para excluir desactivados
    const prunedActiveStaffIds = activeStaffIds.filter(id => enabledStaffIdSet.has(id));
    // Eliminar del mapa los que quedaron excluidos
    for (const id of activeStaffIds) {
      if (!enabledStaffIdSet.has(id)) staffToAssignmentMap.delete(id);
    }

    if (prunedActiveStaffIds.length === 0) return { slots: [], errorType: 'BRANCH_CLOSED' };

    // 5. Filtrar por disponibilidad domiciliaria si es necesario
    let finalActiveStaffIds = prunedActiveStaffIds;
    if (isHomeService) {
      finalActiveStaffIds = finalActiveStaffIds.filter(id => {
        const rec = activeStaffRecords.find(s => s.id === id);
        return rec?.allowsHomeService !== false;
      });
    }

    // 5b. Filtrar por categorías de servicio si se especificaron IDs permitidos.
    // IMPORTANTE: solo aplicar el filtro con los IDs que realmente están activos en ESTA sucursal.
    // Si allowedStaffIds contiene staff de otras sucursales (inconsistencia cliente/servidor),
    // ignorar esos IDs en vez de fallar con BRANCH_CLOSED.
    if (allowedStaffIds && allowedStaffIds.length > 0) {
      const relevantAllowed = allowedStaffIds.filter(id => activeStaffIds.includes(id));
      if (relevantAllowed.length > 0) {
        // Hay staff permitido Y activo en esta sucursal → filtrar solo a ellos
        finalActiveStaffIds = finalActiveStaffIds.filter(id => relevantAllowed.includes(id));
      }
      // Si relevantAllowed.length === 0: ninguno de los "permitidos" está en esta sucursal.
      // Esto puede pasar cuando el cliente envía IDs de otra sucursal.
      // En ese caso NO aplicamos el filtro → usamos todos los activos de la sucursal.
    }

    if (finalActiveStaffIds.length === 0) {
      return { slots: [], errorType: 'BRANCH_CLOSED' };
    }

    // Si se pidió un staff específico, verificar si quedó en la lista de activos resolviendo prioridad y domicilio
    if (staffId && !finalActiveStaffIds.includes(staffId)) {
        return { slots: [], errorType: 'STAFF_UNAVAILABLE' };
    }

    // 5c. Cargar soft locks activos para este servicio+fecha (de OTRAS sesiones)
    // Cada lock reduce la disponibilidad: si staffId está en el lock, ese staff queda reservado;
    // si staffId es null en el lock, reserva un cupo anónimo (reduce el conteo disponible por 1).
    const activeLocks = sessionToken
      ? await db.select().from(slotLocks).where(
          and(
            eq(slotLocks.tenantId, branch?.tenantId || ''),
            eq(slotLocks.serviceId, serviceId),
            eq(slotLocks.date, dateStr),
            ne(slotLocks.sessionToken, sessionToken),
            gt(slotLocks.expiresAt, new Date())
          )
        )
      : [];

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

    // Consultar bloqueos (vacaciones, descansos, etc) — excluye cancelados
    const allBlocks = await db.select().from(blocks).where(
      and(
        or(eq(blocks.branchId, branchId), isNull(blocks.branchId)),
        lte(blocks.startTime, dayEndRange),
        gte(blocks.endTime, dayStartRange)
      )
    );
    // Filtrar cancelados en memoria: compatibilidad si la columna status aún no existe en la DB
    const activeBlocks = allBlocks.filter(b => !(b as any).status || (b as any).status !== 'CANCELLED');

    // Filtrar bloqueos según si es consulta individual o global
    const relevantBlocks = activeBlocks.filter(b => {
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

      // Incluir slots cuyo fin está ANTES o EXACTAMENTE en el cierre del tramo (en UTC).
      // La comparación anterior usaba format() en UTC vs tramo.close en hora local,
      // lo que excluía el slot que termina exactamente a la hora de cierre (ej: 10:00 con 120 min hasta las 12:00).
      while (!isAfter(addMinutes(current, duration), tramoEndUtc)) {
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
            // Aplicar soft locks: locks con staffId específico eliminan ese staff del pool;
            // locks sin staffId (cualquiera) reducen el conteo en 1 por cada lock activo en este slot.
            const slotTimeStr = localSlotStartStr;
            const locksForThisSlot = activeLocks.filter(l => l.time === slotTimeStr);
            for (const lock of locksForThisSlot) {
              if (lock.staffId) {
                availableStaffForThisSlot = availableStaffForThisSlot.filter(id => id !== lock.staffId);
              } else {
                availableStaffForThisSlot = availableStaffForThisSlot.slice(1); // quita uno anónimo
              }
            }
            // En modo simultáneo: necesitamos ≥ simultaneousCount staff libres al mismo tiempo
            isOccupied = availableStaffForThisSlot.length < simultaneousCount;
          }
        }

        const isPast = isBefore(slotStart, new Date());

        if (!isPast || allowPast) {
          slots.push({
            time: localSlotStartStr,
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
          const emailCfg = await getPlatformEmailTemplates();
          const locale = (tenant.emailLocale as EmailLocale) || 'es';
          const emailTz = tenant.timezone || 'America/El_Salvador';
          const vars = {
            customerName: data.customerName,
            serviceName: service.name,
            date: formatEmailDate(data.startTime, locale, emailTz),
            time: formatEmailTime(data.startTime, emailTz),
            branchName: branch.name,
            staffName: tenant.plan !== 'BASIC' && staffMember ? staffMember.name : '',
            tenantName: tenant.name,
            phone: tenant.whatsappNumber || branch.phone || '',
            contactEmail: (tenant as any).contactEmail || '',
          };
          const emailPayload = buildEmailPayload(
            emailCfg?.emailTplConfirmation,
            React.createElement(BookingConfirmationEmail, {
              ...vars,
              locale,
              tenantLogo: tenant.logoUrl || undefined,
              customBody: tenant.emailBodyTemplate,
              phone: tenant.whatsappNumber || branch.phone || undefined,
              contactEmail: (tenant as any).contactEmail || undefined,
              primaryColor: tenant.primaryColor || undefined,
            }),
            vars
          );
          const result = await resend.emails.send({
            from: `${tenant.name} <notificaciones@zyncrox.com>`,
            replyTo: (tenant as any).contactEmail || undefined,
            to: data.customerEmail,
            subject: emailT.confirmationSubject(tenant.name, 1, locale),
            ...emailPayload,
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
  travelTimeOverride?: number | null;
  isAdmin?: boolean; // permite agendar en horarios pasados (ej: registrar cita walk-in)
  sessionToken?: string; // para liberar soft locks al confirmar
  schedulingMode?: 'bulk' | 'separate'; // bulk = mismo especialista preferido; separate = balanceo independiente
  bookings: {
    branchId: string;
    serviceId: string;
    staffId: string;
    startTime: string; // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    endTime: string;   // Recibimos como string local "YYYY-MM-DDTHH:mm:ss"
    price: string;
    allowedStaffIds?: string[]; // IDs de staff permitidos por filtro de categorías
    isSimultaneous?: boolean; // Servicio marcado como simultáneo (cada uno viaja aparte en domicilio)
  }[];
}) {
  try {
    // 1. Validar Plan del Tenant
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, data.tenantId) });
    if (!tenant) return { success: false, error: "Tenant not found" };

    // Bloquear reservas si el tenant está suspendido
    if (tenant.status === 'SUSPENDED') {
      return { success: false, error: "TENANT_SUSPENDED" };
    }

    const features = getPlanFeatures(tenant.plan);

    if (data.bookings.length > 1 && !features.multiServiceBooking) {
      return { success: false, error: "MULTI_SERVICE_NOT_ALLOWED" };
    }

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
          // Simultaneous: each staff member makes a separate trip
          const isSimultaneous = prev.isSimultaneous && curr.isSimultaneous
            && prev.parsedDate.getTime() === curr.parsedDate.getTime();

          if (isSimultaneous || isDifferentDay || isDifferentStaff || hasGap) {
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

    // 3. Pre-transaction validation & diagnostic log
    console.log(`[createBookingSessionAction] START tenantId=${data.tenantId} customer=${data.customerEmail} numBookings=${data.bookings.length} bookings=${JSON.stringify(data.bookings.map(b => ({ svc: b.serviceId?.slice(0,8), branch: b.branchId?.slice(0,8), staff: b.staffId || 'any', start: b.startTime })))}`);

    // Validate required fields before entering transaction
    for (let i = 0; i < data.bookings.length; i++) {
      const b = data.bookings[i];
      if (!b.branchId) {
        console.error(`[createBookingSessionAction] VALIDATION_FAIL booking[${i}] missing branchId`);
        return { success: false, error: 'MISSING_BRANCH' };
      }
      if (!b.serviceId) {
        console.error(`[createBookingSessionAction] VALIDATION_FAIL booking[${i}] missing serviceId`);
        return { success: false, error: 'MISSING_SERVICE' };
      }
    }

    // 4. Transacción de Base de Datos
    const result = await db.transaction(async (tx) => {
      // 4a. Crear la sesión agrupadora
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
          // Convertir utcStart a hora local del tenant para comparar con los slots de getAvailableSlots
          // (getAvailableSlots devuelve tiempos en hora local, no UTC)
          const tzOffset = getTimezoneOffsetInMinutes(tenantTz, utcStart);
          const localStartForSlot = new Date(utcStart.getTime() + tzOffset * 60000);
          const slotTime = `${String(localStartForSlot.getUTCHours()).padStart(2, '0')}:${String(localStartForSlot.getUTCMinutes()).padStart(2, '0')}`;
          const slotDate = format(localStartForSlot, 'yyyy-MM-dd');

          // En modo bulk secuencial: intentar reusar el mismo especialista para continuidad.
          // En modo separate: cada servicio elige independientemente por balanceo de carga.
          // El staff preferido solo aplica si además tiene las categorías requeridas.
          if (sessionPreferredStaffId && data.schedulingMode === 'bulk') {
            const isAllowedForThisService = !bData.allowedStaffIds || bData.allowedStaffIds.includes(sessionPreferredStaffId);
            const isInSessionConflict = sessionStaffAssignments.some(sas =>
              sas.staffId === sessionPreferredStaffId && sas.start < utcEnd && sas.end > utcStart
            );
            if (isAllowedForThisService && !isInSessionConflict) {
              const preferredData = await getAvailableSlots(
                slotDate,
                bData.serviceId,
                bData.branchId,
                sessionPreferredStaffId,
                undefined,
                !!data.zoneId,
                !!data.isAdmin // allowPast: admin puede registrar citas en horario pasado
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
             slotDate,
             bData.serviceId,
             bData.branchId,
             null, // Cualquiera
             undefined,
             !!data.zoneId,
             !!data.isAdmin, // allowPast: admin puede registrar citas en horario pasado
             bData.allowedStaffIds
           );

           // DIAGNÓSTICO: log para detectar por qué no hay slots elegibles
           console.log(`[createBookingSession] DIAG slotDate=${slotDate} slotTime=${slotTime} branchId=${bData.branchId} serviceId=${bData.serviceId} allowedStaffIds=${JSON.stringify(bData.allowedStaffIds)} errorType=${availableData.errorType} totalSlots=${availableData.slots.length} availableSlots=${availableData.slots.filter(s => s.available).length} slotsAtTime=${JSON.stringify(availableData.slots.filter(s => s.time === slotTime))}`);

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
              console.error(`[createBookingSession] STAFF_UNAVAILABLE — no eligible slots. slotTime=${slotTime} slotDate=${slotDate} utcStart=${utcStart.toISOString()} errorType=${availableData.errorType}`);
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

                // Asignación equitativa: preferir al staff con menos citas en el mes de la cita
                const yearMonth = format(utcStart, 'yyyy-MM');
                const monthStart = new Date(`${yearMonth}-01T00:00:00Z`);
                const nextMonth = new Date(monthStart);
                nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

                const monthBookings = await tx
                  .select({ staffId: bookings.staffId })
                  .from(bookings)
                  .where(
                    and(
                      eq(bookings.tenantId, data.tenantId),
                      not(eq(bookings.status, 'CANCELLED')),
                      gte(bookings.startTime, monthStart),
                      lt(bookings.startTime, nextMonth)
                    )
                  );

                const loadMap = new Map<string, number>();
                for (const b of monthBookings) {
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
          travelTimeOverride: data.travelTimeOverride ?? null,
          sessionId: session.id,
          status: data.zoneId ? 'PENDING' : 'CONFIRMED'
        }).returning();
        newBookings.push(nb);
      }

      console.log(`[createBookingSessionAction] TX committed: sessionId=${session.id} tenantId=${data.tenantId} bookingIds=[${newBookings.map(b => b.id).join(',')}] count=${newBookings.length}`);
      return { session, bookings: newBookings };
    }).catch((txError: any) => {
      console.error(`[createBookingSessionAction] TX FAILED tenantId=${data.tenantId} error=${txError?.message || txError}`);
      throw txError; // re-throw so outer catch handles it
    });

    // 4. Enviar Correo de Confirmación
    try {
      const firstBooking = data.bookings[0];
      const branch = await db.query.branches.findFirst({ where: eq(branches.id, firstBooking.branchId) });

      if (branch) {
        const emailCfg2 = await getPlatformEmailTemplates();
        const locale2 = (tenant.emailLocale as EmailLocale) || 'es';

        // Construir un item por servicio con su propia fecha/hora/especialista
        const emailServices = await Promise.all(
          data.bookings.map(async (bData, i) => {
            const assignedBooking = result.bookings[i];

            // Solo mostrar el nombre del especialista si el usuario lo eligió explícitamente
            const userChoseStaff = bData.staffId && bData.staffId !== '' && bData.staffId !== 'null';

            const [svc, svcStaff] = await Promise.all([
              db.query.services.findFirst({ where: eq(services.id, bData.serviceId) }),
              (tenant.plan !== 'BASIC' && userChoseStaff && assignedBooking?.staffId)
                ? db.query.staff.findFirst({ where: eq(staff.id, assignedBooking.staffId!) })
                : Promise.resolve(null),
            ]);

            const startDate = assignedBooking?.startTime ? new Date(assignedBooking.startTime) : parseISO(bData.startTime);
            return {
              name: svc?.name ?? '',
              date: formatEmailDate(startDate, locale2, tenantTz),
              time: formatEmailTime(startDate, tenantTz),
              staffName: svcStaff?.name ?? '',
            };
          })
        );

        const firstSvc = emailServices[0];
        const vars2 = {
          customerName: data.customerName,
          serviceName: emailServices.map(s => s.name).join(', '),
          date: firstSvc?.date ?? '',
          time: firstSvc?.time ?? '',
          branchName: branch.name,
          staffName: firstSvc?.staffName ?? '',
          tenantName: tenant.name,
          phone: tenant.whatsappNumber || branch?.phone || '',
          contactEmail: (tenant as any).contactEmail || '',
        };
        const emailPayload2 = buildEmailPayload(
          emailCfg2?.emailTplConfirmation,
          React.createElement(BookingConfirmationEmail, {
            ...vars2,
            services: emailServices,
            locale: locale2,
            tenantLogo: tenant.logoUrl || undefined,
            customBody: tenant.emailBodyTemplate,
            phone: tenant.whatsappNumber || branch?.phone || undefined,
            contactEmail: (tenant as any).contactEmail || undefined,
            primaryColor: tenant.primaryColor || undefined,
            isHomeService: data.isHomeService ?? false,
          }),
          vars2
        );
        await sendWithRetry({
          from: `${tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: (tenant as any).contactEmail || undefined,
          to: data.customerEmail,
          subject: emailT.confirmationSubject(tenant.name, data.bookings.length, locale2),
          ...emailPayload2,
        });
      }
    } catch (emailError) {
      console.error("[createBookingSessionAction] Email send failed (non-critical):", emailError);
    }

    // Liberar soft locks de esta sesión (booking confirmado)
    if (data.sessionToken) {
      await db.delete(slotLocks).where(eq(slotLocks.sessionToken, data.sessionToken));
    }

    // Invalidar cache del admin para que las nuevas citas aparezcan inmediatamente
    revalidatePath('/es/admin/bookings');
    revalidatePath('/en/admin/bookings');

    console.log(`[createBookingSessionAction] SUCCESS tenantId=${data.tenantId} sessionId=${result.session.id} bookingIds=[${result.bookings.map((b: any) => b.id).join(',')}]`);
    logAuditEvent({ action: 'BOOKING_CREATED', tenantId: data.tenantId, details: { sessionId: result.session.id, count: result.bookings.length, customerEmail: data.customerEmail, customerName: data.customerName } });
    return { success: true, session: result.session, bookings: result.bookings };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create booking session";
    console.error("Error creating booking session:", error);
    logAuditEvent({ action: 'BOOKING_ERROR', tenantId: data.tenantId, details: { op: 'create', customerEmail: data.customerEmail, error: msg, level: 'error' } });
    return { success: false, error: msg };
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
  staffId?: string | null;
  notes?: string | null;
  [key: string]: any;
}) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }
    // 1. Fetch booking before update to detect time changes
    const existing = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, data.id), eq(bookings.tenantId, data.tenantId)),
      with: { service: true, branch: true, staff: true, tenant: true },
    });

    // 2. Verificar solapamiento si se cambió el horario o personal
    if (data.startTime && data.endTime) {
      const conflict = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.tenantId, data.tenantId),
          eq(bookings.staffId, data.staffId || ''),
          not(eq(bookings.id, data.id)),
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

    const isFinalizingNow = data.status === 'FINALIZADA' && existing?.status !== 'FINALIZADA';

    await db.update(bookings)
      .set({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status as any,
        notes: data.notes,
        ...(data.travelTimeOverride !== undefined ? { travelTimeOverride: data.travelTimeOverride ?? null } : {}),
        ...(isFinalizingNow ? { finalizedBy: session.userId, finalizedAt: new Date() } : {}),
      })
      .where(and(eq(bookings.id, data.id), eq(bookings.tenantId, data.tenantId)));

    if (data.status === 'FINALIZADA') {
      Promise.resolve().then(() =>
        sendPendingSurveyEmailsAction(data.tenantId)
      );
      // Fire-and-forget: earn loyalty points for this booking
      earnPointsForBookingAction(data.id).catch(console.error);
    }

    // 3a. Send cancellation email if status changed to CANCELLED
    if (data.status === 'CANCELLED' && existing?.status !== 'CANCELLED' && existing?.customerEmail) {
      try {
        const emailCfgC = await getPlatformEmailTemplates();
        const localeC = (existing.tenant.emailLocale as EmailLocale) || 'es';
        const tzC = (existing.tenant as any).timezone || 'America/El_Salvador';
        const varsC = {
          customerName: existing.customerName,
          serviceName: existing.service.name,
          date: formatEmailDate(existing.startTime, localeC, tzC),
          time: formatEmailTime(existing.startTime, tzC),
          branchName: existing.branch.name,
          tenantName: existing.tenant.name,
          phone: existing.tenant.whatsappNumber || '',
          contactEmail: (existing.tenant as any).contactEmail || '',
        };
        const emailPayloadC = buildEmailPayload(
          emailCfgC?.emailTplCancellation,
          React.createElement(BookingCancellationEmail, {
            ...varsC,
            locale: localeC,
            tenantLogo: existing.tenant.logoUrl || undefined,
            phone: existing.tenant.whatsappNumber || undefined,
            contactEmail: (existing.tenant as any).contactEmail || undefined,
            primaryColor: existing.tenant.primaryColor || undefined,
            isHomeService: (existing as any).isHomeService || false,
          }),
          varsC
        );
        await sendWithRetry({
          from: `${existing.tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: (existing.tenant as any).contactEmail || undefined,
          to: existing.customerEmail,
          subject: emailT.cancellationSubject(existing.tenant.name, localeC),
          ...emailPayloadC,
        });
      } catch (e) {
        console.error('[Email] Error sending cancellation email on status change:', e);
      }
    }

    // 3b. Send reschedule email if time changed
    const timeChanged = data.startTime && existing &&
      new Date(existing.startTime).getTime() !== new Date(data.startTime).getTime();

    if (timeChanged && existing && existing.customerEmail) {
      const emailData = data.customerEmail || existing.customerEmail;
      const name = data.customerName || existing.customerName;
      const newStaff = data.staffId
        ? await db.query.staff.findFirst({ where: eq(staff.id, data.staffId) })
        : existing.staff;

      try {
        const emailCfgR = await getPlatformEmailTemplates();
        const localeR = (existing.tenant.emailLocale as EmailLocale) || 'es';
        const tzR = (existing.tenant as any).timezone || 'America/El_Salvador';
        const varsR = {
          customerName: name,
          serviceName: existing.service.name,
          oldDate: formatEmailDate(existing.startTime, localeR, tzR),
          oldTime: formatEmailTime(existing.startTime, tzR),
          newDate: formatEmailDate(data.startTime!, localeR, tzR),
          newTime: formatEmailTime(data.startTime!, tzR),
          branchName: existing.branch.name,
          staffName: newStaff?.name ?? '',
          tenantName: existing.tenant.name,
          phone: existing.tenant.whatsappNumber || '',
          contactEmail: (existing.tenant as any).contactEmail || '',
        };
        const emailPayloadR = buildEmailPayload(
          emailCfgR?.emailTplReschedule,
          React.createElement(BookingRescheduleEmail, {
            ...varsR,
            locale: localeR,
            tenantLogo: existing.tenant.logoUrl || undefined,
            phone: existing.tenant.whatsappNumber || undefined,
            contactEmail: (existing.tenant as any).contactEmail || undefined,
            primaryColor: existing.tenant.primaryColor || undefined,
            isHomeService: (existing as any).isHomeService || false,
          }),
          varsR
        );
        await sendWithRetry({
          from: `${existing.tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: (existing.tenant as any).contactEmail || undefined,
          to: emailData,
          subject: emailT.rescheduleSubject(existing.tenant.name, localeR),
          ...emailPayloadR,
        });
      } catch (e) {
        console.error('[Email] Error sending reschedule email:', e);
      }
    }

    logAuditEvent({ action: 'BOOKING_STATUS_CHANGED', tenantId: data.tenantId, details: { bookingId: data.id, status: data.status, prevStatus: existing?.status } });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error updating booking:", msg);
    logAuditEvent({ action: 'BOOKING_ERROR', tenantId: data.tenantId, details: { op: 'update', bookingId: data.id, error: msg, level: 'error' } });
    return { success: false, error: "Failed to update booking" };
  }
}

/**
 * Elimina (cancela) una reserva y notifica al cliente por email.
 */
export async function deleteBookingAction(id: string, tenantId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }
    const existing = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)),
      with: { service: true, branch: true, tenant: true },
    });

    await db.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)));

    if (existing?.customerEmail) {
      try {
        const emailCfgC = await getPlatformEmailTemplates();
        const localeC = (existing.tenant.emailLocale as EmailLocale) || 'es';
        const tzC2 = (existing.tenant as any).timezone || 'America/El_Salvador';
        const varsC = {
          customerName: existing.customerName,
          serviceName: existing.service.name,
          date: formatEmailDate(existing.startTime, localeC, tzC2),
          time: formatEmailTime(existing.startTime, tzC2),
          branchName: existing.branch.name,
          tenantName: existing.tenant.name,
          phone: existing.tenant.whatsappNumber || '',
          contactEmail: (existing.tenant as any).contactEmail || '',
        };
        const emailPayloadC = buildEmailPayload(
          emailCfgC?.emailTplCancellation,
          React.createElement(BookingCancellationEmail, {
            ...varsC,
            locale: localeC,
            tenantLogo: existing.tenant.logoUrl || undefined,
            phone: existing.tenant.whatsappNumber || undefined,
            contactEmail: (existing.tenant as any).contactEmail || undefined,
            primaryColor: existing.tenant.primaryColor || undefined,
            isHomeService: (existing as any).isHomeService || false,
          }),
          varsC
        );
        await sendWithRetry({
          from: `${existing.tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: (existing.tenant as any).contactEmail || undefined,
          to: existing.customerEmail,
          subject: emailT.cancellationSubject(existing.tenant.name, localeC),
          ...emailPayloadC,
        });
      } catch (e) {
        console.error('[Email] Error sending cancellation email:', e);
      }
    }

    logAuditEvent({ action: 'BOOKING_DELETED', tenantId, details: { bookingId: id, customerEmail: existing?.customerEmail, serviceName: existing?.service?.name } });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error deleting booking:", msg);
    logAuditEvent({ action: 'BOOKING_ERROR', tenantId, details: { op: 'delete', bookingId: id, error: msg, level: 'error' } });
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
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(session.role)) {
      return [];
    }
    // 1. Auto-finalizar citas pasadas
    const now = new Date();
    const toFinalize = await db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        not(eq(bookings.status, 'CANCELLED')),
        not(eq(bookings.status, 'FINALIZADA')),
        lte(bookings.endTime, now)
      ),
      columns: { id: true },
    });

    if (toFinalize.length > 0) {
      const ids = toFinalize.map(b => b.id);
      await db.update(bookings)
        .set({ status: 'FINALIZADA' as any, finalizedAt: now })
        .where(and(eq(bookings.tenantId, tenantId), inArray(bookings.id, ids)));

      // Fire-and-forget: puntos y auditoría por cada cita auto-finalizada
      Promise.resolve().then(async () => {
        for (const b of toFinalize) {
          earnPointsForBookingAction(b.id).catch(console.error);
        }
        logAuditEvent({
          action: 'BOOKING_STATUS_CHANGED',
          tenantId,
          details: { op: 'auto_finalize', count: ids.length, bookingIds: ids, auto: true },
        });
        sendPendingSurveyEmailsAction(tenantId).catch(console.error);
      });
    }

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

// ─── SOFT SLOT LOCKS ───────────────────────────────────────────────────────────

const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Crea o renueva un soft lock para un slot específico.
 * Llamado cuando el usuario selecciona una hora en el widget (paso 3).
 */
export async function lockSlotAction(data: {
  tenantId: string;
  branchId: string;
  serviceId: string;
  staffId?: string | null;
  date: string;    // YYYY-MM-DD
  time: string;    // HH:MM
  sessionToken: string;
}) {
  try {
    // Borrar locks expirados del tenant de paso (cleanup pasivo)
    await db.delete(slotLocks).where(
      and(eq(slotLocks.tenantId, data.tenantId), lt(slotLocks.expiresAt, new Date()))
    );

    // Upsert: si ya existe un lock del mismo token+service+date+time, lo renueva
    const existing = await db.query.slotLocks.findFirst({
      where: and(
        eq(slotLocks.tenantId, data.tenantId),
        eq(slotLocks.serviceId, data.serviceId),
        eq(slotLocks.date, data.date),
        eq(slotLocks.time, data.time),
        eq(slotLocks.sessionToken, data.sessionToken)
      )
    });

    const expiresAt = new Date(Date.now() + LOCK_TTL_MS);

    if (existing) {
      await db.update(slotLocks)
        .set({ expiresAt })
        .where(eq(slotLocks.id, existing.id));
    } else {
      await db.insert(slotLocks).values({
        tenantId: data.tenantId,
        branchId: data.branchId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        date: data.date,
        time: data.time,
        sessionToken: data.sessionToken,
        expiresAt,
      });
    }
    return { success: true };
  } catch (error) {
    console.error("lockSlotAction error:", error);
    return { success: false };
  }
}

/**
 * Libera todos los locks de una sesión.
 * Llamado cuando el usuario vuelve al paso 1 o cierra el widget.
 */
export async function releaseSlotLocksAction(sessionToken: string) {
  try {
    await db.delete(slotLocks).where(eq(slotLocks.sessionToken, sessionToken));
    return { success: true };
  } catch (error) {
    console.error("releaseSlotLocksAction error:", error);
    return { success: false };
  }
}

/**
 * Libera los locks de un service específico de una sesión.
 * Usado cuando el usuario vuelve atrás para cambiar la hora de un servicio.
 */
export async function releaseServiceSlotLockAction(sessionToken: string, serviceId: string) {
  try {
    await db.delete(slotLocks).where(
      and(eq(slotLocks.sessionToken, sessionToken), eq(slotLocks.serviceId, serviceId))
    );
    return { success: true };
  } catch (error) {
    console.error("releaseServiceSlotLockAction error:", error);
    return { success: false };
  }
}

/**
 * Envía el correo de encuesta de satisfacción a todas las citas FINALIZADA
 * que aún no han recibido el email. Solo actúa si el tenant tiene reviewsEnabled=true.
 */
export async function sendPendingSurveyEmailsAction(tenantId: string) {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) return;
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant?.reviewsEnabled) return;
    if (!getPlanFeatures(tenant.plan).surveys) return;

    const pending = await db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.status, 'FINALIZADA'),
        eq(bookings.surveyEmailSent, false),
      ),
      with: { service: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    for (const booking of pending) {
      if (!booking.customerEmail) continue;
      try {
        // Skip if the client already submitted a review for this booking
        const existingReview = await db.query.reviews.findFirst({
          where: eq(reviews.bookingId, booking.id),
          columns: { id: true },
        });
        if (existingReview) {
          // Mark as sent so we don't check this booking again
          await db.update(bookings)
            .set({ surveyEmailSent: true })
            .where(eq(bookings.id, booking.id));
          continue;
        }
        const surveyUrl = `${baseUrl}/es/review/${booking.id}`;
        const emailCfgS = await getPlatformEmailTemplates();
        const localeS = (tenant.emailLocale as EmailLocale) || 'es';
        const varsS = {
          customerName: booking.customerName,
          tenantName: tenant.name,
          surveyUrl,
        };
        const emailPayloadS = buildEmailPayload(
          emailCfgS?.emailTplSurveyInvite,
          React.createElement(SurveyInviteEmail, {
            ...varsS,
            locale: localeS,
            tenantLogo: tenant.logoUrl || undefined,
            primaryColor: tenant.primaryColor || undefined,
          }),
          varsS
        );
        await resend.emails.send({
          from: `${tenant.name} <notificaciones@zyncrox.com>`,
          replyTo: (tenant as any).contactEmail || undefined,
          to: booking.customerEmail,
          subject: emailT.surveySubject(tenant.name, localeS),
          ...emailPayloadS,
        });
        await db.update(bookings)
          .set({ surveyEmailSent: true })
          .where(eq(bookings.id, booking.id));
      } catch (e) {
        console.error(`[Survey Email] Error enviando para booking ${booking.id}:`, e);
      }
    }
  } catch (e) {
    console.error('[Survey Email] sendPendingSurveyEmailsAction error:', e);
  }
}
