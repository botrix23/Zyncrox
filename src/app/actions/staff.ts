"use server";

import { db } from "@/db";
import { staff, staffAssignments, branches, staffToCategories, users, bookings } from "@/db/schema";
import { eq, and, ne, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkPlanLimit } from "@/lib/plan-guard";
import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";

async function assertAdmin() {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) throw new Error('No tenantId');
  return { session, tenantId };
}

// Devuelve { startTime, endTime, daysOfWeek } a partir del JSON de businessHours de la sucursal,
// soportando tanto el formato simple { open, close } como el complejo { regular: { day: { isOpen, slots } } }.
function parseBranchHoursForInheritance(businessHours: string): { startTime: string; endTime: string; daysOfWeek: string[] } | null {
  try {
    const bh = JSON.parse(businessHours);

    // Formato simple
    if (bh.open && bh.close) {
      return {
        startTime: bh.open,
        endTime: bh.close,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      };
    }

    // Formato complejo: { regular: { monday: { isOpen, slots: [{open, close}] } } }
    if (bh.regular) {
      let earliestOpen = "23:59";
      let latestClose = "00:00";
      const openDays: string[] = [];

      for (const [day, schedule] of Object.entries(bh.regular)) {
        const s = schedule as any;
        if (s?.isOpen && Array.isArray(s.slots) && s.slots.length > 0) {
          openDays.push(day);
          for (const slot of s.slots) {
            if (slot.open && slot.open < earliestOpen) earliestOpen = slot.open;
            if (slot.close && slot.close > latestClose) latestClose = slot.close;
          }
        }
      }

      if (openDays.length > 0 && earliestOpen < latestClose) {
        return { startTime: earliestOpen, endTime: latestClose, daysOfWeek: openDays };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function createStaffAction(data: {
  tenantId: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  allowsHomeService?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  inheritBranchHours?: boolean;
  isReceptionist?: boolean;
  categoryIds?: string[];
  assignments?: Array<{
    branchId: string;
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    daysOfWeek: string[];
    isPermanent?: boolean;
    scheduleData?: string;
  }>;
}) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId, session } = ctx;
    const limitCheck = await checkPlanLimit(tenantId, "staff");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: "PLAN_LIMIT_EXCEEDED",
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: limitCheck.plan,
      };
    }
    if (data.isReceptionist) {
      const recepCheck = await checkPlanLimit(tenantId, "receptionists");
      if (!recepCheck.allowed) {
        return {
          success: false,
          error: "PLAN_LIMIT_EXCEEDED",
          limit: recepCheck.limit,
          current: recepCheck.current,
          plan: recepCheck.plan,
        };
      }
    }

    const [newStaff] = await db.insert(staff).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      allowsHomeService: data.allowsHomeService ?? true,
      inheritBranchHours: data.inheritBranchHours ?? false,
      isReceptionist: data.isReceptionist ?? false,
    }).returning();

    // Lógica de Horarios: Si hereda de sucursal, ignorar assignments manuales para la base
    let finalAssignments = data.assignments;

    if (data.inheritBranchHours) {
      const [branchData] = await db.select().from(branches).where(eq(branches.id, data.branchId));
      if (branchData?.businessHours) {
        const parsed = parseBranchHoursForInheritance(branchData.businessHours);
        if (parsed) {
          const permAssignment = { branchId: data.branchId, ...parsed, isPermanent: true };
          finalAssignments = finalAssignments
            ? [permAssignment, ...finalAssignments.filter(a => !a.isPermanent)]
            : [permAssignment];
        }
      }
    }
    if (finalAssignments && finalAssignments.length > 0) {
      await db.insert(staffAssignments).values(
        finalAssignments.map(a => ({
          tenantId: data.tenantId,
          staffId: newStaff.id,
          branchId: a.branchId,
          startDate: a.startDate ? new Date(`${String(a.startDate).split('T')[0]}T12:00:00Z`) : null,
          endDate: a.endDate ? new Date(`${String(a.endDate).split('T')[0]}T12:00:00Z`) : null,
          startTime: a.startTime,
          endTime: a.endTime,
          daysOfWeek: a.daysOfWeek,
          isPermanent: a.isPermanent ?? false,
          scheduleData: a.scheduleData ?? null,
        }))
      );
    } else if (!data.inheritBranchHours) {
      // Crear asignación por defecto basada en branchId primario
      await db.insert(staffAssignments).values({
        tenantId: data.tenantId,
        staffId: newStaff.id,
        branchId: data.branchId,
        isPermanent: true,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      });
    }

    if (data.categoryIds && data.categoryIds.length > 0) {
      await db.insert(staffToCategories).values(
        data.categoryIds.map(categoryId => ({
          tenantId: data.tenantId,
          staffId: newStaff.id,
          categoryId,
        }))
      );
    }

    logAuditEvent({ action: 'STAFF_CREATED', userId: session.userId, tenantId, details: { name: data.name, email: data.email } });

    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/admin/bookings", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true, staff: newStaff };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error creating staff:", msg);
    logAuditEvent({ action: 'STAFF_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'create', name: data.name, error: msg, level: 'error' } });
    return { success: false, error: "Failed to create staff member" };
  }
}

