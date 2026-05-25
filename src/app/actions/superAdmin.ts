"use server";

import { db } from "@/db";
import { tenants, users, bookings, auditLogs, staff, platformConfig, surveyQuestions } from "@/db/schema";
import { eq, desc, count, and, gte, lte, sql, ne } from "drizzle-orm";
import bcrypt from 'bcryptjs';
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { enforceDowngradeLimits } from "@/lib/billing";

// ─── Guard helper ────────────────────────────────────────────────────────────
async function assertSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: SUPER_ADMIN required');
  }
  return session;
}

// ─── Obtener todos los tenants con estadísticas ───────────────────────────────
export async function getAllTenantsAction() {
  await assertSuperAdmin();

  const allTenants = await db.query.tenants.findMany({
    orderBy: [desc(tenants.createdAt)],
    with: {
      users: { columns: { id: true, email: true, role: true } },
      branches: { columns: { id: true } },
    },
  });

  // Obtener conteo de bookings por tenant
  const bookingCounts = await db
    .select({ tenantId: bookings.tenantId, total: count() })
    .from(bookings)
    .groupBy(bookings.tenantId);

  const bookingMap = Object.fromEntries(bookingCounts.map(b => [b.tenantId, b.total]));

  return allTenants.map(t => ({
    ...t,
    adminCount: t.users?.filter(u => u.role === 'ADMIN').length ?? 0,
    branchCount: t.branches?.length ?? 0,
    bookingCount: bookingMap[t.id] ?? 0,
    daysLeft: t.subscriptionExpiresAt
      ? Math.ceil((new Date(t.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000)
      : null,
  }));
}

// ─── Cambiar plan de un tenant ───────────────────────────────────────────────
export async function updateTenantPlanAction(
  tenantId: string,
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  // Al bajar a BASIC, resetear campos que ya no pueden editar
  const downgradedFields = plan === 'BASIC' ? {
    heroSubtitle: null,                // customHero: false → vuelve al texto por defecto del widget
    theme: 'light' as const,           // customTheme: false → tema claro por defecto
    emailBodyTemplate: null,           // customEmailTemplate: false → sin template personalizado
  } : {};

  await db.update(tenants)
    .set({ plan, updatedAt: new Date(), ...downgradedFields })
    .where(eq(tenants.id, tenantId));

  // Al bajar de ENTERPRISE (Business) → desactivar preguntas NPS (no se eliminan, solo se pausan)
  const prevPlan = prevTenant?.plan;
  const losingNps = prevPlan === 'ENTERPRISE' && plan !== 'ENTERPRISE';
  if (losingNps) {
    await db.update(surveyQuestions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(surveyQuestions.tenantId, tenantId), eq(surveyQuestions.questionType, 'NPS')));
  }

  await enforceDowngradeLimits(tenantId, plan);

  await logAuditEvent({
    action: 'TENANT_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { fromPlan: prevTenant?.plan, toPlan: plan, tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  revalidatePath('/[locale]/admin/(dashboard)/staff', 'page');
  revalidatePath('/[locale]/[slug]', 'page');
  return { success: true };
}

// ─── Cambiar estado de un tenant ─────────────────────────────────────────────
export async function updateTenantStatusAction(
  tenantId: string,
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  await db.update(tenants)
    .set({ status, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { from: prevTenant?.status, to: status, tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  return { success: true };
}

// ─── Eliminar un tenant completo (cascada) ────────────────────────────────────
export async function deleteTenantAction(tenantId: string) {
  const session = await assertSuperAdmin();

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  // Eliminar usuarios explícitamente (el CASCADE en Supabase puede no estar activo)
  await db.delete(users).where(eq(users.tenantId, tenantId));

  await db.delete(tenants).where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_DELETED',
    userId: session.userId,
    tenantId,
    details: { tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  return { success: true };
}

// ─── Impersonación: el Super Admin accede a una empresa SIN perder su identidad ───
// La sesión del Super Admin se mantiene intacta.
// Solo se agrega `impersonatedTenantId` a la sesión para que el dashboard
// muestre los datos de ese tenant. El audit log registra quién accedió.
export async function impersonateTenantAction(tenantId: string) {
  const session = await assertSuperAdmin();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) {
    return { success: false, error: 'Tenant no encontrado' };
  }

  // Actualizar la sesión del Super Admin agregando el contexto de impersonación
  // SIN reemplazar su rol ni email — el Super Admin sigue siendo Super Admin.
  cookies().set('zync_session', JSON.stringify({
    ...session,
    impersonatedTenantId: tenantId,
    impersonatedTenantName: tenant.name,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  });

  await logAuditEvent({
    action: 'IMPERSONATION_STARTED',
    userId: session.userId,
    tenantId,
    details: { superAdminEmail: session.email, tenantName: tenant.name },
  });

  return { success: true };
}

// ─── Terminar impersonación — remover el contexto de tenant de la sesión ──────
export async function endImpersonationAction() {
  const session = await getSession();
  if (!session) return { success: false };

  // Remover los campos de impersonación sin tocar el resto de la sesión
  const { impersonatedTenantId, impersonatedTenantName, ...cleanSession } = session;

  cookies().set('zync_session', JSON.stringify(cleanSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  await logAuditEvent({
    action: 'IMPERSONATION_ENDED',
    userId: session.userId,
    tenantId: impersonatedTenantId,
    details: { superAdminEmail: session.email, tenantName: impersonatedTenantName },
  });

  return { success: true };
}

// ─── Obtener audit logs (con paginación básica) ───────────────────────────────
export async function getAuditLogsAction(filters?: {
  tenantId?: string;
  action?: string;
  limit?: number;
}) {
  await assertSuperAdmin();

  const limit = filters?.limit ?? 50;

  const logs = await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit,
    ...(filters?.tenantId ? { where: eq(auditLogs.tenantId, filters.tenantId) } : {}),
  });

  return logs;
}

// ─── Dashboard completo del Super Admin ──────────────────────────────────────
export async function getSuperAdminDashboardDataAction() {
  await assertSuperAdmin();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    allTenants,
    totalUsersResult,
    bookingsThisMonthResult,
    totalYearResult,
    bookingsByMonthRaw,
    bookingsThisMonthByTenant,
    staffCounts,
    loginLogs,
    recentLogs,
    lastCronLog,
    platformCfg,
  ] = await Promise.all([
    db.query.tenants.findMany({
      orderBy: [desc(tenants.createdAt)],
      // No necesitamos branches en el dashboard principal, solo users para contar admins
      with: { users: { columns: { role: true } } },
    }),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(bookings).where(
      and(gte(bookings.createdAt, startOfMonth), lte(bookings.createdAt, endOfMonth))
    ),
    db.select({ total: count() }).from(bookings).where(gte(bookings.createdAt, startOfYear)),
    db.select({
      month: sql<string>`to_char(${bookings.createdAt}, 'YYYY-MM')`,
      total: count(),
    })
      .from(bookings)
      .where(gte(bookings.createdAt, sixMonthsAgo))
      .groupBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM')`),
    db.select({ tenantId: bookings.tenantId, total: count() })
      .from(bookings)
      .where(and(gte(bookings.createdAt, startOfMonth), lte(bookings.createdAt, endOfMonth)))
      .groupBy(bookings.tenantId),
    db.select({ tenantId: staff.tenantId, total: count() })
      .from(staff)
      .groupBy(staff.tenantId),
    db.query.auditLogs.findMany({
      where: eq(auditLogs.action, 'LOGIN_SUCCESS'),
      orderBy: [desc(auditLogs.createdAt)],
      limit: 500,
    }),
    db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit: 7,
    }),
    db.query.auditLogs.findFirst({
      where: eq(auditLogs.action, 'CRON_REMINDERS_RUN'),
      orderBy: [desc(auditLogs.createdAt)],
    }),
    db.select().from(platformConfig).limit(1).then(rows => rows[0] ?? null),
  ]);

  const staffMap = Object.fromEntries(staffCounts.map(s => [s.tenantId, s.total]));
  const bookingsMonthMap = Object.fromEntries(bookingsThisMonthByTenant.map(b => [b.tenantId, b.total]));

  // Último login por tenant
  const lastLoginMap: Record<string, Date> = {};
  for (const log of loginLogs) {
    if (log.tenantId && !lastLoginMap[log.tenantId]) {
      lastLoginMap[log.tenantId] = new Date(log.createdAt);
    }
  }

  // Actividad compuesta por tenant
  const tenantActivity = allTenants.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    plan: t.plan,
    bookingsThisMonth: bookingsMonthMap[t.id] ?? 0,
    staffCount: staffMap[t.id] ?? 0,
    adminCount: t.users?.filter(u => u.role === 'ADMIN').length ?? 0,
    lastAccessAt: lastLoginMap[t.id] ?? null,
    subscriptionExpiresAt: t.subscriptionExpiresAt,
    daysLeft: t.subscriptionExpiresAt
      ? Math.ceil((new Date(t.subscriptionExpiresAt).getTime() - now.getTime()) / 86400000)
      : null,
    createdAt: t.createdAt,
  }));

  // Construir array de últimos 6 meses con ceros donde no hay datos
  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const bookingsByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = bookingsByMonthRaw.find(r => r.month === key);
    return { month: monthLabels[d.getMonth()], year: d.getFullYear(), total: Number(found?.total ?? 0) };
  });

  const top5Active = [...tenantActivity]
    .sort((a, b) => b.bookingsThisMonth - a.bookingsThisMonth)
    .slice(0, 5);

  const churnRisk = tenantActivity
    .filter(t => {
      const noBookings = t.bookingsThisMonth === 0;
      const noRecentLogin = !t.lastAccessAt || new Date(t.lastAccessAt) < thirtyDaysAgo;
      return noBookings && noRecentLogin && t.status !== 'SUSPENDED';
    })
    .slice(0, 8);

  return {
    totalTenants: allTenants.length,
    activeTenants: allTenants.filter(t => t.status === 'ACTIVE').length,
    trialTenants: allTenants.filter(t => t.status === 'TRIAL').length,
    suspendedTenants: allTenants.filter(t => t.status === 'SUSPENDED').length,
    newTenantsThisMonth: allTenants.filter(t => new Date(t.createdAt) >= startOfMonth).length,
    totalUsers: totalUsersResult[0]?.total ?? 0,
    totalBookingsThisMonth: bookingsThisMonthResult[0]?.total ?? 0,
    totalBookingsThisYear: totalYearResult[0]?.total ?? 0,
    tenantActivity,
    top5Active,
    churnRisk,
    bookingsByMonth,
    recentLogs,
    lastCronRun: lastCronLog
      ? { at: new Date(lastCronLog.createdAt), details: lastCronLog.details as Record<string, unknown> }
      : null,
    wompiConfigured: !!(platformCfg?.wompiAppId && platformCfg?.wompiApiSecret),
    expiringIn7Days: tenantActivity.filter(t => t.daysLeft !== null && t.daysLeft >= 0 && t.daysLeft <= 7),
    expiredTenants: tenantActivity.filter(t => t.daysLeft !== null && t.daysLeft < 0),
  };
}

