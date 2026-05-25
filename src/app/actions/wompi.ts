"use server";

import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { verifyWompiCredentials } from "@/lib/wompi";

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
