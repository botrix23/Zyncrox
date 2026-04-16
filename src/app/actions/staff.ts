"use server";

import { db } from "@/db";
import { staff, staffAssignments, branches, staffToCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createStaffAction(data: {
  tenantId: string;
  branchId: string; // Legacy/Primary branch
  name: string;
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
  }>;
}) {
  try {
    const [newStaff] = await db.insert(staff).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      allowsHomeService: data.allowsHomeService ?? true,
    }).returning();

    // Lógica de Horarios: Si hereda de sucursal, ignorar assignments manuales para la base
    let finalAssignments = data.assignments;

    if (data.inheritBranchHours) {
      const [branchData] = await db.select().from(branches).where(eq(branches.id, data.branchId));
      if (branchData && branchData.businessHours) {
        const hours = JSON.parse(branchData.businessHours); // { open: "08:00", close: "18:00" }
        
        // Crear/Sobrescribir asignación permanente con las horas de la sucursal
        const permAssignment = {
          branchId: data.branchId,
          startTime: hours.open || "09:00",
          endTime: hours.close || "18:00",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          isPermanent: true
        };

        if (finalAssignments) {
          finalAssignments = [permAssignment, ...finalAssignments.filter(a => !a.isPermanent)];
        } else {
          finalAssignments = [permAssignment];
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
          phone: data.phone,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          allowsHomeService: data.allowsHomeService,
          updatedAt: new Date(),
        })
        .where(and(eq(staff.id, data.id), eq(staff.tenantId, data.tenantId)));

      // 2. Si vienen asignaciones, reemplazar las anteriores
      let finalAssignments = data.assignments;

      if (data.inheritBranchHours && data.branchId) {
        const [branchData] = await db.select().from(branches).where(eq(branches.id, data.branchId));
        if (branchData && branchData.businessHours) {
          const hours = JSON.parse(branchData.businessHours);
          const permAssignment = {
            branchId: data.branchId,
            startTime: hours.open || "09:00",
            endTime: hours.close || "18:00",
            daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            isPermanent: true
          };

          if (finalAssignments) {
            finalAssignments = [permAssignment, ...finalAssignments.filter(a => !a.isPermanent)];
          } else {
            finalAssignments = [permAssignment];
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
