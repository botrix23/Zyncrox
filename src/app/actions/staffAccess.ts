"use server";

import { db } from "@/db";
import { staff, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const special = '@#$%!';

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export async function createStaffAccessAction(staffId: string, tenantId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    const member = await db.query.staff.findFirst({
      where: and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)),
    });

    if (!member) return { success: false, error: "Profesional no encontrado" };
    if (!member.email) return { success: false, error: "El profesional no tiene email registrado" };

    const existing = await db.query.users.findFirst({
      where: and(eq(users.staffId, staffId), eq(users.tenantId, tenantId)),
    });

    if (existing) return { success: false, error: "Este profesional ya tiene acceso" };

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await db.insert(users).values({
      tenantId,
      staffId,
      email: member.email,
      name: member.name,
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    });

    revalidatePath("/", "layout");
    return { success: true, tempPassword };
  } catch (error) {
    console.error("Error creating staff access:", error);
    return { success: false, error: "Error al crear acceso" };
  }
}

export async function revokeStaffAccessAction(staffId: string, tenantId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    await db.update(users)
      .set({ isActive: false })
      .where(and(eq(users.staffId, staffId), eq(users.tenantId, tenantId)));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error revoking staff access:", error);
    return { success: false, error: "Error al revocar acceso" };
  }
}

export async function reactivateStaffAccessAction(staffId: string, tenantId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    await db.update(users)
      .set({ isActive: true })
      .where(and(eq(users.staffId, staffId), eq(users.tenantId, tenantId)));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error reactivating staff access:", error);
    return { success: false, error: "Error al reactivar acceso" };
  }
}
