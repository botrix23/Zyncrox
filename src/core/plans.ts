// src/core/plans.ts

export type PlanType = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlanFeatures {
  // Capacidad
  maxBranches: number;
  maxStaff: number;
  maxServices: number;

  // Reservas y agenda
  multiServiceBooking: boolean;        // Multi-servicio en una sesión
  separateServiceScheduling: boolean;  // Agendamiento separado por servicio

  // Branding y personalización
  customTheme: boolean;                // Tema claro / oscuro
  customHero: boolean;                 // Hero personalizable (título y subtítulo)
  customWidgetSteps: boolean;          // Configuración de pasos del widget
  customEmailTemplate: boolean;        // Template de email personalizado

  // Servicios
  simultaneousServices: boolean;       // Servicio simultáneo / exclusivo
  serviceCategories: boolean;          // Categorías de especialidad
  servicesPerBranch: boolean;          // Asignar servicios por sucursal

  // Staff
  staffAccess: boolean;                // Acceso al sistema con rol STAFF
  staffCategories: boolean;            // Categorías de especialidad por staff
  staffRotations: boolean;             // Rotaciones de staff multi-sucursal

  // Encuestas
  surveys: boolean;                    // Encuestas básicas + envío automático + preguntas personalizadas
  nps: boolean;                        // NPS (Net Promoter Score) — solo Enterprise

  // Dashboard y analítica
  weeklyMonthlyStats: boolean;         // Estadísticas semanales, mensuales y gráficos
  advancedAnalytics: boolean;          // Analítica avanzada — solo Enterprise

  // Soporte
  prioritySupport: boolean;

  // Enterprise exclusivo
  auditLogsAdmin: boolean;             // Audit logs visibles al admin
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  BASIC: {
    maxBranches: 1,
    maxStaff: 1,
    maxServices: 10,

    multiServiceBooking: false,
    separateServiceScheduling: false,

    customTheme: false,
    customHero: false,
    customWidgetSteps: false,
    customEmailTemplate: false,

    simultaneousServices: false,
    serviceCategories: false,
    servicesPerBranch: false,

    staffAccess: false,
    staffCategories: false,
    staffRotations: false,

    surveys: false,
    nps: false,

    weeklyMonthlyStats: false,
    advancedAnalytics: false,

    prioritySupport: false,
    auditLogsAdmin: false,
  },
  PROFESSIONAL: {
    maxBranches: 3,
    maxStaff: 15,
    maxServices: 30,

    multiServiceBooking: true,
    separateServiceScheduling: true,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customEmailTemplate: true,

    simultaneousServices: true,
    serviceCategories: true,
    servicesPerBranch: true,

    staffAccess: true,
    staffCategories: true,
    staffRotations: true,

    surveys: true,
    nps: false,

    weeklyMonthlyStats: true,
    advancedAnalytics: false,

    prioritySupport: true,
    auditLogsAdmin: false,
  },
  ENTERPRISE: {
    maxBranches: 9999,
    maxStaff: 9999,
    maxServices: 9999,

    multiServiceBooking: true,
    separateServiceScheduling: true,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customEmailTemplate: true,

    simultaneousServices: true,
    serviceCategories: true,
    servicesPerBranch: true,

    staffAccess: true,
    staffCategories: true,
    staffRotations: true,

    surveys: true,
    nps: true,

    weeklyMonthlyStats: true,
    advancedAnalytics: true,

    prioritySupport: true,
    auditLogsAdmin: true,
  },
};

export const PLAN_PRICES: Record<PlanType, number> = {
  BASIC: 20,
  PROFESSIONAL: 45,
  ENTERPRISE: 99,
}

export function getPlanPrice(plan: string | null | undefined): number {
  const normalized = plan === 'FREE' ? 'BASIC' : plan === 'PRO' ? 'PROFESSIONAL' : plan
  return PLAN_PRICES[(normalized as PlanType)] ?? PLAN_PRICES.BASIC
}

/** Retorna las características del plan. Backward-compatible con FREE/PRO. */
export function getPlanFeatures(plan?: string | null): PlanFeatures {
  const normalized = plan === 'FREE' ? 'BASIC' : plan === 'PRO' ? 'PROFESSIONAL' : plan;
  const p = (normalized || 'BASIC') as PlanType;
  return PLAN_FEATURES[p] || PLAN_FEATURES.BASIC;
}

/** Verifica si un plan tiene una característica específica habilitada. */
export function canUseFeature(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  const value = features[feature];
  return typeof value === 'boolean' ? value : false;
}

/** Nombre legible del plan. */
export function getPlanDisplayName(plan?: string | null): string {
  const normalized = plan === 'FREE' ? 'BASIC' : plan === 'PRO' ? 'PROFESSIONAL' : plan;
  const names: Record<string, string> = {
    BASIC: 'Basic',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
  };
  return names[normalized || 'BASIC'] || 'Basic';
}
