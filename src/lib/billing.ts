"use server"

import { db } from '@/db'
import { staff } from '@/db/schema'
import { eq, ne, and, asc } from 'drizzle-orm'

export async function enforceDowngradeLimits(tenantId: string, newPlan: string) {
  if (newPlan === 'BASIC') {
    const allStaff = await db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.tenantId, tenantId))
      .orderBy(asc(staff.createdAt))

    if (allStaff.length > 1) {
      const keepId = allStaff[0].id
      await db.update(staff)
        .set({ isActive: false })
        .where(and(eq(staff.tenantId, tenantId), ne(staff.id, keepId)))
    }
  }
}
