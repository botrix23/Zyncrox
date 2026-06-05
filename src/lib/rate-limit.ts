/**
 * Rate limiting using the existing audit_logs table (no external Redis required).
 * Uses a sliding window approach per email/IP.
 */

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { and, eq, gte, count, sql } from "drizzle-orm";
import { headers } from "next/headers";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMinutes: number;
}

/** Extract the real client IP from Next.js request headers. */
export function getRequestIp(): string {
  const hdrs = headers();
  const forwarded = hdrs.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return hdrs.get('x-real-ip') ?? 'unknown';
}

/**
 * Login: max 5 failed attempts per email in 15 minutes.
 * Queries LOGIN_FAILED events from audit_logs.
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  const WINDOW_MINUTES = 15;
  const MAX_ATTEMPTS = 5;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  try {
    const result = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'LOGIN_FAILED'),
          gte(auditLogs.createdAt, since),
          sql`${auditLogs.details}->>'email' = ${email.toLowerCase()}`
        )
      );

    const attempts = Number(result[0]?.total ?? 0);
    return { allowed: attempts < MAX_ATTEMPTS, retryAfterMinutes: WINDOW_MINUTES };
  } catch {
    // Never block on rate limit errors — fail open
    return { allowed: true, retryAfterMinutes: WINDOW_MINUTES };
  }
}

/**
 * Forgot password: max 3 requests per email in 60 minutes.
 * Queries FORGOT_PASSWORD_REQUESTED events from audit_logs.
 */
export async function checkForgotPasswordRateLimit(email: string): Promise<RateLimitResult> {
  const WINDOW_MINUTES = 60;
  const MAX_ATTEMPTS = 3;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  try {
    const result = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'FORGOT_PASSWORD_REQUESTED' as any),
          gte(auditLogs.createdAt, since),
          sql`${auditLogs.details}->>'email' = ${email.toLowerCase()}`
        )
      );

    const attempts = Number(result[0]?.total ?? 0);
    return { allowed: attempts < MAX_ATTEMPTS, retryAfterMinutes: WINDOW_MINUTES };
  } catch {
    return { allowed: true, retryAfterMinutes: WINDOW_MINUTES };
  }
}

/**
 * Registration: max 3 new tenants per IP in 60 minutes.
 * Queries TENANT_REGISTERED events with matching ipAddress.
 */
export async function checkRegistrationRateLimit(ip: string): Promise<RateLimitResult> {
  const WINDOW_MINUTES = 60;
  const MAX_ATTEMPTS = 3;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  // Skip rate limit for unknown IPs (local dev without proxy)
  if (ip === 'unknown') return { allowed: true, retryAfterMinutes: WINDOW_MINUTES };

  try {
    const result = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'TENANT_REGISTERED'),
          gte(auditLogs.createdAt, since),
          eq(auditLogs.ipAddress, ip)
        )
      );

    const attempts = Number(result[0]?.total ?? 0);
    return { allowed: attempts < MAX_ATTEMPTS, retryAfterMinutes: WINDOW_MINUTES };
  } catch {
    return { allowed: true, retryAfterMinutes: WINDOW_MINUTES };
  }
}
