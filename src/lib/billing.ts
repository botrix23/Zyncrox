"use server"

import { db } from '@/db'
import { branches, staff, services, users } from '@/db/schema'
import { eq, and, ne, asc } from 'drizzle-orm'
import { getPlanFeatures } from '@/core/plans'

/**
 * Desactiva los registros más recientes que excedan el límite del nuevo plan.
 * No borra nada — el admin puede reactivar manualmente respetando el límite.
 */
export async function enforceDowngradeLimits(tenantId: string, newPlan: string) {
  const features = getPlanFeatures(newPlan)

  await Promise.all([
    enforceBranchLimit(tenantId, features.maxBranches),
    enforceStaffLimit(tenantId, features.maxStaff),
    enforceServiceLimit(tenantId, features.maxServices),
    enforceAdminLimit(tenantId, features.maxAdmins),
    enforceReceptionistLimit(tenantId, features.maxReceptionists),
  ])
}

/** Mantiene las `limit` sucursales más antiguas activas, desactiva el resto. */
async function enforceBranchLimit(tenantId: string, limit: number) {
  if (limit <= 0) return // 0 o negativo = sin límite aplicable aquí
  const all = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)))
    .orderBy(asc(branches.createdAt))

  if (all.length <= limit) return

  const keepIds = new Set(all.slice(0, limit).map(r => r.id))
  for (const row of all) {
    if (!keepIds.has(row.id)) {
      await db.update(branches).set({ isActive: false }).where(eq(branches.id, row.id))
    }
  }
}

/** Mantiene los `limit` staff más antiguos activos, desactiva el resto. */
async function enforceStaffLimit(tenantId: string, limit: number) {
  if (limit <= 0) return
  const all = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)))
    .orderBy(asc(staff.createdAt))

  if (all.length <= limit) return

  const keepIds = new Set(all.slice(0, limit).map(r => r.id))
  for (const row of all) {
    if (!keepIds.has(row.id)) {
      await db.update(staff).set({ isActive: false }).where(eq(staff.id, row.id))
    }
  }
}

/** Mantiene los `limit` servicios más antiguos activos, desactiva el resto. */
async function enforceServiceLimit(tenantId: string, limit: number) {
  if (limit <= 0) return
  const all = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.tenantId, tenantId), eq(services.isActive, true)))
    .orderBy(asc(services.createdAt))

  if (all.length <= limit) return

  const keepIds = new Set(all.slice(0, limit).map(r => r.id))
  for (const row of all) {
    if (!keepIds.has(row.id)) {
      await db.update(services).set({ isActive: false }).where(eq(services.id, row.id))
    }
  }
}

/** Mantiene las `limit` recepcionistas más antiguas activas, desactiva el resto. */
async function enforceReceptionistLimit(tenantId: string, limit: number) {
  if (limit >= 9999) return
  const all = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true), eq(staff.isReceptionist, true)))
    .orderBy(asc(staff.createdAt))

  if (all.length <= limit) return

  const keepIds = new Set(all.slice(0, limit).map(r => r.id))
  for (const row of all) {
    if (!keepIds.has(row.id)) {
      await db.update(staff).set({ isActive: false }).where(eq(staff.id, row.id))
    }
  }
}

/** Mantiene los `limit` admins adicionales (no-owner) activos, desactiva el resto. -1 = ilimitado. */
async function enforceAdminLimit(tenantId: string, maxAdmins: number) {
  if (maxAdmins === -1) return // ilimitado
  if (maxAdmins === 0) {
    // Solo owner — desactivar todos los admins adicionales
    await db.update(users)
      .set({ isActive: false })
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.isOwner, false)))
    return
  }
  const extras = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.isOwner, false), eq(users.isActive, true)))
    .orderBy(asc(users.createdAt))

  if (extras.length <= maxAdmins) return

  const keepIds = new Set(extras.slice(0, maxAdmins).map(r => r.id))
  for (const row of extras) {
    if (!keepIds.has(row.id)) {
      await db.update(users).set({ isActive: false }).where(eq(users.id, row.id))
    }
  }
}
