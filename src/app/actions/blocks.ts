"use server";

import { db } from "@/db";
import { blocks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

export async function createBlockAction(data: {
  tenantId: string;
  branchId: string;
  staffId?: string | null;
  reason?: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    const { session, tenantId } = await assertAdmin();
    const [newBlock] = await db.insert(blocks).values({
      tenantId,
      branchId: data.branchId,
      staffId: data.staffId || null,
      reason: data.reason,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'ACTIVE',
    }).returning();

    revalidatePath("/[locale]/admin/(dashboard)/absences", "page");
    revalidatePath("/[locale]/admin/(dashboard)/branches", "page");
    revalidatePath("/[locale]/admin/(dashboard)/bookings", "page");
    await logAuditEvent({ action: 'BLOCK_CREATED', userId: session.userId, tenantId, details: { blockId: newBlock.id, branchId: data.branchId, staffId: data.staffId, reason: data.reason, startTime: data.startTime, endTime: data.endTime } });
    return { success: true, block: newBlock };
  } catch (error) {
    console.error("Error creating block:", error);
    return { success: false, error: "Error al crear el bloqueo" };
  }
}

export async function getBlocksAction(branchId: string, tenantId: string) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    const results = await db.select().from(blocks).where(
      and(
        eq(blocks.branchId, branchId),
        eq(blocks.tenantId, sessionTenantId)
      )
    );
    const active = results.filter(b => !(b as any).status || (b as any).status !== 'CANCELLED');
    return { success: true, blocks: active };
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return { success: false, error: "Error al obtener bloqueos" };
  }
}

export async function cancelBlockAction(id: string, tenantId: string, cancelReason?: string) {
  try {
    const { session, tenantId: sessionTenantId } = await assertAdmin();
    await db.update(blocks)
      .set({ status: 'CANCELLED', cancelReason: cancelReason || null })
      .where(
        and(
          eq(blocks.id, id),
          eq(blocks.tenantId, sessionTenantId)
        )
      );
    revalidatePath("/[locale]/admin/(dashboard)/absences", "page");
    revalidatePath("/[locale]/admin/(dashboard)/branches", "page");
    revalidatePath("/[locale]/admin/(dashboard)/bookings", "page");
    await logAuditEvent({ action: 'BLOCK_CANCELLED', userId: session.userId, tenantId: sessionTenantId, details: { blockId: id, cancelReason } });
    return { success: true };
  } catch (error) {
    console.error("Error cancelling block:", error);
    return { success: false, error: "Error al cancelar el bloqueo" };
  }
}

export async function updateBlockAction(data: {
  id: string;
  tenantId: string;
  staffId?: string | null;
  reason?: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    const { session, tenantId } = await assertAdmin();
    await db.update(blocks)
      .set({
        staffId: data.staffId || null,
        reason: data.reason,
        startTime: data.startTime,
        endTime: data.endTime,
      })
      .where(
        and(
          eq(blocks.id, data.id),
          eq(blocks.tenantId, tenantId)
        )
      );

    revalidatePath("/[locale]/admin/(dashboard)/absences", "page");
    revalidatePath("/[locale]/admin/(dashboard)/branches", "page");
    revalidatePath("/[locale]/admin/(dashboard)/bookings", "page");
    await logAuditEvent({ action: 'BLOCK_UPDATED', userId: session.userId, tenantId, details: { blockId: data.id, staffId: data.staffId, reason: data.reason, startTime: data.startTime, endTime: data.endTime } });
    return { success: true };
  } catch (error) {
    console.error("Error updating block:", error);
    return { success: false, error: "Error al actualizar el bloqueo" };
  }
}
