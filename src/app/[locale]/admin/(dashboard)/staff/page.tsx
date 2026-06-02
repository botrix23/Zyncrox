import React from 'react';
import { db } from '@/db';
import { staff as staffTable, branches as branchesTable, serviceCategories, tenants, blocks, absenceRequests } from '@/db/schema';
import { eq, desc, and, ne } from 'drizzle-orm';
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

  const isStaffRole = session?.role === 'STAFF';
  const currentStaffId = session?.staffId ?? undefined;

  const [dbStaff, dbBranches, dbCategories, planLimit, tenant, initialBlocks, pendingRequests] = await Promise.all([
    db.query.staff.findMany({
      where: eq(staffTable.tenantId, tenantId),
      with: {
        assignments: true,
        reviews: true,
        categories: { with: { category: true } },
        user: { columns: { id: true, isActive: true, mustChangePassword: true } },
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
    // Absence blocks
    isStaffRole && currentStaffId
      ? db.select().from(absenceRequests).where(
          and(eq(absenceRequests.tenantId, tenantId), eq(absenceRequests.staffId, currentStaffId))
        ).orderBy(desc(absenceRequests.startTime))
      : db.select().from(blocks).where(
          and(eq(blocks.tenantId, tenantId), ne(blocks.status, 'CANCELLED'))
        ).orderBy(desc(blocks.startTime)),
    // Pending absence requests (admin only)
    isStaffRole
      ? Promise.resolve([])
      : db.select().from(absenceRequests).where(
          and(eq(absenceRequests.tenantId, tenantId), eq(absenceRequests.status, 'PENDING'))
        ).orderBy(desc(absenceRequests.createdAt)),
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
      role={session?.role ?? 'ADMIN'}
      currentStaffId={currentStaffId}
      initialBlocks={initialBlocks}
      pendingRequests={pendingRequests}
    />
  );
}
