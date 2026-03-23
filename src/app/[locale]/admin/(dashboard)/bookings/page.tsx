import React from 'react';
import { db } from '@/db';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { bookings as bookingsTable, services, staff } from '@/db/schema';
import BookingsClient from './BookingsClient';

export default async function BookingsPage() {
  const session = await getSession();

  // Aislamiento Multi-tenant
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  const [dbBookings, dbServices, dbStaff] = await Promise.all([
    db.query.bookings.findMany({
      where: eq(bookingsTable.tenantId, tenantId),
      with: {
          service: true,
          staff: true
      },
      orderBy: [desc(bookingsTable.startTime)]
    }),
    db.select().from(services).where(eq(services.tenantId, tenantId)),
    db.select().from(staff).where(eq(staff.tenantId, tenantId))
  ]);

  return (
    <BookingsClient 
      initialBookings={dbBookings}
      services={dbServices}
      staff={dbStaff}
      tenantId={tenantId}
    />
  );
}
