import React from 'react';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getBranchesAction } from '@/app/actions/branches';
import { getStaffAction } from '@/app/actions/staff';
import BranchesClient from './BranchesClient';

export default async function BranchesPage() {
  const session = await getSession();
  
  const tenantId = getEffectiveTenantId(session);
  
  if (!tenantId) {
    redirect('/admin/login');
  }
  const initialBranches = await getBranchesAction(tenantId);
  const staffMembers = await getStaffAction(tenantId);

  return (
    <BranchesClient 
      initialBranches={initialBranches} 
      staff={staffMembers}
      tenantId={tenantId} 
    />
  );
}
