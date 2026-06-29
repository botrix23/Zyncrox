// src/core/plans.ts

export type PlanType = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'BASIC_TEST';

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
  customSchedulingModeLabels: boolean; // Títulos y descripciones de modos de agendamiento
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

  // Admins adicionales (sin contar al owner)
  maxAdmins: number;                   // 0 = solo owner, -1 = ilimitado

  // Recepcionistas
  maxReceptionists: number;            // recepcionistas activos permitidos

  // Ciclo de facturación
  billingCycleDays: number;            // días entre cobros (2 para BASIC_TEST, 30 para el resto)

}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  BASIC_TEST: {
    maxBranches: 1,
    maxStaff: 3,
    maxServices: 20,
    maxReceptionists: 1,
    billingCycleDays: 2,

    multiServiceBooking: false,
    separateServiceScheduling: false,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customSchedulingModeLabels: true,
    customEmailTemplate: false,

    simultaneousServices: false,
    serviceCategories: false,
    servicesPerBranch: false,

    staffAccess: true,
    staffCategories: false,
    staffRotations: false,

    surveys: false,
    nps: false,

    weeklyMonthlyStats: false,
    advancedAnalytics: false,

    maxAdmins: 0,

    prioritySupport: false,
  },
  BASIC: {
    maxBranches: 1,
    maxStaff: 3,
    maxServices: 20,
    maxReceptionists: 1,
    billingCycleDays: 30,

    multiServiceBooking: false,
    separateServiceScheduling: false,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customSchedulingModeLabels: true,
    customEmailTemplate: false,

    simultaneousServices: false,
    serviceCategories: false,
    servicesPerBranch: false,

    staffAccess: true,
    staffCategories: false,
    staffRotations: false,

    surveys: false,
    nps: false,

    weeklyMonthlyStats: false,
    advancedAnalytics: false,

    maxAdmins: 0,

    prioritySupport: false,
  },
  PROFESSIONAL: {
    maxBranches: 2,
    maxStaff: 10,
    maxServices: 50,
    maxReceptionists: 2,
    billingCycleDays: 30,

    multiServiceBooking: true,
    separateServiceScheduling: true,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customSchedulingModeLabels: true,
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

    maxAdmins: 2,

    prioritySupport: true,
  },
  ENTERPRISE: {
    maxBranches: 9999,
    maxStaff: 9999,
    maxServices: 9999,
    maxReceptionists: 9999,
    billingCycleDays: 30,

    multiServiceBooking: true,
    separateServiceScheduling: true,

    customTheme: true,
    customHero: true,
    customWidgetSteps: true,
    customSchedulingModeLabels: true,
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

    maxAdmins: -1,

    prioritySupport: true,
  },
};

/** Precios base (fallback si platform_config no tiene valores configurados). */
export const PLAN_PRICES: Record<PlanType, number> = {
  BASIC_TEST: 1,
  BASIC: 25,
  PROFESSIONAL: 59,
  ENTERPRISE: 99,
}

/**
 * Retorna el precio del plan usando precios dinámicos si se proveen,
 * o los valores base de PLAN_PRICES como fallback.
 *
 * @param plan   - nombre del plan
 * @param prices - precios dinámicos leídos desde platform_config (opcional)
 */
export function getPlanPrice(
  plan: string | null | undefined,
  prices?: Partial<Record<PlanType, number>>
): number {
  const normalized = plan === 'FREE' ? 'BASIC' : plan === 'PRO' ? 'PROFESSIONAL' : plan
  const key = (normalized || 'BASIC') as PlanType
  return prices?.[key] ?? PLAN_PRICES[key] ?? PLAN_PRICES.BASIC
}

/**
 * Convierte los campos de platform_config en un mapa de precios.
 * Úsalo en server components / actions donde ya tienes el config de la BD.
 */
export function parsePlanPrices(cfg: {
  planPriceBasic?: string | null
  planPriceProfessional?: string | null
  planPriceEnterprise?: string | null
} | null | undefined): Record<PlanType, number> {
  return {
    BASIC_TEST:   PLAN_PRICES.BASIC_TEST,
    BASIC:        parseFloat(cfg?.planPriceBasic        ?? '') || PLAN_PRICES.BASIC,
    PROFESSIONAL: parseFloat(cfg?.planPriceProfessional ?? '') || PLAN_PRICES.PROFESSIONAL,
    ENTERPRISE:   parseFloat(cfg?.planPriceEnterprise   ?? '') || PLAN_PRICES.ENTERPRISE,
  }
}

/**
 * Convierte los campos de platform_config en un mapa de plan IDs de N1co
 * y el location code del negocio.
 * Cada plan en N1co tiene un precio fijo; cambiar precio = crear nuevo plan en N1co.
 */
export function parsePlanIds(cfg: {
  n1coPlanIdBasic?: string | null
  n1coPlanIdProfessional?: string | null
  n1coPlanIdEnterprise?: string | null
  n1coLocationCode?: string | null
} | null | undefined): {
  ids: Record<PlanType, string>
  locationCode: string
} {
  return {
    ids: {
      BASIC_TEST:   '',
      BASIC:        cfg?.n1coPlanIdBasic        ?? '',
      PROFESSIONAL: cfg?.n1coPlanIdProfessional ?? '',
      ENTERPRISE:   cfg?.n1coPlanIdEnterprise   ?? '',
    },
    locationCode: cfg?.n1coLocationCode ?? '',
  }
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
    BASIC_TEST: 'Básico Test',
    BASIC: 'Inicial',
    PROFESSIONAL: 'Profesional',
    ENTERPRISE: 'Negocio',
  };
  return names[normalized || 'BASIC'] || 'Inicial';
}
