import { cookies } from "next/headers";

export type SessionUser = {
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF';
  tenantId?: string | null;
  userId?: string;
  staffId?: string | null;
  impersonatedBy?: string;
  impersonatedTenantId?: string;
  impersonatedTenantName?: string;
};

/**
 * Obtiene la sesión actual desde las cookies de forma segura en el servidor.
 */
export async function getSession(): Promise<SessionUser | null> {
  const sessionCookie = cookies().get("zync_session");
  if (!sessionCookie) return null;

  try {
    return JSON.parse(sessionCookie.value) as SessionUser;
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
