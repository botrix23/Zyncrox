"use server";

import { db } from "@/db";
import { staff, staffAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createStaffAction(data: {
  tenantId: string;
  branchId: string; // Legacy/Primary branch
  name: string;
  email?: string;
    assignments?: Array<{
      branchId: string;
      startDate?: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      daysOfWeek: string[];
      isPermanent?: boolean;
    }>;
}) {
  try {
    const [newStaff] = await db.insert(staff).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      name: data.name,
      email: data.email,
    }).returning();

    if (data.assignments && data.assignments.length > 0) {
      await db.insert(staffAssignments).values(
        data.assignments.map(a => ({
          tenantId: data.tenantId,
          staffId: newStaff.id,
          branchId: a.branchId,
          startDate: a.startDate ? new Date(`${String(a.startDate).split('T')[0]}T12:00:00Z`) : null,
          endDate: a.endDate ? new Date(`${String(a.endDate).split('T')[0]}T12:00:00Z`) : null,
          startTime: a.startTime,
          endTime: a.endTime,
          daysOfWeek: a.daysOfWeek,
          isPermanent: a.isPermanent ?? false,
        }))
      );
    } else {
      // Crear asignación por defecto basada en branchId primario
      await db.insert(staffAssignments).values({
        tenantId: data.tenantId,
        staffId: newStaff.id,
        branchId: data.branchId,
        isPermanent: true,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      });
    }

    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/admin/bookings", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true, staff: newStaff };
  } catch (error) {
    console.error("Error creating staff:", error);
    return { success: false, error: "Failed to create staff member" };
  }
}

export async function updateStaffAction(data: {
  id: string;
  tenantId: string;
  branchId?: string;
  name?: string;
  email?: string;
    assignments?: Array<{
      branchId: string;
      startDate?: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      daysOfWeek: string[];
      isPermanent?: boolean;
    }>;
}) {
  try {
    await db.transaction(async (tx) => {
      // 1. Actualizar datos básicos
      await tx.update(staff)
        .set({
          branchId: data.branchId,
          name: data.name,
          email: data.email,
          updatedAt: new Date(),
        })
        .where(and(eq(staff.id, data.id), eq(staff.tenantId, data.tenantId)));

      // 2. Si vienen asignaciones, reemplazar las anteriores
      if (data.assignments) {
        await tx.delete(staffAssignments).where(eq(staffAssignments.staffId, data.id));
        
        if (data.assignments.length > 0) {
          await tx.insert(staffAssignments).values(
            data.assignments.map(a => ({
              tenantId: data.tenantId,
              staffId: data.id,
              branchId: a.branchId,
              startDate: a.startDate ? new Date(`${String(a.startDate).split('T')[0]}T12:00:00Z`) : null,
              endDate: a.endDate ? new Date(`${String(a.endDate).split('T')[0]}T12:00:00Z`) : null,
              startTime: a.startTime || null,
              endTime: a.endTime || null,
              daysOfWeek: a.daysOfWeek,
              isPermanent: a.isPermanent ?? false,
            }))
          );
        }
      }
    });

    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/admin/bookings", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff:", error);
    return { success: false, error: "Failed to update staff member" };
  }
}

export async function deleteStaffAction(id: string, tenantId: string) {
  try {
    await db.delete(staff).where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));
    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting staff:", error);
    return { success: false, error: "Failed to delete staff member" };
  }
}
export async function getStaffAction(tenantId: string) {
  try {
    const results = await db.select().from(staff).where(eq(staff.tenantId, tenantId)).orderBy(staff.name);
    return results;
  } catch (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
}
