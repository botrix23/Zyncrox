"use server";

import { db } from "@/db";
import { tenants, users, bookings, auditLogs } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ─── Guard helper ────────────────────────────────────────────────────────────
async function assertSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: SUPER_ADMIN required');
  }
  return session;
}

// ─── Obtener todos los tenants con estadísticas ───────────────────────────────
export async function getAllTenantsAction() {
  await assertSuperAdmin();

  const allTenants = await db.query.tenants.findMany({
    orderBy: [desc(tenants.createdAt)],
    with: {
      users: true,
      branches: true,
    },
  });

  // Obtener conteo de bookings por tenant
  const bookingCounts = await db
    .select({ tenantId: bookings.tenantId, total: count() })
    .from(bookings)
    .groupBy(bookings.tenantId);

  const bookingMap = Object.fromEntries(bookingCounts.map(b => [b.tenantId, b.total]));

  return allTenants.map(t => ({
    ...t,
    adminCount: t.users?.filter(u => u.role === 'ADMIN').length ?? 0,
    branchCount: t.branches?.length ?? 0,
    bookingCount: bookingMap[t.id] ?? 0,
    daysLeft: t.subscriptionExpiresAt
      ? Math.ceil((new Date(t.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000)
      : null,
  }));
}

// ─── Cambiar plan de un tenant ───────────────────────────────────────────────
export async function updateTenantPlanAction(
  tenantId: string,
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  await db.update(tenants)
    .set({ plan, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { fromPlan: prevTenant?.plan, toPlan: plan, tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  return { success: true };
}

// ─── Cambiar estado de un tenant ─────────────────────────────────────────────
export async function updateTenantStatusAction(
  tenantId: string,
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  await db.update(tenants)
    .set({ status, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { from: prevTenant?.status, to: status, tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  return { success: true };
}

// ─── Eliminar un tenant completo (cascada) ────────────────────────────────────
export async function deleteTenantAction(tenantId: string) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  // Los cascade deletes del schema se encargan del resto
  await db.delete(tenants).where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_DELETED',
    userId: session.userId,
    tenantId,
    details: { tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  return { success: true };
}

// ─── Impersonación: el Super Admin accede a una empresa SIN perder su identidad ───
// La sesión del Super Admin se mantiene intacta.
// Solo se agrega `impersonatedTenantId` a la sesión para que el dashboard
// muestre los datos de ese tenant. El audit log registra quién accedió.
export async function impersonateTenantAction(tenantId: string) {
  const session = await assertSuperAdmin();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) {
    return { success: false, error: 'Tenant no encontrado' };
  }

  // Actualizar la sesión del Super Admin agregando el contexto de impersonación
  // SIN reemplazar su rol ni email — el Super Admin sigue siendo Super Admin.
  cookies().set('zync_session', JSON.stringify({
    ...session,
    impersonatedTenantId: tenantId,
    impersonatedTenantName: tenant.name,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  });

  await logAuditEvent({
    action: 'IMPERSONATION_STARTED',
    userId: session.userId,
    tenantId,
    details: { superAdminEmail: session.email, tenantName: tenant.name },
  });

  return { success: true };
}

// ─── Terminar impersonación — remover el contexto de tenant de la sesión ──────
export async function endImpersonationAction() {
  const session = await getSession();
  if (!session) return { success: false };

  // Remover los campos de impersonación sin tocar el resto de la sesión
  const { impersonatedTenantId, impersonatedTenantName, ...cleanSession } = session;

  cookies().set('zync_session', JSON.stringify(cleanSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  await logAuditEvent({
    action: 'IMPERSONATION_ENDED',
    userId: session.userId,
    tenantId: impersonatedTenantId,
    details: { superAdminEmail: session.email, tenantName: impersonatedTenantName },
  });

  return { success: true };
}

// ─── Obtener audit logs (con paginación básica) ───────────────────────────────
export async function getAuditLogsAction(filters?: {
  tenantId?: string;
  action?: string;
  limit?: number;
}) {
  await assertSuperAdmin();

  const limit = filters?.limit ?? 50;

  const logs = await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit,
    ...(filters?.tenantId ? { where: eq(auditLogs.tenantId, filters.tenantId) } : {}),
  });

  return logs;
}
