"use server";

import { db } from "@/db";
import { serviceCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

export async function getCategoriesAction(tenantId: string) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    return await db.query.serviceCategories.findMany({
      where: eq(serviceCategories.tenantId, sessionTenantId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategoryAction(data: {
  tenantId: string;
  name: string;
  color?: string;
}) {
  try {
    const { tenantId } = await assertAdmin();
    const [created] = await db.insert(serviceCategories).values({
      tenantId,
      name: data.name.trim(),
      color: data.color || '#8b5cf6',
    }).returning();

    revalidatePath("/[locale]/admin/categories", "page");
    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/admin/staff", "page");
    return { success: true, category: created };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategoryAction(data: {
  id: string;
  tenantId: string;
  name?: string;
  color?: string;
}) {
  try {
    const { tenantId } = await assertAdmin();
    await db.update(serviceCategories)
      .set({
        name: data.name?.trim(),
        color: data.color,
      })
      .where(and(eq(serviceCategories.id, data.id), eq(serviceCategories.tenantId, tenantId)));

    revalidatePath("/[locale]/admin/categories", "page");
    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteCategoryAction(id: string, tenantId: string) {
  try {
    const { tenantId: sessionTenantId } = await assertAdmin();
    await db.delete(serviceCategories)
      .where(and(eq(serviceCategories.id, id), eq(serviceCategories.tenantId, sessionTenantId)));

    revalidatePath("/[locale]/admin/categories", "page");
    revalidatePath("/[locale]/admin/services", "page");
    revalidatePath("/[locale]/admin/staff", "page");
    revalidatePath("/[locale]/[slug]", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}
