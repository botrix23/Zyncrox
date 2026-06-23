"use server";

import { db } from "@/db";
import { absenceRequests, blocks, users, staff as staffTable, tenants } from "@/db/schema";
import { eq, and, arrayContains } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { resend } from "@/lib/resend";
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
  const [staffMember, allAdmins, tenant] = await Promise.all([
    db.query.staff.findFirst({ where: eq(staffTable.id, data.staffId), columns: { name: true, branchId: true } }),
    db.select({ email: users.email, name: users.name, isOwner: users.isOwner, assignedBranchIds: users.assignedBranchIds })
      .from(users)
      .where(and(eq(users.tenantId, data.tenantId), eq(users.role, 'ADMIN'), eq(users.isActive, true))),
    db.query.tenants.findFirst({ where: eq(tenants.id, data.tenantId), columns: { name: true } }),
  ]);

  if (!allAdmins.length || !staffMember) return;

  const staffBranchId = staffMember.branchId;

  // Prefer admins explicitly assigned to the staff member's branch
  let recipients = staffBranchId
    ? allAdmins.filter(a => a.assignedBranchIds?.includes(staffBranchId))
    : [];

  // Fallback: if no branch-scoped admin found, notify all owners
  if (!recipients.length) {
    recipients = allAdmins.filter(a => a.isOwner);
  }

  // Last resort: notify all active admins
  if (!recipients.length) {
    recipients = allAdmins;
  }

  if (!recipients.length) return;

  const staffName = staffMember.name;
  const tenantName = tenant?.name ?? '';
  const dateLocale = es;
  const startStr = format(data.startTime, "d 'de' MMMM yyyy", { locale: dateLocale });
  const endStr = format(data.endTime, "d 'de' MMMM yyyy", { locale: dateLocale });
  const panelUrl = `https://www.zyncrox.com/es/admin/staff`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Zyncrox</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${tenantName}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#1e1b4b;">📋 Nueva solicitud de ausencia</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Un miembro de tu equipo ha solicitado días de ausencia que requieren tu aprobación.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Especialista</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#1e293b;">${staffName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Período</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#1e293b;">${startStr} → ${endStr}</p>
                </td>
              </tr>
              ${data.reason ? `
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Motivo</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#475569;">${data.reason}</p>
                </td>
              </tr>` : ''}
            </table>

            <a href="${panelUrl}" style="display:block;background:#7c3aed;color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
              Revisar en el panel →
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Ve a <strong>Staff → Solicitudes</strong> para aprobar o rechazar.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">Zyncrox · Este es un mensaje automático, no respondas a este correo.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
