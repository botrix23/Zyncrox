"use server";

import { db } from "@/db";
import { platformConfig, tenants, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { verifyWompiCredentials } from "@/lib/wompi";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Save Wompi credentials — super admin only, stored in platform_config
// ---------------------------------------------------------------------------
export async function saveWompiCredentialsAction(data: {
  wompiAppId: string;
  wompiApiSecret: string;
  wompiIsProduction: boolean;
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return { success: false, error: "No autorizado" };
    }

    // Upsert the singleton row (id = 1)
    await db
      .insert(platformConfig)
      .values({
        id: 1,
        wompiAppId: data.wompiAppId.trim() || null,
        wompiApiSecret: data.wompiApiSecret.trim() || null,
        wompiIsProduction: data.wompiIsProduction,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          wompiAppId: data.wompiAppId.trim() || null,
          wompiApiSecret: data.wompiApiSecret.trim() || null,
          wompiIsProduction: data.wompiIsProduction,
          updatedAt: new Date(),
        },
      });

    await logAuditEvent({
      action: "WOMPI_CREDENTIALS_UPDATED",
      userId: session.userId,
      details: { isProduction: data.wompiIsProduction },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error saving Wompi credentials:", error);
    return { success: false, error: "Error al guardar las credenciales" };
  }
}

// ---------------------------------------------------------------------------
// Test Wompi credentials — calls GET /Cuenta (no DB write, anyone can test)
// ---------------------------------------------------------------------------
export async function testWompiCredentialsAction(data: {
  wompiAppId: string;
  wompiApiSecret: string;
  wompiIsProduction: boolean;
}) {
  try {
    const result = await verifyWompiCredentials({
      appId: data.wompiAppId.trim(),
      apiSecret: data.wompiApiSecret.trim(),
      isProduction: data.wompiIsProduction,
    });

    if (result.ok) {
      return {
        success: true,
        accountName: result.data.nombreComercial || result.data.nombreCuenta,
        email: result.data.emailLogin,
        businesses: result.data.aplicativos?.map((a) => ({
          id: a.idAplicativo,
          name: a.nombre,
          isProduction: a.estaProductivo,
        })) ?? [],
      };
    } else {
      console.error("[Wompi] test failed — status:", result.status, "body:", JSON.stringify(result.data));
      return {
        success: false,
        error: `Credenciales inválidas (HTTP ${result.status}). Verifica tu App ID y API Secret.`,
      };
    }
  } catch (err) {
    console.error("[Wompi] connection error:", err);
    return {
      success: false,
      error: "No se pudo conectar con Wompi. Intenta de nuevo.",
    };
  }
}

// ---------------------------------------------------------------------------
// Save plan prices — super admin only, stored in platform_config
// ---------------------------------------------------------------------------
export async function savePlanPricesAction(data: {
  planPriceBasic: number;
  planPriceProfessional: number;
  planPriceEnterprise: number;
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return { success: false, error: "No autorizado" };
    }

    const basic = String(data.planPriceBasic);
    const pro   = String(data.planPriceProfessional);
    const ent   = String(data.planPriceEnterprise);

    await db
      .insert(platformConfig)
      .values({
        id: 1,
        planPriceBasic:        basic,
        planPriceProfessional: pro,
        planPriceEnterprise:   ent,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          planPriceBasic:        basic,
          planPriceProfessional: pro,
          planPriceEnterprise:   ent,
          updatedAt: new Date(),
        },
      });

    await logAuditEvent({
      action: "PLAN_PRICES_UPDATED",
      userId: session.userId,
      details: { basic, pro, ent },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error saving plan prices:", error);
    return { success: false, error: "Error al guardar los precios" };
  }
}

// ---------------------------------------------------------------------------
// Save N1co plan config — plan IDs (from N1co panel) + prices + location code
// ---------------------------------------------------------------------------
export async function saveN1coPlanConfigAction(data: {
  n1coLocationCode: string;
  basic:        { planId: string; price: number };
  professional: { planId: string; price: number };
  enterprise:   { planId: string; price: number };
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return { success: false, error: "No autorizado" };
    }

    if (data.basic.price <= 0 || data.professional.price <= 0 || data.enterprise.price <= 0) {
      return { success: false, error: "Todos los precios deben ser mayores que 0" };
    }

    await db
      .insert(platformConfig)
      .values({
        id: 1,
        n1coLocationCode:       data.n1coLocationCode.trim() || null,
        n1coPlanIdBasic:        data.basic.planId.trim()        || null,
        n1coPlanIdProfessional: data.professional.planId.trim() || null,
        n1coPlanIdEnterprise:   data.enterprise.planId.trim()   || null,
        planPriceBasic:        String(data.basic.price),
        planPriceProfessional: String(data.professional.price),
        planPriceEnterprise:   String(data.enterprise.price),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          n1coLocationCode:       data.n1coLocationCode.trim() || null,
          n1coPlanIdBasic:        data.basic.planId.trim()        || null,
          n1coPlanIdProfessional: data.professional.planId.trim() || null,
          n1coPlanIdEnterprise:   data.enterprise.planId.trim()   || null,
          planPriceBasic:        String(data.basic.price),
          planPriceProfessional: String(data.professional.price),
          planPriceEnterprise:   String(data.enterprise.price),
          updatedAt: new Date(),
        },
      });

    await logAuditEvent({
      action: "N1CO_PLAN_CONFIG_UPDATED",
      userId: session.userId,
      details: {
        locationCode: data.n1coLocationCode,
        basicPlanId: data.basic.planId,
        priceBasic: data.basic.price,
        professionalPlanId: data.professional.planId,
        priceProfessional: data.professional.price,
        enterprisePlanId: data.enterprise.planId,
        priceEnterprise: data.enterprise.price,
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error saving N1co plan config:", error);
    return { success: false, error: "Error al guardar la configuración de planes" };
  }
}

// ---------------------------------------------------------------------------
// Price change notice — save / clear / send emails
// ---------------------------------------------------------------------------

type PriceChangePlan = { plan: string; currentPrice: number; newPrice: number };

export async function savePriceChangeNoticeAction(data: {
  effectiveDate: string;
  messageEs: string;
  messageEn: string;
  plans: PriceChangePlan[];
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") return { success: false, error: "No autorizado" };

    if (!data.effectiveDate || !data.messageEs.trim() || !data.messageEn.trim() || data.plans.length === 0) {
      return { success: false, error: "Completa todos los campos del aviso." };
    }

    const notice = {
      effectiveDate: data.effectiveDate,
      messageEs: data.messageEs.trim(),
      messageEn: data.messageEn.trim(),
      plans: data.plans,
    };

    await db.insert(platformConfig).values({ id: 1, priceChangeNotice: notice, updatedAt: new Date() })
      .onConflictDoUpdate({ target: platformConfig.id, set: { priceChangeNotice: notice, updatedAt: new Date() } });

    await logAuditEvent({ action: "PRICE_CHANGE_NOTICE_SAVED", userId: session.userId, details: notice });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("savePriceChangeNotice error:", err);
    return { success: false, error: "Error al guardar el aviso." };
  }
}

export async function clearPriceChangeNoticeAction() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") return { success: false, error: "No autorizado" };

    await db.insert(platformConfig).values({ id: 1, priceChangeNotice: null, updatedAt: new Date() })
      .onConflictDoUpdate({ target: platformConfig.id, set: { priceChangeNotice: null, updatedAt: new Date() } });

    await logAuditEvent({ action: "PRICE_CHANGE_NOTICE_CLEARED", userId: session.userId });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("clearPriceChangeNotice error:", err);
    return { success: false, error: "Error al limpiar el aviso." };
  }
}

