// src/core/plans.ts

export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PlanFeatures {
  maxBranches: number;
  maxStaff: number;
  maxServices: number;
  multiServiceBooking: boolean;   // Reserva de más de 1 servicio a la vez
  separateServiceScheduling: boolean; // Agendar servicios en días/horas distintos
  homeService: boolean;
  customBranding: boolean;
  analyticsAdvanced: boolean;
  staffRotations: boolean;
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  FREE: {
    maxBranches: 1,
    maxStaff: 3,
    maxServices: 5,
    multiServiceBooking: false,
    separateServiceScheduling: false,
    homeService: false,
    customBranding: false,
    analyticsAdvanced: false,
    staffRotations: false,
    prioritySupport: false,
  },
  PRO: {
    maxBranches: 3,
    maxStaff: 15,
    maxServices: 30,
    multiServiceBooking: true,
    separateServiceScheduling: true,
    homeService: true,
    customBranding: true,
    analyticsAdvanced: false,
    staffRotations: true,
    prioritySupport: true,
  },
  ENTERPRISE: {
    maxBranches: 999,
    maxStaff: 999,
    maxServices: 999,
    multiServiceBooking: true,
    separateServiceScheduling: true,
    homeService: true,
    customBranding: true,
    analyticsAdvanced: true,
    staffRotations: true,
    prioritySupport: true,
  },
};

/**
 * Retorna las características del plan especificado.
 * Si el plan no existe, retorna el plan FREE por defecto.
 */
export function getPlanFeatures(plan?: string | null): PlanFeatures {
  const p = (plan || 'FREE') as PlanType;
  return PLAN_FEATURES[p] || PLAN_FEATURES.FREE;
}

/**
 * Verifica si un plan tiene una característica específica habilitada.
 */
export function canUseFeature(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  const value = features[feature];
  return typeof value === 'boolean' ? value : false;
}