// ─── Restaurar acceso usando email de recuperación ───────────────────────────
export async function restoreAccessAction(tenantId: string) {
  const session = await assertSuperAdmin();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant?.recoveryEmail) {
    return { success: false, error: 'NO_RECOVERY_EMAIL' };
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const tempPassword = 'Tmp@' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const hashed = await bcrypt.hash(tempPassword, 10);
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  const existing = await db.query.users.findFirst({ where: eq(users.email, tenant.recoveryEmail) });

  if (existing) {
    await db.update(users).set({
      password: hashed,
      isActive: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: expires,
    }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      tenantId,
      name: 'Admin (recuperación)',
      email: tenant.recoveryEmail,
      password: hashed,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: expires,
    });
  }

  await logAuditEvent({
    action: 'ADMIN_CREATED',
    userId: session.userId,
    tenantId,
    details: { recoveryEmail: tenant.recoveryEmail, tenantName: tenant.name },
  });

  return { success: true, recoveryEmail: tenant.recoveryEmail, tempPassword };
}

// ─── Ajustar días de trial (para pruebas) ────────────────────────────────────
export async function updateTenantTrialDaysAction(tenantId: string, days: number) {
  const session = await assertSuperAdmin();

  const now = new Date();
  let newExpiry: Date;
  if (days <= 0) {
    // Expirado: ponerlo 1ms en el pasado
    newExpiry = new Date(now.getTime() - 1000);
  } else {
    newExpiry = new Date(now);
    newExpiry.setDate(newExpiry.getDate() + days);
  }

  const prevTenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

  await db.update(tenants)
    .set({ subscriptionExpiresAt: newExpiry, status: 'TRIAL', updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAuditEvent({
    action: 'TENANT_TRIAL_UPDATED',
    userId: session.userId,
    tenantId,
    details: { days, newExpiry: newExpiry.toISOString(), tenantName: prevTenant?.name },
  });

  revalidatePath('/[locale]/admin/super', 'page');
  revalidatePath('/[locale]/admin/super/tenants', 'page');
  return { success: true };
}

// ─── Email templates (plataforma) ────────────────────────────────────────────
export async function getEmailTemplatesAction() {
  await assertSuperAdmin();
  const cfg = await db.select().from(platformConfig).limit(1).then(rows => rows[0] ?? null);
  return {
    confirmation: cfg?.emailTplConfirmation ?? null,
    reminder: cfg?.emailTplReminder ?? null,
    cancellation: cfg?.emailTplCancellation ?? null,
    reschedule: cfg?.emailTplReschedule ?? null,
    trialWarning: cfg?.emailTplTrialWarning ?? null,
    surveyInvite: cfg?.emailTplSurveyInvite ?? null,
  };
}

export async function updateEmailTemplateAction(
  key: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule' | 'trialWarning' | 'surveyInvite',
  html: string | null
) {
  const session = await assertSuperAdmin();

  const columnMap = {
    confirmation: { emailTplConfirmation: html },
    reminder: { emailTplReminder: html },
    cancellation: { emailTplCancellation: html },
    reschedule: { emailTplReschedule: html },
    trialWarning: { emailTplTrialWarning: html },
    surveyInvite: { emailTplSurveyInvite: html },
  } as const;

  // Ensure row exists
  const existing = await db.select().from(platformConfig).limit(1).then(rows => rows[0] ?? null);
  if (!existing) {
    await db.insert(platformConfig).values({ id: 1, ...columnMap[key], wompiIsProduction: false });
  } else {
    await db.update(platformConfig)
      .set({ ...columnMap[key], updatedAt: new Date() })
      .where(eq(platformConfig.id, 1));
  }

  await logAuditEvent({
    action: 'EMAIL_TEMPLATE_UPDATED',
    userId: session.userId,
    details: { templateKey: key, reset: html === null },
  });

  return { success: true };
}

// ─── Límites de admins por plan ───────────────────────────────────────────────
const ADMIN_LIMITS: Record<string, number> = {
  BASIC: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: Infinity,
};

// ─── Obtener admins de un tenant ──────────────────────────────────────────────
export async function getTenantAdminsAction(tenantId: string) {
  await assertSuperAdmin();
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN')),
    columns: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
}

// ─── Crear nuevo admin para un tenant ────────────────────────────────────────
export async function createTenantAdminAction(
  tenantId: string,
  data: { name: string; email: string }
) {
  const session = await assertSuperAdmin();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return { success: false, error: 'Tenant no encontrado' };

  const limit = ADMIN_LIMITS[tenant.plan] ?? 1;
  const currentAdmins = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.isActive, true)),
  });

  if (currentAdmins.length >= limit) {
    return { success: false, error: 'PLAN_LIMIT', limit };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) return { success: false, error: 'EMAIL_EXISTS' };

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const tempPassword = 'Tmp@' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const hashed = await bcrypt.hash(tempPassword, 10);
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await db.insert(users).values({
    tenantId,
    name: data.name,
    email: data.email,
    password: hashed,
    role: 'ADMIN',
    isActive: true,
    mustChangePassword: true,
    tempPasswordExpiresAt: expires,
  });

  await logAuditEvent({
    action: 'ADMIN_CREATED',
    userId: session.userId,
    tenantId,
    details: { email: data.email, tenantName: tenant.name },
  });

  revalidatePath('/[locale]/admin/super/tenants', 'page');
  return { success: true, tempPassword };
}