export async function sendPriceChangeEmailsAction() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") return { success: false, error: "No autorizado" };

    // Fetch active notice
    const cfg = await db.select().from(platformConfig).limit(1).then(r => r[0] ?? null);
    const notice = cfg?.priceChangeNotice;
    if (!notice) return { success: false, error: "No hay aviso activo para enviar." };

    // Get all active/trial tenant IDs
    const activeTenants = await db.query.tenants.findMany({
      where: inArray(tenants.status, ['ACTIVE', 'TRIAL']),
      columns: { id: true, name: true, emailLocale: true },
    });
    if (activeTenants.length === 0) return { success: true, sent: 0 };

    const tenantIds = activeTenants.map(t => t.id);

    // Get ADMIN users for those tenants (first admin per tenant)
    const adminUsers = await db.query.users.findMany({
      where: and(
        inArray(users.tenantId, tenantIds),
        eq(users.role, 'ADMIN'),
        eq(users.isActive, true),
      ),
      columns: { tenantId: true, email: true, name: true },
    });

    if (adminUsers.length === 0) return { success: true, sent: 0 };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.EMAIL_FROM ?? "Zyncrox <noreply@zyncrox.com>";

    // Build plan change rows HTML
    function planRows(plans: PriceChangePlan[], locale: string) {
      return plans.map(p => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;font-weight:600;">${p.plan}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;text-decoration:line-through;color:#71717a;">$${p.currentPrice}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;font-weight:700;color:#7c3aed;">$${p.newPrice}</td>
        </tr>`).join('');
    }

    // Format effective date nicely
    const dateObj = new Date(notice.effectiveDate + 'T12:00:00');
    const dateEs = dateObj.toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateEn = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    // Group admins by tenant to pick one per tenant
    const adminByTenant = new Map<string, typeof adminUsers[0]>();
    for (const u of adminUsers) {
      if (!adminByTenant.has(u.tenantId!)) adminByTenant.set(u.tenantId!, u);
    }

    let sent = 0;
    let failed = 0;

    for (const tenant of activeTenants) {
      const admin = adminByTenant.get(tenant.id);
      if (!admin?.email) continue;

      const locale = tenant.emailLocale ?? 'es';
      const isEn = locale === 'en';
      const msg = isEn ? notice.messageEn : notice.messageEs;
      const effectiveLabel = isEn ? 'Effective date' : 'Fecha efectiva';
      const planCol = isEn ? 'Plan' : 'Plan';
      const currentCol = isEn ? 'Current price' : 'Precio actual';
      const newCol = isEn ? 'New price' : 'Nuevo precio';
      const greeting = isEn
        ? `Hello${admin.name ? ` ${admin.name}` : ''},`
        : `Hola${admin.name ? ` ${admin.name}` : ''},`;
      const subjectLine = isEn
        ? `Important: Upcoming price changes at Zyncrox`
        : `Aviso importante: cambios de precio en Zyncrox`;
      const footer = isEn
        ? `If you have questions, contact us. Thank you for being part of Zyncrox.`
        : `Si tienes alguna pregunta, contáctanos. Gracias por ser parte de Zyncrox.`;

      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 32px 24px;">
            <p style="color:#fff;font-size:22px;font-weight:900;margin:0;">Zyncrox</p>
            <p style="color:#ede9fe;font-size:14px;margin:4px 0 0;">${isEn ? 'Price change notice' : 'Aviso de cambio de precios'}</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="font-size:15px;color:#18181b;margin:0 0 12px;">${greeting}</p>
            <p style="font-size:14px;color:#52525b;line-height:1.6;margin:0 0 20px;">${msg}</p>
            <p style="font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">${effectiveLabel}: ${isEn ? dateEn : dateEs}</p>
            <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;margin-bottom:24px;">
              <thead>
                <tr style="background:#f4f4f5;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#71717a;font-weight:700;">${planCol}</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#71717a;font-weight:700;">${currentCol}</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#71717a;font-weight:700;">${newCol}</th>
                </tr>
              </thead>
              <tbody>${planRows(notice.plans, locale)}</tbody>
            </table>
            <p style="font-size:13px;color:#71717a;border-top:1px solid #f4f4f5;padding-top:20px;margin:0;">${footer}</p>
          </div>
        </div>
      </body></html>`;

      try {
        await resend.emails.send({ from: fromEmail, to: admin.email, subject: subjectLine, html });
        sent++;
      } catch (e) {
        console.error(`Failed to send price change email to ${admin.email}:`, e);
        failed++;
      }
    }

    await logAuditEvent({
      action: "PRICE_CHANGE_NOTICE_EMAILS_SENT",
      userId: session.userId,
      details: { sent, failed, effectiveDate: notice.effectiveDate },
    });

    return { success: true, sent, failed };
  } catch (err) {
    console.error("sendPriceChangeEmails error:", err);
    return { success: false, error: "Error al enviar los correos." };
  }
}
