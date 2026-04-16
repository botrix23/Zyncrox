import React from 'react';
import { db } from '@/db';
import { staff as staffTable, branches as branchesTable, serviceCategories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import StaffClient from './StaffClient';

export default async function StaffPage() {
  const session = await getSession();

  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const [dbStaff, dbBranches, dbCategories] = await Promise.all([
    db.query.staff.findMany({
      where: eq(staffTable.tenantId, tenantId),
      with: {
        assignments: true,
        reviews: true,
        categories: { with: { category: true } },
      },
      orderBy: desc(staffTable.createdAt),
    }),
    db.select().from(branchesTable).where(eq(branchesTable.tenantId, tenantId)),
    db.query.serviceCategories.findMany({
      where: eq(serviceCategories.tenantId, tenantId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
  ]);

  return (
    <StaffClient
      initialStaff={dbStaff}
      branches={dbBranches}
      categories={dbCategories}
      tenantId={tenantId}
    />
  );
}