// ─── Activar / desactivar un admin ───────────────────────────────────────────
export async function toggleTenantAdminAction(
  userId: string,
  tenantId: string,
  isActive: boolean
) {
  const session = await assertSuperAdmin();

  if (isActive === false) {
    const activeAdmins = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.isActive, true)),
    });
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'LAST_ADMIN' };
    }
  }

  await db.update(users).set({ isActive }).where(eq(users.id, userId));

  await logAuditEvent({
    action: 'ADMIN_STATUS_CHANGED',
    userId: session.userId,
    tenantId,
    details: { targetUserId: userId, isActive },
  });

  return { success: true };
}

// ─── Eliminar un admin ────────────────────────────────────────────────────────
export async function deleteTenantAdminAction(userId: string, tenantId: string) {
  const session = await assertSuperAdmin();

  const remaining = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), ne(users.id, userId)),
  });
  if (remaining.length === 0) {
    return { success: false, error: 'LAST_ADMIN' };
  }

  await db.delete(users).where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

  await logAuditEvent({
    action: 'ADMIN_DELETED',
    userId: session.userId,
    tenantId,
    details: { deletedUserId: userId },
  });

  revalidatePath('/[locale]/admin/super/tenants', 'page');
  return { success: true };
}

// ─── GET TENANT USERS (Super Admin) ─────────────────────────────────────────
export async function getTenantUsersAction(tenantId: string) {
  await assertSuperAdmin();

  const tenantUsers = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId)),
    orderBy: [desc(users.createdAt)],
  });

  // Get last login for each user from audit logs (grab recent logins, map by userId)
  const loginLogs = await db.query.auditLogs.findMany({
    where: and(eq(auditLogs.action, 'LOGIN_SUCCESS'), eq(auditLogs.tenantId, tenantId)),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 200,
  });

  const lastLoginByUser: Record<string, Date> = {};
  for (const log of loginLogs) {
    if (log.userId && !lastLoginByUser[log.userId]) {
      lastLoginByUser[log.userId] = log.createdAt;
    }
  }

  return tenantUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    lastLoginAt: lastLoginByUser[u.id] ?? null,
    // Derived status: Pending = active but must change password (hasn't completed setup)
    status: !u.isActive ? 'INACTIVE' : u.mustChangePassword ? 'PENDING' : 'ACTIVE',
  }));
}

