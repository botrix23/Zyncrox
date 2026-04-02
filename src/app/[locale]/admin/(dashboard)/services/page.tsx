import React from 'react';
import { db } from '@/db';
import { services as servicesTable, branches as branchesTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const session = await getSession();
  
  const tenantId = getEffectiveTenantId(session);
  
  if (!tenantId) {
    redirect('/admin/login');
  }
  const sessionTenantId = tenantId as string;

  // Obtener servicios reales de la base de datos con sus relaciones a sucursales
  const dbServices = await db.query.services.findMany({
    where: eq(servicesTable.tenantId, sessionTenantId),
    with: {
      branches: true
    },
    orderBy: desc(servicesTable.createdAt)
  });

  // Obtener sucursales para el modal
  const dbBranches = await db.select()
    .from(branchesTable)
    .where(eq(branchesTable.tenantId, sessionTenantId));

  return (
    <ServicesClient 
      initialServices={dbServices} 
      branches={dbBranches || []}
      tenantId={sessionTenantId} 
    />
  );
}
