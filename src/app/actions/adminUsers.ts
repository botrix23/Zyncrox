"use server";

import crypto from 'crypto';
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getEffectiveTenantId } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getPlanFeatures } from "@/core/plans";
import bcrypt from "bcryptjs";

async function assertAdmin() {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) throw new Error('No tenantId');
  return { session, tenantId };
}

/** Lista todos los admins del tenant (owner + adicionales) */
export async function getAdminsAction() {
  const { tenantId } = await assertAdmin();
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN')),
    columns: { id: true, name: true, email: true, isActive: true, isOwner: true, assignedBranchIds: true, createdAt: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}

/** Actualiza las sucursales asignadas a un admin. Solo el owner puede hacerlo. */
export async function updateAdminBranchesAction(targetUserId: string, branchIds: string[]) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) {
    return { success: false, error: 'OWNER_ONLY' };
  }

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)),
    columns: { id: true, isOwner: true, name: true },
  });

  if (!target) return { success: false, error: 'NOT_FOUND' };
  if (target.isOwner) return { success: false, error: 'CANNOT_RESTRICT_OWNER' };

  await db.update(users)
    .set({ assignedBranchIds: branchIds })
    .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'SETTINGS_UPDATED',
    userId: session.userId,
    tenantId,
    details: { field: 'adminBranchAccess', targetUserId, branchIds },
  });

  revalidatePath('/[locale]/admin/settings', 'page');
  return { success: true };
}

/** Crea un nuevo admin adicional. Solo el owner puede hacerlo. */
export async function createAdminAction(data: { name: string; email: string }) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) {
    return { success: false, error: 'OWNER_ONLY' };
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return { success: false, error: 'TENANT_NOT_FOUND' };

  const features = getPlanFeatures(tenant.plan);
  const maxAdmins = features.maxAdmins;

  if (maxAdmins === 0) {
    return { success: false, error: 'PLAN_NO_EXTRA_ADMINS', plan: tenant.plan };
  }

  if (maxAdmins > 0) {
    const extraAdmins = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.isOwner, false)),
    });
    if (extraAdmins.length >= maxAdmins) {
      return { success: false, error: 'PLAN_LIMIT', limit: maxAdmins, plan: tenant.plan };
    }
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) return { success: false, error: 'EMAIL_EXISTS' };

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const tempPassword = 'Tmp@' + Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
  const hashed = await bcrypt.hash(tempPassword, 10);
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await db.insert(users).values({
    tenantId,
    name: data.name,
    email: data.email,
    password: hashed,
    role: 'ADMIN',
    isOwner: false,
    isActive: true,
    mustChangePassword: true,
    tempPasswordExpiresAt: expires,
  });

  await logAuditEvent({
    action: 'ADMIN_CREATED',
    userId: session.userId,
    tenantId,
    details: { email: data.email, name: data.name },
  });

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true, tempPassword };
}

/** Elimina un admin. Solo el owner puede eliminar, y no puede eliminarse a sí mismo. */
export async function deleteAdminAction(targetUserId: string) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) {
    return { success: false, error: 'OWNER_ONLY' };
  }

  if (session.userId === targetUserId) {
    return { success: false, error: 'CANNOT_DELETE_SELF' };
  }

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)),
    columns: { id: true, isOwner: true, name: true, email: true },
  });

  if (!target) return { success: false, error: 'NOT_FOUND' };
  if (target.isOwner) return { success: false, error: 'CANNOT_DELETE_OWNER' };

  await db.delete(users).where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'ADMIN_DELETED',
    userId: session.userId,
    tenantId,
    details: { deletedUserId: targetUserId, deletedEmail: target.email },
  });

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true };
}

/** Activa o desactiva un admin adicional. Solo el owner puede hacerlo. */
export async function toggleAdminAction(targetUserId: string, isActive: boolean) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) {
    return { success: false, error: 'OWNER_ONLY' };
  }

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)),
    columns: { id: true, isOwner: true },
  });

  if (!target) return { success: false, error: 'NOT_FOUND' };
  if (target.isOwner) return { success: false, error: 'CANNOT_MODIFY_OWNER' };

  await db.update(users)
    .set({ isActive })
    .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'ADMIN_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { targetUserId, isActive },
  });

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true };
}

