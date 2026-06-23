"use server";

import { db } from "@/db";
import { absenceRequests, blocks, users, staff as staffTable, tenants } from "@/db/schema";
import { eq, and, arrayContains } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { resend } from "@/lib/resend";
import { render } from "@react-email/render";
import React from "react";
import { AbsenceRequestEmail } from "@/components/emails/AbsenceRequestEmail";
import { platformConfig } from "@/db/schema";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

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
    await logAuditEvent({ action: 'ABSENCE_REQUESTED', tenantId: data.tenantId, details: { staffId: data.staffId, reason: data.reason, startTime: data.startTime, endTime: data.endTime } });

    // Notify tenant admin/owner by email — fire-and-forget, never blocks the action
    void notifyAdminAbsenceRequest(data).catch(() => {});

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error creating absence request:", error);
    return { success: false };
  }
}

async function notifyAdminAbsenceRequest(data: {
  tenantId: string;
  staffId: string;
  reason: string;
  startTime: Date;
  endTime: Date;
}) {
  const [staffMember, allAdmins, tenant, cfg] = await Promise.all([
    db.query.staff.findFirst({ where: eq(staffTable.id, data.staffId), columns: { name: true, branchId: true } }),
    db.select({ email: users.email, name: users.name, isOwner: users.isOwner, assignedBranchIds: users.assignedBranchIds })
      .from(users)
      .where(and(eq(users.tenantId, data.tenantId), eq(users.role, 'ADMIN'), eq(users.isActive, true))),
    db.query.tenants.findFirst({ where: eq(tenants.id, data.tenantId), columns: { name: true } }),
    db.select().from(platformConfig).limit(1).then(rows => rows[0] ?? null),
  ]);

  if (!allAdmins.length || !staffMember) return;

  const staffBranchId = staffMember.branchId;

  const nonOwners = allAdmins.filter(a => !a.isOwner);
  const owners = allAdmins.filter(a => a.isOwner);

  // 1. Non-owner admins assigned to the staff's branch
  let recipients = staffBranchId
    ? nonOwners.filter(a => a.assignedBranchIds?.includes(staffBranchId))
    : [];

  // 2. Any active non-owner admin
  if (!recipients.length) recipients = nonOwners;

  // 3. Owners — only if no delegated admin exists
  if (!recipients.length) recipients = owners;

  if (!recipients.length) return;

  const staffName = staffMember.name;
  const tenantName = tenant?.name ?? '';
  const dateLocale = es;
  const startStr = format(data.startTime, "d 'de' MMMM yyyy", { locale: dateLocale });
  const endStr = format(data.endTime, "d 'de' MMMM yyyy", { locale: dateLocale });
  const panelUrl = `https://www.zyncrox.com/es/admin/staff`;

  let html: string;

  if (cfg?.emailTplAbsenceRequest) {
    const vars: Record<string, string> = {
      staffName,
      tenantName,
      startDate: startStr,
      endDate: endStr,
      reason: data.reason ?? '',
      panelUrl,
    };
    html = Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
      cfg.emailTplAbsenceRequest
    );
  } else {
    html = await render(React.createElement(AbsenceRequestEmail, {
      staffName,
      tenantName,
      startDate: startStr,
      endDate: endStr,
      reason: data.reason,
      panelUrl,
      locale: 'es',
    }));
  }

  await Promise.allSettled(
    recipients.map(admin =>
      resend.emails.send({
        from: "Zyncrox <notificaciones@zyncrox.com>",
        to: admin.email,
        subject: `📋 Solicitud de ausencia — ${staffName} (${startStr})`,
        html,
      })
    )
  );
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

    await logAuditEvent({ action: 'ABSENCE_APPROVED', userId: session.userId, tenantId: request.tenantId, details: { requestId, staffId: request.staffId, staffName: request.staff?.name } });
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

    await logAuditEvent({ action: 'ABSENCE_REJECTED', userId: session.userId, details: { requestId } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting absence request:", error);
    return { success: false };
  }
}
