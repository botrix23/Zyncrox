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

  // Admins adicionales (sin contar al owner)
  maxAdmins: number;                   // 0 = solo owner, -1 = ilimitado

  // Enterprise exclusivo
  auditLogsAdmin: boolean;             // Audit logs visibles al admin
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  BASIC: {
    maxBranches: 1,
    maxStaff: 2,
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

    staffAccess: true,
    staffCategories: false,
    staffRotations: false,

    surveys: false,
    nps: false,

    weeklyMonthlyStats: false,
    advancedAnalytics: false,

    maxAdmins: 0,

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
    customWidgetSteps: false, // Solo Business (ENTERPRISE)
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

    maxAdmins: 3,

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

    maxAdmins: -1,

    prioritySupport: true,
    auditLogsAdmin: true,
  },
};

/** Precios base (fallback si platform_config no tiene valores configurados). */
export const PLAN_PRICES: Record<PlanType, number> = {
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
    BASIC: 'Basic',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Business',
  };
  return names[normalized || 'BASIC'] || 'Basic';
}