export async function updateRecoveryEmailAction(recoveryEmail: string) {
  const { session, tenantId } = await assertAdmin();

  await db.update(tenants)
    .set({ recoveryEmail: recoveryEmail || null, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'SETTINGS_UPDATED',
    userId: session.userId,
    tenantId,
    details: { field: 'recoveryEmail' },
  });

  revalidatePath('/[locale]/admin/settings', 'page');
  return { success: true };
}

/** Transfiere la titularidad de la cuenta a otro admin. Solo el owner puede hacerlo. */
export async function transferOwnershipAction(targetUserId: string) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) {
    return { success: false, error: 'OWNER_ONLY' };
  }

  if (session.userId === targetUserId) {
    return { success: false, error: 'CANNOT_TRANSFER_TO_SELF' };
  }

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)),
    columns: { id: true, isOwner: true, name: true, email: true, role: true },
  });

  if (!target) return { success: false, error: 'NOT_FOUND' };
  if (target.isOwner) return { success: false, error: 'ALREADY_OWNER' };
  if (target.role !== 'ADMIN') return { success: false, error: 'NOT_ADMIN' };

  // Transfer: new owner gets isOwner=true, current owner loses it
  await db.update(users)
    .set({ isOwner: true })
    .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  await db.update(users)
    .set({ isOwner: false })
    .where(and(eq(users.id, session.userId!), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'OWNERSHIP_TRANSFERRED',
    userId: session.userId,
    tenantId,
    details: { newOwnerId: targetUserId, newOwnerEmail: target.email },
  });

  revalidatePath('/[locale]/admin/settings', 'page');
  return { success: true };
}

export async function getRecoveryEmailAction() {
  const { tenantId } = await assertAdmin();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { recoveryEmail: true },
  });
  return tenant?.recoveryEmail ?? null;
}

// ─── RECEPTIONIST ACTIONS ────────────────────────────────────────────────────

export async function getReceptionistsAction() {
  const { tenantId } = await assertAdmin();
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, 'RECEPTIONIST')),
    columns: { id: true, name: true, email: true, isActive: true, createdAt: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}

export async function createReceptionistAction(data: { name: string; email: string }) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) return { success: false, error: 'OWNER_ONLY' };

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) return { success: false, error: 'EMAIL_EXISTS' };

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const tempPassword = 'Tmp@' + Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
  const hashed = await bcrypt.hash(tempPassword, 10);
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await db.insert(users).values({
    tenantId,
    name: data.name,
    email: data.email,
    password: hashed,
    role: 'RECEPTIONIST',
    isOwner: false,
    isActive: true,
    mustChangePassword: true,
    tempPasswordExpiresAt: expires,
  });

  await logAuditEvent({
    action: 'ADMIN_CREATED',
    userId: session.userId,
    tenantId,
    details: { email: data.email, name: data.name, role: 'RECEPTIONIST' },
  });

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true, tempPassword };
}

export async function deleteReceptionistAction(targetUserId: string) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) return { success: false, error: 'OWNER_ONLY' };
  if (session.userId === targetUserId) return { success: false, error: 'CANNOT_DELETE_SELF' };

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId), eq(users.role, 'RECEPTIONIST')),
    columns: { id: true, email: true },
  });
  if (!target) return { success: false, error: 'NOT_FOUND' };

  await db.delete(users).where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'ADMIN_DELETED',
    userId: session.userId,
    tenantId,
    details: { deletedUserId: targetUserId, deletedEmail: target.email, role: 'RECEPTIONIST' },
  });

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true };
}

export async function toggleReceptionistAction(targetUserId: string, isActive: boolean) {
  const { session, tenantId } = await assertAdmin();

  if (!session.isOwner) return { success: false, error: 'OWNER_ONLY' };

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetUserId), eq(users.tenantId, tenantId), eq(users.role, 'RECEPTIONIST')),
    columns: { id: true },
  });
  if (!target) return { success: false, error: 'NOT_FOUND' };

  await db.update(users).set({ isActive }).where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

  revalidatePath('/[locale]/admin/team', 'page');
  return { success: true };
}
