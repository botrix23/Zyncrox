"use server";

import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createStaffAction(data: {
  tenantId: string;
  branchId: string;
  name: string;
  email?: string;
}) {
  try {
    const [newStaff] = await db.insert(staff).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      name: data.name,
      email: data.email,
    }).returning();

    revalidatePath("/[locale]/admin/staff", "page");
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
}) {
  try {
    await db.update(staff)
      .set({
        branchId: data.branchId,
        name: data.name,
        email: data.email,
        updatedAt: new Date(),
      })
      .where(and(eq(staff.id, data.id), eq(staff.tenantId, data.tenantId)));

    revalidatePath("/[locale]/admin/staff", "page");
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
