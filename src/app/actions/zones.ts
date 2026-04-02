"use server";

import { db } from "@/db";
import { coverageZones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

export async function getCoverageZonesAction(tenantId: string) {
  try {
    const zones = await db.query.coverageZones.findMany({
      where: eq(coverageZones.tenantId, tenantId),
      orderBy: (zones, { asc }) => [asc(zones.name)],
    });
    return { success: true, zones };
  } catch (error) {
    console.error("Error fetching coverage zones:", error);
    return { success: false, error: "Failed to fetch zones" };
  }
}

export async function createCoverageZoneAction(data: {
  tenantId: string;
  name: string;
  fee: string;
  description?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const [newZone] = await db.insert(coverageZones).values({
      tenantId: data.tenantId,
      name: data.name,
      fee: data.fee,
      description: data.description,
    }).returning();

    revalidatePath("/", "layout");
    return { success: true, zone: newZone };
  } catch (error) {
    console.error("Error creating coverage zone:", error);
    return { success: false, error: "Failed to create zone" };
  }
}

export async function updateCoverageZoneAction(data: {
  id: string;
  name?: string;
  fee?: string;
  description?: string;
  isActive?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    await db.update(coverageZones)
      .set({
        name: data.name,
        fee: data.fee,
        description: data.description,
        isActive: data.isActive,
      })
      .where(eq(coverageZones.id, data.id));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating coverage zone:", error);
    return { success: false, error: "Failed to update zone" };
  }
}

export async function deleteCoverageZoneAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    await db.delete(coverageZones).where(eq(coverageZones.id, id));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error deleting coverage zone:", error);
    return { success: false, error: "Failed to delete zone" };
  }
}