export async function updateStaffAction(data: {
  id: string;
  tenantId: string;
  branchId?: string;
  name?: string;
  email?: string;
  phone?: string;
  allowsHomeService?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  inheritBranchHours?: boolean;
  categoryIds?: string[];
  assignments?: Array<{
    branchId: string;
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    daysOfWeek: string[];
    isPermanent?: boolean;
    scheduleData?: string;
  }>;
}) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId, session } = ctx;
    await db.transaction(async (tx) => {
      // 1. Actualizar datos básicos
      await tx.update(staff)
        .set({
          branchId: data.branchId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          allowsHomeService: data.allowsHomeService,
          inheritBranchHours: data.inheritBranchHours,
          updatedAt: new Date(),
        })
        .where(and(eq(staff.id, data.id), eq(staff.tenantId, data.tenantId)));

      // 2. Si cambió el email, sincronizarlo en la tabla users (para login y reset de contraseña)
      if (data.email) {
        await tx.update(users)
          .set({ email: data.email, name: data.name })
          .where(and(eq(users.staffId, data.id), eq(users.tenantId, data.tenantId)));
      }

      // 2. Si vienen asignaciones, reemplazar las anteriores
      let finalAssignments = data.assignments;

      if (data.inheritBranchHours && data.branchId) {
        const [branchData] = await db.select().from(branches).where(eq(branches.id, data.branchId));
        if (branchData?.businessHours) {
          const parsed = parseBranchHoursForInheritance(branchData.businessHours);
          if (parsed) {
            const permAssignment = { branchId: data.branchId, ...parsed, isPermanent: true };
            finalAssignments = finalAssignments
              ? [permAssignment, ...finalAssignments.filter(a => !a.isPermanent)]
              : [permAssignment];
          }
        }
      }

      if (finalAssignments) {
        await tx.delete(staffAssignments).where(eq(staffAssignments.staffId, data.id));
        
        if (finalAssignments.length > 0) {
          await tx.insert(staffAssignments).values(
            finalAssignments.map(a => ({
              tenantId: data.tenantId,
              staffId: data.id,
              branchId: a.branchId,
              startDate: a.startDate ? new Date(`${String(a.startDate).split('T')[0]}T12:00:00Z`) : null,
              endDate: a.endDate ? new Date(`${String(a.endDate).split('T')[0]}T12:00:00Z`) : null,
              startTime: a.startTime || null,
              endTime: a.endTime || null,
              daysOfWeek: a.daysOfWeek,
              isPermanent: a.isPermanent ?? false,
              scheduleData: a.scheduleData ?? null,
            }))
          );
        }
      }
    });

    if (data.categoryIds !== undefined) {
      await db.delete(staffToCategories).where(eq(staffToCategories.staffId, data.id));
      if (data.categoryIds.length > 0) {
        await db.insert(staffToCategories).values(
          data.categoryIds.map(categoryId => ({
            tenantId: data.tenantId,
            staffId: data.id,
            categoryId,
          }))
        );
      }
    }

    logAuditEvent({ action: 'STAFF_UPDATED', userId: session.userId, tenantId, details: { staffId: data.id, name: data.name } });

    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/admin/bookings", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error updating staff:", msg);
    logAuditEvent({ action: 'STAFF_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'update', staffId: data.id, error: msg, level: 'error' } });
    return { success: false, error: "Failed to update staff member" };
  }
}

export async function getStaffFutureBookingCount(staffId: string, tenantId: string): Promise<number> {
  try {
    const result = await db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(bookings)
      .where(and(
        eq(bookings.staffId, staffId),
        eq(bookings.tenantId, tenantId),
        gt(bookings.startTime, new Date()),
        ne(bookings.status, 'CANCELLED')
      ));
    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function deleteStaffAction(id: string, tenantId: string) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId: sessionTenantId, session } = ctx;
    // Reassign future bookings to PENDING_ASSIGNMENT before deleting the staff member
    await db.update(bookings)
      .set({ staffId: null, status: 'PENDING_ASSIGNMENT' })
      .where(and(
        eq(bookings.staffId, id),
        eq(bookings.tenantId, tenantId),
        gt(bookings.startTime, new Date()),
        ne(bookings.status, 'CANCELLED')
      ));

    await db.delete(staff).where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));

    logAuditEvent({ action: 'STAFF_DELETED', userId: session.userId, tenantId: sessionTenantId, details: { staffId: id } });

    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/[slug]", "page");
    revalidatePath("/[locale]/admin", "page");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error deleting staff:", msg);
    logAuditEvent({ action: 'STAFF_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'delete', staffId: id, error: msg, level: 'error' } });
    return { success: false, error: "Failed to delete staff member" };
  }
}
export async function getStaffAction(tenantId: string) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    const results = await db.select().from(staff).where(eq(staff.tenantId, sessionTenantId)).orderBy(staff.name);
    return results;
  } catch (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
}

export async function toggleStaffActiveAction(id: string, tenantId: string, isActive: boolean) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    if (isActive) {
      const limit = await checkPlanLimit(sessionTenantId, 'staff');
      if (!limit.allowed) {
        return { success: false, error: 'PLAN_LIMIT_EXCEEDED', limit: limit.limit, plan: limit.plan };
      }
    }
    await db.update(staff).set({ isActive }).where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));
    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error toggling staff active:", error);
    return { success: false, error: "Error al actualizar el empleado" };
  }
}
