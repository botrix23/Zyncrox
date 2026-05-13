/**
 * Sistema de Auditoría Central — Zyncrox
 * Registra eventos críticos de toda la aplicación en la tabla audit_logs.
 *
 * Uso:
 *   import { logAuditEvent } from '@/lib/audit';
 *   await logAuditEvent({ action: 'LOGIN_SUCCESS', userId: user.id, tenantId: user.tenantId });
 */

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

// Catálogo de acciones auditables
export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TENANT_REGISTERED'
  | 'TENANT_STATUS_CHANGED'   // Activar / Suspender
  | 'TENANT_DELETED'
  | 'IMPERSONATION_STARTED'   // Super admin accede como admin de un tenant
  | 'IMPERSONATION_ENDED'
  | 'SETTINGS_UPDATED'
  | 'APPEARANCE_UPDATED'
  | 'SERVICE_CREATED'
  | 'SERVICE_UPDATED'
  | 'SERVICE_DELETED'
  | 'STAFF_CREATED'
  | 'STAFF_UPDATED'
  | 'STAFF_DELETED'
  | 'BOOKING_CREATED'
  | 'BOOKING_STATUS_CHANGED'
  | 'WOMPI_CREDENTIALS_UPDATED'
  | 'CRON_REMINDERS_RUN'
  | 'ADMIN_CREATED'
  | 'ADMIN_STATUS_CHANGED'
  | 'ADMIN_DELETED';

export interface AuditEventParams {
  action: AuditAction;
  userId?: string | null;
  tenantId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Escribe un evento en la tabla audit_logs.
 * Never throws — los errores de log no deben interrumpir el flujo principal.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: params.action,
      userId: params.userId ?? null,
      tenantId: params.tenantId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    // El log de auditoría nunca debe romper el flujo de la aplicación
    console.error('[AuditLog] Error writing audit event:', params.action, error);
  }
}
