import React from 'react';
import { db } from '@/db';
import { services as servicesTable, branches as branchesTable, serviceCategories, tenants, coverageZones } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { checkPlanLimit } from '@/lib/plan-guard';
import { enforceDowngradeLimits } from '@/lib/billing';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const session = await getSession();

  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }
  const sessionTenantId = tenantId as string;

  const [dbServicesRaw, dbBranches, dbCategories, tenant, planLimit, dbZones] = await Promise.all([
    db.query.services.findMany({
      where: eq(servicesTable.tenantId, sessionTenantId),
      with: { branches: true, categories: { with: { category: true } } },
      orderBy: [asc(servicesTable.createdAt)]
    }),
    db.select().from(branchesTable).where(eq(branchesTable.tenantId, sessionTenantId)),
    db.query.serviceCategories.findMany({
      where: eq(serviceCategories.tenantId, sessionTenantId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
    db.query.tenants.findFirst({ where: eq(tenants.id, sessionTenantId) }),
    checkPlanLimit(sessionTenantId, 'services'),
    db.select().from(coverageZones).where(eq(coverageZones.tenantId, sessionTenantId)),
  ]);

  // Aplicar límites de plan antes de renderizar
  const activeServiceCount = dbServicesRaw.filter((s: any) => s.isActive).length;
  let dbServices = dbServicesRaw;
  if (planLimit.limit > 0 && activeServiceCount > planLimit.limit) {
    await enforceDowngradeLimits(tenantId, planLimit.plan);
    dbServices = await db.query.services.findMany({
      where: eq(servicesTable.tenantId, sessionTenantId),
      with: { branches: true, categories: { with: { category: true } } },
      orderBy: [asc(servicesTable.createdAt)]
    });
  }

  return (
    <ServicesClient
      initialServices={dbServices}
      branches={dbBranches || []}
      categories={dbCategories}
      tenantId={sessionTenantId}
      initialTravelTime={(tenant as any)?.homeServiceTravelTime ?? 0}
      planLimit={planLimit.limit}
      plan={planLimit.plan}
      allowsHomeService={tenant?.allowsHomeService ?? true}
      homeServiceTermsEnabled={tenant?.homeServiceTermsEnabled ?? false}
      homeServiceTerms={tenant?.homeServiceTerms ?? ''}
      homeServiceLeadDays={tenant?.homeServiceLeadDays ?? 0}
      initialZones={dbZones}
      branchTermsEnabled={tenant?.branchTermsEnabled ?? false}
      branchTerms={tenant?.branchTerms ?? ''}
    />
  );
}
