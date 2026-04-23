import React from 'react';
import { db } from '@/db';
import { staff as staffTable, branches as branchesTable, serviceCategories, tenants } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { checkPlanLimit } from '@/lib/plan-guard';
import StaffClient from './StaffClient';

export default async function StaffPage() {
  const session = await getSession();

  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const [dbStaff, dbBranches, dbCategories, planLimit, tenant] = await Promise.all([
    db.query.staff.findMany({
      where: eq(staffTable.tenantId, tenantId),
      with: {
        assignments: true,
        reviews: true,
        categories: { with: { category: true } },
        user: { columns: { id: true, isActive: true } },
      },
      orderBy: desc(staffTable.createdAt),
    }),
    db.select().from(branchesTable).where(eq(branchesTable.tenantId, tenantId)),
    db.query.serviceCategories.findMany({
      where: eq(serviceCategories.tenantId, tenantId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
    checkPlanLimit(tenantId, 'staff'),
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { showStaffSelection: true } }),
  ]);

  return (
    <StaffClient
      initialStaff={dbStaff}
      branches={dbBranches}
      categories={dbCategories}
      tenantId={tenantId}
      planLimit={planLimit.limit}
      plan={planLimit.plan}
      showStaffSelection={tenant?.showStaffSelection ?? true}
    />
  );
}