// ─── SUPER ADMIN: RESET PASSWORD ────────────────────────────────────────────
export async function superAdminResetPasswordAction(userId: string) {
  const session = await assertSuperAdmin();

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  await db.update(users).set({
    resetPasswordToken: token,
    resetPasswordExpiresAt: expires,
  }).where(eq(users.id, userId));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zyncrox.com';
  const resetLink = `${appUrl}/es/admin/reset-password?token=${token}`;

  await resend.emails.send({
    from: 'Zyncrox <noreply@zyncrox.com>',
    to: user.email,
    subject: 'Restablecer tu contraseña — Zyncrox',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
        <h1 style="font-size:24px;font-weight:900;margin-bottom:8px;">Restablecer contraseña</h1>
        <p style="color:#a1a1aa;margin-bottom:24px;">Un administrador de la plataforma ha solicitado el restablecimiento de tu contraseña. Haz clic en el botón para crear una nueva. Este enlace expira en 24 horas.</p>
        <a href="${resetLink}" style="display:inline-block;background:#fff;color:#000;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:14px;">Restablecer contraseña</a>
        <p style="color:#52525b;font-size:12px;margin-top:24px;">Si no esperabas este correo, puedes ignorarlo.</p>
      </div>
    `,
  });

  await logAuditEvent({
    action: 'SUPER_ADMIN_RESET_PASSWORD',
    userId: session.userId,
    tenantId: user.tenantId ?? undefined,
    details: {
      superAdminEmail: session.email,
      targetUserId: userId,
      targetEmail: user.email,
    },
  });

  return { success: true };
}

// ─── SUPER ADMIN: RESEND INVITATION ─────────────────────────────────────────
export async function superAdminResendInvitationAction(userId: string) {
  const session = await assertSuperAdmin();

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await db.update(users).set({
    resetPasswordToken: token,
    resetPasswordExpiresAt: expires,
  }).where(eq(users.id, userId));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zyncrox.com';
  const resetLink = `${appUrl}/es/admin/reset-password?token=${token}`;

  await resend.emails.send({
    from: 'Zyncrox <noreply@zyncrox.com>',
    to: user.email,
    subject: 'Invitación a Zyncrox — Activa tu cuenta',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
        <h1 style="font-size:24px;font-weight:900;margin-bottom:8px;">Bienvenido a Zyncrox</h1>
        <p style="color:#a1a1aa;margin-bottom:24px;">Hola ${user.name}, has sido invitado a unirte a Zyncrox. Haz clic en el botón para activar tu cuenta y crear tu contraseña. Este enlace expira en 7 días.</p>
        <a href="${resetLink}" style="display:inline-block;background:#fff;color:#000;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:14px;">Activar mi cuenta</a>
        <p style="color:#52525b;font-size:12px;margin-top:24px;">Si no esperabas este correo, puedes ignorarlo.</p>
      </div>
    `,
  });

  await logAuditEvent({
    action: 'SUPER_ADMIN_RESEND_INVITATION',
    userId: session.userId,
    tenantId: user.tenantId ?? undefined,
    details: {
      superAdminEmail: session.email,
      targetUserId: userId,
      targetEmail: user.email,
    },
  });

  return { success: true };
}

