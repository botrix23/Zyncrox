"use server";

import crypto from 'crypto';
import { db } from "@/db";
import { staff, users, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import bcrypt from "bcryptjs";
import { canUseFeature } from "@/core/plans";

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const special = '@#$%!';
  const all = upper + lower + nums + special;

  // Use crypto.randomBytes for cryptographically secure randomness
  const randomIndex = (max: number) => crypto.randomInt(max);

  const chars = [
    upper[randomIndex(upper.length)],
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    lower[randomIndex(lower.length)],
    lower[randomIndex(lower.length)],
    nums[randomIndex(nums.length)],
    nums[randomIndex(nums.length)],
    special[randomIndex(special.length)],
  ];

  // Fisher-Yates shuffle using crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
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

    // Plan guard: verificar que el plan permite acceso de staff
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!canUseFeature(tenant?.plan, 'staffAccess')) {
      return { success: false, error: "El acceso de staff no está disponible en tu plan actual." };
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

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(users).values({
      tenantId,
      staffId,
      email: member.email,
      name: member.name,
      password: hashedPassword,
      role: (member as any).isReceptionist ? 'RECEPTIONIST' : 'STAFF',
      isActive: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: expiresAt,
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

export async function resetStaffPasswordAction(staffId: string, tenantId: string) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return { success: false, error: "No autorizado" };
    }

    const existing = await db.query.users.findFirst({
      where: and(eq(users.staffId, staffId), eq(users.tenantId, tenantId)),
    });

    if (!existing) return { success: false, error: "Este profesional no tiene acceso creado" };

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    await db.update(users)
      .set({
        password: hashedPassword,
        mustChangePassword: true,
        tempPasswordExpiresAt: expiresAt,
        isActive: true,
      })
      .where(and(eq(users.staffId, staffId), eq(users.tenantId, tenantId)));

    revalidatePath("/", "layout");
    return { success: true, tempPassword };
  } catch (error) {
    console.error("Error resetting staff password:", error);
    return { success: false, error: "Error al resetear contraseña" };
  }
}
