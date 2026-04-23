"use server";

import { db } from "@/db";
import { absenceRequests, blocks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

export async function createAbsenceRequestAction(data: {
  tenantId: string;
  staffId: string;
  reason: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    await db.insert(absenceRequests).values({
      tenantId: data.tenantId,
      staffId: data.staffId,
      reason: data.reason,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'PENDING',
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error creating absence request:", error);
    return { success: false };
  }
}

export async function approveAbsenceRequestAction(requestId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    const request = await db.query.absenceRequests.findFirst({
      where: eq(absenceRequests.id, requestId),
      with: { staff: true },
    });

    if (!request) return { success: false, error: "Solicitud no encontrada" };

    // Aprobar: actualizar estado y crear el bloqueo real
    await db.update(absenceRequests)
      .set({ status: 'APPROVED' })
      .where(eq(absenceRequests.id, requestId));

    await db.insert(blocks).values({
      tenantId: request.tenantId,
      branchId: null as any,
      staffId: request.staffId,
      reason: request.reason || 'Ausencia aprobada',
      startTime: request.startTime,
      endTime: request.endTime,
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error approving absence request:", error);
    return { success: false };
  }
}

export async function rejectAbsenceRequestAction(requestId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    await db.update(absenceRequests)
      .set({ status: 'REJECTED' })
      .where(eq(absenceRequests.id, requestId));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting absence request:", error);
    return { success: false };
  }
}