// ─── SUPER ADMIN: DEACTIVATE USER ────────────────────────────────────────────
export async function superAdminDeactivateUserAction(userId: string) {
  const session = await assertSuperAdmin();

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  // Prevent deactivating the last active admin
  if (user.role === 'ADMIN' && user.tenantId) {
    const activeAdmins = await db.query.users.findMany({
      where: and(eq(users.tenantId, user.tenantId), eq(users.role, 'ADMIN'), eq(users.isActive, true)),
    });
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'LAST_ADMIN' };
    }
  }

  await db.update(users).set({ isActive: false }).where(eq(users.id, userId));

  await logAuditEvent({
    action: 'SUPER_ADMIN_DEACTIVATE_USER',
    userId: session.userId,
    tenantId: user.tenantId ?? undefined,
    details: {
      superAdminEmail: session.email,
      targetUserId: userId,
      targetEmail: user.email,
      targetName: user.name,
    },
  });

  return { success: true };
}

// ─── SUPER ADMIN: REACTIVATE USER ────────────────────────────────────────────
export async function superAdminReactivateUserAction(userId: string) {
  const session = await assertSuperAdmin();

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  await db.update(users).set({ isActive: true }).where(eq(users.id, userId));

  await logAuditEvent({
    action: 'SUPER_ADMIN_REACTIVATE_USER',
    userId: session.userId,
    tenantId: user.tenantId ?? undefined,
    details: {
      superAdminEmail: session.email,
      targetUserId: userId,
      targetEmail: user.email,
      targetName: user.name,
    },
  });

  return { success: true };
}
