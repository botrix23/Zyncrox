import React from 'react';
import { db } from '@/db';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq, desc, and, lt } from 'drizzle-orm';
import { bookings as bookingsTable, branches, coverageZones, tenants } from '@/db/schema';
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

  // Si el rol es STAFF, filtrar solo sus citas
  const staffId = session?.role === 'STAFF' ? session.staffId : null;

  const [dbBookings, dbServices, dbStaff, dbBranches, dbZones, tenant] = await Promise.all([
    db.query.bookings.findMany({
      where: staffId
        ? and(eq(bookingsTable.tenantId, tenantId), eq(bookingsTable.staffId, staffId))
        : eq(bookingsTable.tenantId, tenantId),
      with: {
        service: true,
        staff: true,
        branch: true,
        session: true
      },
      orderBy: [desc(bookingsTable.startTime)]
    }),
    db.query.services.findMany({
      where: (srv, { eq }) => eq(srv.tenantId, tenantId),
      with: { branches: true, categories: true },
      orderBy: (srv, { asc }) => [asc(srv.sortOrder)],
    }),
    db.query.staff.findMany({
      where: (s, { eq }) => eq(s.tenantId, tenantId),
      with: { categories: true },
    }),
    db.select().from(branches).where(eq(branches.tenantId, tenantId)),
    db.select().from(coverageZones).where(eq(coverageZones.tenantId, tenantId)),
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    })
  ]);

  const mappedServices = dbServices.map((s: any) => ({
    ...s,
    categoryIds: (s.categories || []).map((c: any) => c.categoryId),
  }));
  const mappedStaff = dbStaff.map((s: any) => ({
    ...s,
    categoryIds: (s.categories || []).map((c: any) => c.categoryId),
  }));

  return (
    <BookingsClient
      initialBookings={dbBookings}
      services={mappedServices}
      staff={mappedStaff}
      branches={dbBranches}
      coverageZones={dbZones}
      tenantId={tenantId}
      tenantSettings={tenant}
    />
  );
}
