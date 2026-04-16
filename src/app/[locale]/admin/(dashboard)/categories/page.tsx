import React from 'react';
import { db } from '@/db';
import { serviceCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const dbCategories = await db.query.serviceCategories.findMany({
    where: eq(serviceCategories.tenantId, tenantId),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return (
    <CategoriesClient
      initialCategories={dbCategories}
      tenantId={tenantId}
    />
  );
}
