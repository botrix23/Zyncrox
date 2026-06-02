import React from 'react';
import { db } from '@/db';
import { serviceCategories, tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getPlanFeatures } from '@/core/plans';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const [dbCategories, tenant] = await Promise.all([
    db.query.serviceCategories.findMany({
      where: eq(serviceCategories.tenantId, tenantId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { plan: true } }),
  ]);

  const canUseCategories = getPlanFeatures(tenant?.plan ?? 'BASIC').staffCategories;

  return (
    <CategoriesClient
      initialCategories={dbCategories}
      tenantId={tenantId}
      canUseCategories={canUseCategories}
    />
  );
}
