import React from 'react';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getBranchesAction } from '@/app/actions/branches';
import { getStaffAction } from '@/app/actions/staff';
import { checkPlanLimit } from '@/lib/plan-guard';
import { enforceDowngradeLimits } from '@/lib/billing';
import BranchesClient from './BranchesClient';

export default async function BranchesPage() {
  const session = await getSession();

  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const [initialBranchesRaw, staffMembers, planLimit] = await Promise.all([
    getBranchesAction(tenantId),
    getStaffAction(tenantId),
    checkPlanLimit(tenantId, 'branches'),
  ]);

  // Si el tenant tiene más sucursales activas de las que permite su plan,
  // aplicar el límite de inmediato (mantiene las más antiguas, desactiva las más nuevas).
  // No esperamos al cron de billing — el enforce es idempotente y seguro llamarlo aquí.
  const activeBranchCount = initialBranchesRaw.filter((b: any) => b.isActive).length;
  let initialBranches = initialBranchesRaw;
  if (planLimit.limit > 0 && activeBranchCount > planLimit.limit) {
    await enforceDowngradeLimits(tenantId, planLimit.plan);
    // Recargar para reflejar las desactivaciones que acaba de hacer enforce
    initialBranches = await getBranchesAction(tenantId);
  }

  return (
    <BranchesClient
      initialBranches={initialBranches}
      staff={staffMembers}
      tenantId={tenantId}
      planLimit={planLimit.limit}
      plan={planLimit.plan}
    />
  );
}
