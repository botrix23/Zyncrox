"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";

export async function updateTenantSettingsAction(data: {
  tenantId: string;
  name?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  homeServiceTerms?: string;
  homeServiceTermsEnabled?: boolean;
  waMessageTemplate?: string | null;
  homeServiceLeadDays?: number;
  vipThreshold?: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  emailBodyTemplate?: string | null;
}) {
  try {
    const session = await getSession();
    await db.update(tenants)
      .set({
        name: data.name,
        logoUrl: data.logoUrl,
        whatsappNumber: data.whatsappNumber,
        homeServiceTerms: data.homeServiceTerms,
        homeServiceTermsEnabled: data.homeServiceTermsEnabled,
        waMessageTemplate: data.waMessageTemplate,
        homeServiceLeadDays: data.homeServiceLeadDays,
        vipThreshold: data.vipThreshold,
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        emailBodyTemplate: data.emailBodyTemplate,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, data.tenantId));

    await logAuditEvent({
      action: 'SETTINGS_UPDATED',
      userId: session?.userId,
      tenantId: data.tenantId,
      details: { updatedFields: Object.keys(data).filter(k => k !== 'tenantId') },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating tenant settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function updatePortalSettingsAction(data: {
  tenantId: string;
  name: string;
  primaryColor: string;
  theme: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  whatsappNumber?: string | null;
  homeServiceTerms?: string | null;
  homeServiceTermsEnabled: boolean;
  waMessageTemplate?: string | null;
  allowsHomeService: boolean;
  homeServiceLeadDays: number;
  vipThreshold: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  emailBodyTemplate?: string | null;
  bookingSettings?: any;
}) {
  try {
    const session = await getSession();
    await db.update(tenants)
      .set({
        name: data.name,
        primaryColor: data.primaryColor,
        theme: data.theme,
        coverUrl: data.coverUrl,
        logoUrl: data.logoUrl || null,
        instagramUrl: data.instagramUrl || null,
        facebookUrl: data.facebookUrl || null,
        tiktokUrl: data.tiktokUrl || null,
        whatsappNumber: data.whatsappNumber || null,
        homeServiceTerms: data.homeServiceTerms || null,
        homeServiceTermsEnabled: data.homeServiceTermsEnabled,
        waMessageTemplate: data.waMessageTemplate || null,
        allowsHomeService: data.allowsHomeService,
        homeServiceLeadDays: data.homeServiceLeadDays,
        vipThreshold: data.vipThreshold,
        heroTitle: data.heroTitle || null,
        heroSubtitle: data.heroSubtitle || null,
        emailBodyTemplate: data.emailBodyTemplate || null,
        bookingSettings: data.bookingSettings,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, data.tenantId));

    await logAuditEvent({
      action: 'APPEARANCE_UPDATED',
      userId: session?.userId,
      tenantId: data.tenantId,
      details: { theme: data.theme, primaryColor: data.primaryColor },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating appearance:", error);
    return { success: false, error: "Failed to update appearance" };
  }
}
