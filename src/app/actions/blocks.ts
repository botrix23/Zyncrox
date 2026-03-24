"use server";

import { db } from "@/db";
import { blocks } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createBlockAction(data: {
  tenantId: string;
  branchId: string;
  staffId?: string | null;
  reason?: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    const [newBlock] = await db.insert(blocks).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      staffId: data.staffId || null,
      reason: data.reason,
      startTime: data.startTime,
      endTime: data.endTime,
    }).returning();

    revalidatePath("/admin/branches");
    return { success: true, block: newBlock };
  } catch (error) {
    console.error("Error creating block:", error);
    return { success: false, error: "Error al crear el bloqueo" };
  }
}

export async function getBlocksAction(branchId: string, tenantId: string) {
  try {
    const results = await db.select().from(blocks).where(
      and(
        eq(blocks.branchId, branchId),
        eq(blocks.tenantId, tenantId)
      )
    );
    return { success: true, blocks: results };
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return { success: false, error: "Error al obtener bloqueos" };
  }
}

export async function deleteBlockAction(id: string, tenantId: string) {
  try {
    await db.delete(blocks).where(
      and(
        eq(blocks.id, id),
        eq(blocks.tenantId, tenantId)
      )
    );
    revalidatePath("/admin/branches");
    return { success: true };
  } catch (error) {
    console.error("Error deleting block:", error);
    return { success: false, error: "Error al eliminar el bloqueo" };
  }
}
