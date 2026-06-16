"use server";

import { db } from "@/db";
import { services, serviceBranches, serviceToCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkPlanLimit } from "@/lib/plan-guard";
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

export async function createServiceAction(data: {
  tenantId: string;
  name: string;
  durationMinutes: number;
  price: string;
  description?: string;
  includes?: string[];
  excludes?: string[];
  sortOrder?: number;
  allowsHomeService?: boolean;
  allowSimultaneous?: boolean;
  isExclusive?: boolean;
  branchIds?: string[];
  categoryIds?: string[];
}) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId, session } = ctx;
    const limitCheck = await checkPlanLimit(tenantId, "services");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: "PLAN_LIMIT_EXCEEDED",
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: limitCheck.plan,
      };
    }

    const normalizedPrice = data.price.replace(/[$\s]/g, '').replace(',', '.');

    const newService = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(services).values({
        tenantId,
        name: data.name,
        durationMinutes: data.durationMinutes,
        price: normalizedPrice,
        description: data.description,
        includes: data.includes || [],
        excludes: data.excludes || [],
        sortOrder: data.sortOrder || 0,
        allowsHomeService: data.allowsHomeService ?? true,
        allowSimultaneous: data.allowSimultaneous ?? false,
        isExclusive: data.isExclusive ?? false,
      }).returning();

      if (data.branchIds && data.branchIds.length > 0) {
        await tx.insert(serviceBranches).values(
          data.branchIds.map(branchId => ({ tenantId, serviceId: inserted.id, branchId }))
        );
      }

      if (data.categoryIds && data.categoryIds.length > 0) {
        await tx.insert(serviceToCategories).values(
          data.categoryIds.map(categoryId => ({ tenantId, serviceId: inserted.id, categoryId }))
        );
      }

      return inserted;
    });

    logAuditEvent({ action: 'SERVICE_CREATED', userId: session.userId, tenantId, details: { name: data.name, price: normalizedPrice, durationMinutes: data.durationMinutes } });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true, service: newService };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error creating service:", msg);
    logAuditEvent({ action: 'SERVICE_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'create', name: data.name, error: msg, level: 'error' } });
    return { success: false, error: msg };
  }
}

export async function updateServiceAction(data: {
  id: string;
  tenantId: string;
  name?: string;
  durationMinutes?: number;
  price?: string;
  description?: string;
  includes?: string[];
  excludes?: string[];
  sortOrder?: number;
  allowsHomeService?: boolean;
  allowSimultaneous?: boolean;
  isExclusive?: boolean;
  branchIds?: string[];
  categoryIds?: string[];
}) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId, session } = ctx;
    const normalizedPrice = data.price ? data.price.replace(/[$\s]/g, '').replace(',', '.') : data.price;
    await db.transaction(async (tx) => {
      await tx.update(services)
        .set({
          name: data.name,
          durationMinutes: data.durationMinutes,
          price: normalizedPrice,
          description: data.description,
          includes: data.includes,
          excludes: data.excludes,
          sortOrder: data.sortOrder,
          allowsHomeService: data.allowsHomeService,
          allowSimultaneous: data.allowSimultaneous,
          isExclusive: data.isExclusive,
          updatedAt: new Date(),
        })
        .where(and(eq(services.id, data.id), eq(services.tenantId, tenantId)));

      if (data.branchIds !== undefined) {
        await tx.delete(serviceBranches).where(eq(serviceBranches.serviceId, data.id));
        if (data.branchIds.length > 0) {
          await tx.insert(serviceBranches).values(
            data.branchIds.map(branchId => ({ tenantId, serviceId: data.id, branchId }))
          );
        }
      }

      if (data.categoryIds !== undefined) {
        await tx.delete(serviceToCategories).where(eq(serviceToCategories.serviceId, data.id));
        if (data.categoryIds.length > 0) {
          await tx.insert(serviceToCategories).values(
            data.categoryIds.map(categoryId => ({ tenantId, serviceId: data.id, categoryId }))
          );
        }
      }
    });

    logAuditEvent({ action: 'SERVICE_UPDATED', userId: session.userId, tenantId, details: { serviceId: data.id, name: data.name } });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error updating service:", msg);
    logAuditEvent({ action: 'SERVICE_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'update', serviceId: data.id, name: data.name, error: msg, level: 'error' } });
    return { success: false, error: msg };
  }
}

export async function deleteServiceAction(id: string, tenantId: string) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId: sessionTenantId, session } = ctx;
    await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, sessionTenantId)));

    logAuditEvent({ action: 'SERVICE_DELETED', userId: session.userId, tenantId: sessionTenantId, details: { serviceId: id } });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error deleting service:", msg);
    logAuditEvent({ action: 'SERVICE_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'delete', serviceId: id, error: msg, level: 'error' } });
    return { success: false, error: msg };
  }
}

export async function reorderServicesAction(tenantId: string, orderedIds: string[]) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(services)
        .set({ sortOrder: i })
        .where(and(eq(services.id, orderedIds[i]), eq(services.tenantId, sessionTenantId)));
    }
    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error reordering services:", error);
    return { success: false };
  }
}

export async function toggleServiceActiveAction(id: string, tenantId: string, currentlyActive: boolean) {
  let ctx: Awaited<ReturnType<typeof assertAdmin>> | null = null;
  try {
    ctx = await assertAdmin();
    const { tenantId: sessionTenantId, session } = ctx;
    if (!currentlyActive) {
      const limitCheck = await checkPlanLimit(sessionTenantId, "services");
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: "PLAN_LIMIT_EXCEEDED",
          limit: limitCheck.limit,
          current: limitCheck.current,
          plan: limitCheck.plan,
        };
      }
    }

    await db.update(services)
      .set({ isActive: !currentlyActive })
      .where(and(eq(services.id, id), eq(services.tenantId, sessionTenantId)));

    logAuditEvent({ action: 'SERVICE_UPDATED', userId: session.userId, tenantId: sessionTenantId, details: { serviceId: id, isActive: !currentlyActive } });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error toggling service:", msg);
    logAuditEvent({ action: 'SERVICE_ERROR', userId: ctx?.session.userId ?? null, tenantId: ctx?.tenantId ?? null, details: { op: 'toggle', serviceId: id, error: msg, level: 'error' } });
    return { success: false, error: msg };
  }
}
