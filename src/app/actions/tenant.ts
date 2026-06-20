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
  emailLocale?: string;
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
        emailLocale: data.emailLocale,
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

export async function updateShowStaffSelectionAction(tenantId: string, showStaffSelection: boolean) {
  try {
    await db.update(tenants)
      .set({ showStaffSelection, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating showStaffSelection:", error);
    return { success: false };
  }
}

export async function updateHomeServiceTravelTimeAction(tenantId: string, travelTime: number) {
  try {
    await db.update(tenants)
      .set({ homeServiceTravelTime: Math.max(0, travelTime), updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating travel time:", error);
    return { success: false };
  }
}

export async function updateHomeServiceSettingsAction(data: {
  tenantId: string;
  allowsHomeService: boolean;
  homeServiceTermsEnabled: boolean;
  homeServiceTerms?: string;
  homeServiceLeadDays: number;
}) {
  try {
    await db.update(tenants)
      .set({
        allowsHomeService: data.allowsHomeService,
        homeServiceTermsEnabled: data.homeServiceTermsEnabled,
        homeServiceTerms: data.homeServiceTerms ?? null,
        homeServiceLeadDays: data.homeServiceLeadDays,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating home service settings:', error);
    return { success: false };
  }
}

export async function updateBranchTermsAction(data: {
  tenantId: string;
  branchTermsEnabled: boolean;
  branchTerms?: string;
}) {
  try {
    await db.update(tenants)
      .set({
        branchTermsEnabled: data.branchTermsEnabled,
        branchTerms: data.branchTerms ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating branch terms:', error);
    return { success: false };
  }
}

export async function updateLoyaltySettingsAction(data: {
  tenantId: string;
  loyaltyEnabled: boolean;
  loyaltyWindowMonths: number;
  loyaltyFrequentThreshold: number;
  loyaltyVipCitasThreshold?: number | null;
  loyaltyVipAmountThreshold?: number | null;
}) {
  try {
    await db.update(tenants)
      .set({
        loyaltyEnabled: data.loyaltyEnabled,
        loyaltyWindowMonths: data.loyaltyWindowMonths,
        loyaltyFrequentThreshold: data.loyaltyFrequentThreshold,
        ...(data.loyaltyVipCitasThreshold !== undefined ? { loyaltyVipCitasThreshold: data.loyaltyVipCitasThreshold } : {}),
        ...(data.loyaltyVipAmountThreshold !== undefined ? { loyaltyVipAmountThreshold: data.loyaltyVipAmountThreshold?.toString() ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    return { success: false };
  }
}

export async function updatePointsSettingsAction(data: {
  tenantId: string;
  pointsEnabled: boolean;
  pointsPerDollar: number;
  pointsExpireEnabled: boolean;
  pointsExpireMonths: number;
  pointsRedemptionNote?: string | null;
}) {
  try {
    await db.update(tenants)
      .set({
        pointsEnabled: data.pointsEnabled,
        pointsPerDollar: data.pointsPerDollar,
        pointsExpireEnabled: data.pointsExpireEnabled,
        pointsExpireMonths: data.pointsExpireMonths,
        pointsRedemptionNote: data.pointsRedemptionNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating points settings:', error);
    return { success: false };
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
  showStaffSelection: boolean;
  // Loyalty levels
  loyaltyEnabled?: boolean;
  loyaltyWindowMonths?: number;
  loyaltyFrequentThreshold?: number;
  loyaltyVipCitasThreshold?: number | null;
  loyaltyVipAmountThreshold?: number | null;
  // Points program
  pointsEnabled?: boolean;
  pointsPerDollar?: number;
  pointsExpireEnabled?: boolean;
  pointsExpireMonths?: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  emailBodyTemplate?: string | null;
  emailLocale?: string;
  contactEmail?: string | null;
  bookingSettings?: any;
  timezone?: string;
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
        showStaffSelection: data.showStaffSelection,
        ...(data.loyaltyEnabled !== undefined ? { loyaltyEnabled: data.loyaltyEnabled } : {}),
        ...(data.loyaltyWindowMonths !== undefined ? { loyaltyWindowMonths: data.loyaltyWindowMonths } : {}),
        ...(data.loyaltyFrequentThreshold !== undefined ? { loyaltyFrequentThreshold: data.loyaltyFrequentThreshold } : {}),
        ...(data.loyaltyVipCitasThreshold !== undefined ? { loyaltyVipCitasThreshold: data.loyaltyVipCitasThreshold } : {}),
        ...(data.loyaltyVipAmountThreshold !== undefined ? { loyaltyVipAmountThreshold: data.loyaltyVipAmountThreshold?.toString() ?? null } : {}),
        ...(data.pointsEnabled !== undefined ? { pointsEnabled: data.pointsEnabled } : {}),
        ...(data.pointsPerDollar !== undefined ? { pointsPerDollar: data.pointsPerDollar } : {}),
        ...(data.pointsExpireEnabled !== undefined ? { pointsExpireEnabled: data.pointsExpireEnabled } : {}),
        ...(data.pointsExpireMonths !== undefined ? { pointsExpireMonths: data.pointsExpireMonths } : {}),
        heroTitle: data.heroTitle || null,
        heroSubtitle: data.heroSubtitle || null,
        emailBodyTemplate: data.emailBodyTemplate || null,
        emailLocale: data.emailLocale || 'es',
        contactEmail: data.contactEmail || null,
        bookingSettings: data.bookingSettings,
        timezone: data.timezone || 'America/El_Salvador',
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

export async function updateAppearanceAction(data: {
  tenantId: string;
  name: string;
  primaryColor: string;
  theme: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  contactEmail?: string | null;
  whatsappNumber?: string | null;
  showStaffSelection?: boolean;
  bookingSettings?: any;
}) {
  try {
    const session = await getSession();
    await db.update(tenants)
      .set({
        name: data.name,
        primaryColor: data.primaryColor,
        theme: data.theme,
        coverUrl: data.coverUrl ?? null,
        logoUrl: data.logoUrl ?? null,
        instagramUrl: data.instagramUrl ?? null,
        facebookUrl: data.facebookUrl ?? null,
        tiktokUrl: data.tiktokUrl ?? null,
        heroTitle: data.heroTitle ?? null,
        heroSubtitle: data.heroSubtitle ?? null,
        contactEmail: data.contactEmail ?? null,
        whatsappNumber: data.whatsappNumber ?? null,
        showStaffSelection: data.showStaffSelection ?? true,
        bookingSettings: data.bookingSettings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));

    await logAuditEvent({
      action: 'APPEARANCE_UPDATED',
      userId: session?.userId,
      tenantId: data.tenantId,
      details: { theme: data.theme, primaryColor: data.primaryColor },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating appearance:', error);
    return { success: false, error: 'Failed to update appearance' };
  }
}

export async function updateConfiguracionAction(data: {
  tenantId: string;
  timezone: string;
  emailLocale: string;
  emailBodyTemplate?: string | null;
  waMessageTemplate?: string | null;
}) {
  try {
    const session = await getSession();
    await db.update(tenants)
      .set({
        timezone: data.timezone,
        emailLocale: data.emailLocale,
        emailBodyTemplate: data.emailBodyTemplate ?? null,
        waMessageTemplate: data.waMessageTemplate ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, data.tenantId));

    await logAuditEvent({
      action: 'SETTINGS_UPDATED',
      userId: session?.userId,
      tenantId: data.tenantId,
      details: { timezone: data.timezone, emailLocale: data.emailLocale },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating configuracion:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}
