import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export type SessionUser = {
  email: string;
  name?: string | null;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF';
  tenantId?: string | null;
  userId?: string;
  staffId?: string | null;
  isOwner?: boolean;
  assignedBranchIds?: string[];
  mustChangePassword?: boolean;
  impersonatedBy?: string;
  impersonatedTenantId?: string;
  impersonatedTenantName?: string;
};

const checkUserSession = cache(async (userId: string) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, isActive: true },
    });
    return user || null;
  } catch (e) {
    console.error("Error in checkUserSession db query:", e);
    return null;
  }
});

/**
 * Obtiene la sesión actual desde las cookies de forma segura en el servidor.
 */
export async function getSession(): Promise<SessionUser | null> {
  const sessionCookie = cookies().get("zync_session");
  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(sessionCookie.value) as SessionUser;
    if (!session.userId) return null;

    const dbUser = await checkUserSession(session.userId);
    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return session;
  } catch (e) {
    return null;
  }
}
/**
 * Resuelve el tenantId correcto:
 * - Si es SUPER_ADMIN y está impersonando, retorna el ID de la empresa visitada.
 * - Si es ADMIN, retorna su propio tenantId.
 */
export function getEffectiveTenantId(session: SessionUser | null): string | null {
  if (!session) return null;
  if (session.role === 'SUPER_ADMIN') {
    return session.impersonatedTenantId || null;
  }
  return session.tenantId || null;
}

export function isStaff(session: SessionUser | null): boolean {
  return session?.role === 'STAFF';
}
