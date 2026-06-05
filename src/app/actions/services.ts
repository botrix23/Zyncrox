"use server";

import { db } from "@/db";
import { services, serviceBranches, serviceToCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkPlanLimit } from "@/lib/plan-guard";
import { getSession, getEffectiveTenantId } from "@/lib/auth-session";

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
  try {
    const { tenantId } = await assertAdmin();
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

    const newService = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(services).values({
        tenantId,
        name: data.name,
        durationMinutes: data.durationMinutes,
        price: data.price,
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
          data.branchIds.map(branchId => ({
            tenantId,
            serviceId: inserted.id,
            branchId,
          }))
        );
      }

      if (data.categoryIds && data.categoryIds.length > 0) {
        await tx.insert(serviceToCategories).values(
          data.categoryIds.map(categoryId => ({
            tenantId,
            serviceId: inserted.id,
            categoryId,
          }))
        );
      }

      return inserted;
    });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true, service: newService };
  } catch (error) {
    console.error("Error creating service:", error);
    return { success: false, error: "Failed to create service" };
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
  try {
    const { tenantId } = await assertAdmin();
    await db.transaction(async (tx) => {
      await tx.update(services)
        .set({
          name: data.name,
          durationMinutes: data.durationMinutes,
          price: data.price,
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
            data.branchIds.map(branchId => ({
              tenantId,
              serviceId: data.id,
              branchId,
            }))
          );
        }
      }

      if (data.categoryIds !== undefined) {
        await tx.delete(serviceToCategories).where(eq(serviceToCategories.serviceId, data.id));
        if (data.categoryIds.length > 0) {
          await tx.insert(serviceToCategories).values(
            data.categoryIds.map(categoryId => ({
              tenantId,
              serviceId: data.id,
              categoryId,
            }))
          );
        }
      }
    });

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Failed to update service" };
  }
}

export async function deleteServiceAction(id: string, tenantId: string) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, sessionTenantId)));
    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Failed to delete service" };
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

/**
 * Activar / desactivar un servicio
 * Al reactivar, verifica que no se exceda el límite del plan
 */
export async function toggleServiceActiveAction(id: string, tenantId: string, currentlyActive: boolean) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
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

    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error toggling service:", error);
    return { success: false, error: "Failed to toggle service" };
  }
}
