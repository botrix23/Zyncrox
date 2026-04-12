import React from 'react';
import { db } from '@/db';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq, desc, and, lt } from 'drizzle-orm';
import { bookings as bookingsTable, services, staff, branches, coverageZones, tenants } from '@/db/schema';
import BookingsClient from './BookingsClient';

export default async function BookingsPage() {
  const session = await getSession();

  // Aislamiento Multi-tenant
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  // 1. Auto-finalizar citas pasadas (SOLO las que están CONFIRMED)
  await db.update(bookingsTable)
    .set({ status: 'FINALIZADA' })
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        eq(bookingsTable.status, 'CONFIRMED'),
        lt(bookingsTable.endTime, new Date())
      )
    );

  const [dbBookings, dbServices, dbStaff, dbBranches, dbZones, tenant] = await Promise.all([
    db.query.bookings.findMany({
      where: eq(bookingsTable.tenantId, tenantId),
      with: {
        service: true,
        staff: true,
        branch: true
      },
      orderBy: [desc(bookingsTable.startTime)]
    }),
    db.select().from(services).where(eq(services.tenantId, tenantId)),
    db.select().from(staff).where(eq(staff.tenantId, tenantId)),
    db.select().from(branches).where(eq(branches.tenantId, tenantId)),
    db.select().from(coverageZones).where(eq(coverageZones.tenantId, tenantId)),
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    })
  ]);

  return (
    <BookingsClient 
      initialBookings={dbBookings}
      services={dbServices}
      staff={dbStaff}
      branches={dbBranches}
      coverageZones={dbZones}
      tenantId={tenantId}
      tenantSettings={tenant}
    />
  );
}
