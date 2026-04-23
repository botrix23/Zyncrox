"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from 'bcryptjs';
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

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
  if (password.length < 8) return { success: false, error: "Mínimo 8 caracteres." };
  if (!/[A-Z]/.test(password)) return { success: false, error: "Debe incluir una Mayúscula." };
  if (!/[a-z]/.test(password)) return { success: false, error: "Debe incluir una Minúscula." };
  if (!/[0-9]/.test(password)) return { success: false, error: "Debe incluir un Número." };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { success: false, error: "Debe incluir un Carácter Especial (!@#$%)." };
  return { success: true };
}

/**
 * Login: valida credenciales y establece cookie de sesión.
 */
export async function loginAction(formData: FormData, locale: string) {
const email = formData.get("email") as string;
const password = formData.get("password") as string;
const rememberMe = formData.get("rememberMe") === 'true';

  // 1. Buscar usuario en la base de datos (con join al tenant para ver status)
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      tenant: true
    }
  });

  if (!user) {
    return { success: false, error: "Credenciales inválidas" };
  }

  // 2. Verificar que la cuenta esté activa
  if (!user.isActive) {
    return { success: false, error: "Tu acceso ha sido desactivado. Contacta al administrador." };
  }

  // 3. Verificar que el Tenant no esté suspendido o expirado
  if (user.role === 'ADMIN' && user.tenant) {
    if (user.tenant.status === 'SUSPENDED') {
      return { success: false, error: "Tu cuenta de negocio está suspendida. Contacta a soporte." };
    }
    if (user.tenant.status === 'TRIAL' && user.tenant.subscriptionExpiresAt) {
      const now = new Date();
      if (now > user.tenant.subscriptionExpiresAt) {
        return { success: false, error: "Tu período de prueba ha expirado. Por favor, realiza el pago para continuar." };
      }
    }
  }

  // 4. Comparar contraseñas hasheadas
  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    cookies().set("zync_session", JSON.stringify({
      email: user.email,
      role: user.role,
      userId: user.id,
      tenantId: user.tenantId,
      staffId: user.staffId ?? null,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
      path: "/",
    });
    await logAuditEvent({ action: 'LOGIN_SUCCESS', userId: user.id, tenantId: user.tenantId, details: { email: user.email } });
    return { success: true, role: user.role };
  }

  await logAuditEvent({ action: 'LOGIN_FAILED', details: { email } });
  return { success: false, error: "Credenciales inválidas" };
}

/**
 * Registro de nuevo negocio (Tenant) y su primer usuario Admin.
 */
export async function registerTenantAction(formData: FormData, locale: string) {
  const businessName = formData.get("businessName") as string;
  const adminName = formData.get("adminName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 0. Validaciones de Seguridad (Estándares de la Industria)
  const passwordResult = validatePasswordComplexity(password);
  if (!passwordResult.success) {
    return { success: false, error: passwordResult.error };
  }

  try {
    // 1. Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Generar slug único para la URL pública del booking
    const slug = generateSlug(businessName);

    // 3. Crear el Tenant en modo TRIAL (14 días)
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 14);

    const [newTenant] = await db.insert(tenants).values({
      name: businessName,
      slug,
      timezone: 'America/El_Salvador',
      status: 'TRIAL',
      subscriptionExpiresAt: expiration,
    }).returning();

    // 4. Crear el Usuario Admin vinculado al Tenant
    const [newAdmin] = await db.insert(users).values({
      tenantId: newTenant.id,
      name: adminName,
      email,
      password: hashedPassword,
      role: 'ADMIN',
    }).returning();

    // 5. Establecer sesión
    cookies().set("zync_session", JSON.stringify({ 
      email, 
      role: 'ADMIN',
      userId: newAdmin.id,
      tenantId: newTenant.id 
    }), {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    await logAuditEvent({ action: 'TENANT_REGISTERED', userId: newAdmin.id, tenantId: newTenant.id, details: { businessName, slug } });
    return { success: true, slug };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Error al registrar el negocio. ¿El correo ya existe?" };
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
export async function forgotPasswordAction(email: string) {
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

    // MOCK: En un sistema real aquí se enviaría el email con el link
    console.log(`[PASS_RESET] Token para ${email}: ${token}`);
    
    return { success: true, token }; // Solo devolvemos el token para pruebas (luego quitar)
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
      return { success: false, error: "Token inválido o expirado." };
    }

    // Validar complejidad
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.success) return { success: false, error: complexity.error };

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
    return { success: false, error: "Error al resetear la contraseña." };
  }
}
