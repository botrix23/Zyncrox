"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth-session";

function validatePasswordComplexity(password: string) {
  if (password.length < 8) return { success: false };
  if (!/[A-Z]/.test(password)) return { success: false };
  if (!/[a-z]/.test(password)) return { success: false };
  if (!/[0-9]/.test(password)) return { success: false };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { success: false };
  return { success: true };
}

export async function changePasswordAction(newPassword: string, confirmPassword: string, currentPassword?: string) {
  const session = await getSession();
  if (!session?.userId) return { success: false, errorCode: 'errorUnauthorized' };

  if (newPassword !== confirmPassword) {
    return { success: false, errorCode: 'errorMismatch' };
  }

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.success) return { success: false, errorCode: 'error' };

  // Si NO es cambio forzado (mustChangePassword), verificar contraseña actual
  if (!session.mustChangePassword) {
    if (!currentPassword) return { success: false, errorCode: 'errorCurrentRequired' };
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { password: true },
    });
    if (!userRecord) return { success: false, errorCode: 'errorUnauthorized' };
    const match = await bcrypt.compare(currentPassword, userRecord.password);
    if (!match) return { success: false, errorCode: 'errorCurrentInvalid' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.update(users)
    .set({
      password: hashedPassword,
      mustChangePassword: false,
      tempPasswordExpiresAt: null,
    })
    .where(eq(users.id, session.userId));

  // Actualizar la cookie para quitar el flag mustChangePassword
  cookies().set("zync_session", JSON.stringify({
    ...session,
    mustChangePassword: false,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return { success: true };
}
