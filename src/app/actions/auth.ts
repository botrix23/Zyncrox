"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from 'bcryptjs';
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";
import { resend } from "@/lib/resend";

/**
 * Genera un slug URL-safe a partir de un nombre de negocio.
 * Ej: "Zync Salón & Spa!" → "zync-salon-spa-a3f2"
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/[^a-z0-9\s-]/g, '')   // Solo alfanuméricos y guiones
    .trim()
    .replace(/\s+/g, '-')           // Espacios → guión
    .slice(0, 40);                  // Máximo 40 chars

  const suffix = Math.random().toString(36).slice(2, 6); // 4 chars aleatorios
  return `${base}-${suffix}`;
}

/**
 * Valida la complejidad de la contraseña según estándares.
 */
function validatePasswordComplexity(password: string) {
  if (password.length < 8) return { success: false };
  if (!/[A-Z]/.test(password)) return { success: false };
  if (!/[a-z]/.test(password)) return { success: false };
  if (!/[0-9]/.test(password)) return { success: false };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { success: false };
  return { success: true };
}

/**
 * Login: valida credenciales y establece cookie de sesión.
 */
export async function loginAction(formData: FormData, locale: string) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === 'true';

  try {
    // 1. Buscar usuario en la base de datos (con join al tenant para ver status)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        tenant: true
      }
    });

    if (!user) {
      return { success: false, errorCode: 'errorInvalid' };
    }

    // 2. Verificar que la cuenta esté activa
    if (!user.isActive) {
      return { success: false, errorCode: 'errorDisabled' };
    }

    // 3. Verificar que el Tenant no esté suspendido
    // El trial vencido NO bloquea el login — el layout redirige a /billing para que pueda pagar
    if (user.role === 'ADMIN' && user.tenant) {
      if (user.tenant.status === 'SUSPENDED') {
        return { success: false, errorCode: 'errorSuspended' };
      }
    }

    // 4. Verificar expiración de contraseña temporal (solo si aún no se ha cambiado)
    if (user.mustChangePassword && user.tempPasswordExpiresAt) {
      if (new Date() > user.tempPasswordExpiresAt) {
        await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
        return { success: false, errorCode: 'errorTempExpired' };
      }
    }

    // 5. Comparar contraseñas hasheadas
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      cookies().set("zync_session", JSON.stringify({
        email: user.email,
        name: user.name,
        role: user.role,
        userId: user.id,
        tenantId: user.tenantId,
        staffId: user.staffId ?? null,
        isOwner: user.isOwner ?? false,
        mustChangePassword: user.mustChangePassword ?? false,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
        path: "/",
      });
      await logAuditEvent({ action: 'LOGIN_SUCCESS', userId: user.id, tenantId: user.tenantId, details: { email: user.email } });
      return { success: true, role: user.role, mustChangePassword: user.mustChangePassword ?? false };
    }

    await logAuditEvent({ action: 'LOGIN_FAILED', details: { email } });
    return { success: false, errorCode: 'errorInvalid' };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, errorCode: 'errorInvalid' };
  }
}

/**
 * Registro de nuevo negocio (Tenant) y su primer usuario Admin.
 */
export async function registerTenantAction(formData: FormData, locale: string) {
  const businessName = formData.get("businessName") as string;
  const adminName = formData.get("adminName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const passwordResult = validatePasswordComplexity(password);
  if (!passwordResult.success) {
    return { success: false, error: "PASSWORD_COMPLEXITY" };
  }

  // Verificar email duplicado antes de crear nada
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { success: false, error: "EMAIL_EXISTS" };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const slug = generateSlug(businessName);
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);

    // Transacción: si el usuario falla, el tenant se revierte
    const { newTenant, newAdmin } = await db.transaction(async (tx) => {
      const [newTenant] = await tx.insert(tenants).values({
        name: businessName,
        slug,
        timezone: 'America/El_Salvador',
        plan: 'ENTERPRISE', // Trial starts with Business plan (full features for 7 days)
        status: 'TRIAL',
        subscriptionExpiresAt: expiration,
      }).returning();

      const [newAdmin] = await tx.insert(users).values({
        tenantId: newTenant.id,
        name: adminName,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isOwner: true,
      }).returning();

      return { newTenant, newAdmin };
    });

    cookies().set("zync_session", JSON.stringify({
      email,
      name: adminName,
      role: 'ADMIN',
      userId: newAdmin.id,
      tenantId: newTenant.id,
      isOwner: true,
    }), {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    await logAuditEvent({ action: 'TENANT_REGISTERED', userId: newAdmin.id, tenantId: newTenant.id, details: { businessName, slug } });
    return { success: true, slug };
  } catch (err) {
    console.error(err);
    return { success: false, error: "REGISTER_ERROR" };
  }
}

/**
 * Logout: elimina la cookie y redirige al login.
 */
export async function logoutAction(locale: string) {
  cookies().delete("zync_session");
  redirect(`/${locale}/admin/login`);
}

/**
 * Genera un token de recuperación y lo guarda.
 */
export async function forgotPasswordAction(email: string, locale: string = 'es') {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      // Por seguridad, no decimos si el email existe o no
      return { success: true }; 
    }

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hora de validez

    await db.update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpiresAt: expires
      })
      .where(eq(users.id, user.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zyncrox.com';
    const resetLink = `${appUrl}/${locale}/admin/reset-password?token=${token}`;

    await resend.emails.send({
      from: 'Zyncrox <noreply@zyncrox.com>',
      to: email,
      subject: 'Recupera tu contraseña - Zyncrox',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
          <h1 style="font-size:24px;font-weight:900;margin-bottom:8px;">Recupera tu contraseña</h1>
          <p style="color:#a1a1aa;margin-bottom:24px;">Haz clic en el botón para restablecer tu contraseña. Este enlace expira en 1 hora.</p>
          <a href="${resetLink}" style="display:inline-block;background:#fff;color:#000;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:14px;">Restablecer contraseña</a>
          <p style="color:#52525b;font-size:12px;margin-top:24px;">Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al procesar la solicitud." };
  }
}

/**
 * Resetea la contraseña usando un token.
 */
export async function resetPasswordAction(token: string, newPassword: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.resetPasswordToken, token)
    });

    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      return { success: false, error: "INVALID_TOKEN" };
    }

    // Validar complejidad
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.success) return { success: false, error: "PASSWORD_COMPLEXITY" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
      .set({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null
      })
      .where(eq(users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "RESET_ERROR" };
  }
}
