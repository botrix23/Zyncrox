import React from 'react';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getBranchesAction } from '@/app/actions/branches';
import BranchesClient from './BranchesClient';

export default async function BranchesPage() {
  const session = await getSession();
  
  const tenantId = getEffectiveTenantId(session);
  
  if (!tenantId) {
    redirect('/admin/login');
  }
  const initialBranches = await getBranchesAction(tenantId);

  return (
    <BranchesClient 
      initialBranches={initialBranches} 
      tenantId={tenantId} 
    />
  );
}
