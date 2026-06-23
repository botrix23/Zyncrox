import React from 'react';
import { db } from '@/db';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq, desc, and, lt, not, inArray } from 'drizzle-orm';
import { bookings as bookingsTable, branches, coverageZones, tenants, clientLoyalty } from '@/db/schema';
import BookingsClient from './BookingsClient';
import { sendPendingSurveyEmailsAction } from '@/app/actions/booking';


export default async function BookingsPage() {
  const session = await getSession();

  // Aislamiento Multi-tenant
  const tenantId = getEffectiveTenantId(session);

  if (!tenantId) {
    redirect('/admin/login');
  }

  // 1. Auto-finalizar citas pasadas (CONFIRMED y PENDING, excluyendo CANCELLED y ya FINALIZADA)
  await db.update(bookingsTable)
    .set({ status: 'FINALIZADA' })
    .where(
      and(
        eq(bookingsTable.tenantId, tenantId),
        not(eq(bookingsTable.status, 'CANCELLED')),
        not(eq(bookingsTable.status, 'FINALIZADA')),
        lt(bookingsTable.endTime, new Date())
      )
    );

  // 2. Enviar emails de encuesta pendientes (fire-and-forget, no bloquea la carga)
  sendPendingSurveyEmailsAction(tenantId).catch(console.error);

  // Si el rol es STAFF, filtrar solo sus citas
  const staffId = session?.role === 'STAFF' ? session.staffId : null;

  // Scoping por sucursal para admins no-owner con sucursales asignadas
  const isOwnerAdmin = session?.isOwner || session?.role === 'SUPER_ADMIN';
  const assignedBranchIds = session?.assignedBranchIds ?? [];
  const hasBranchScope = !isOwnerAdmin && assignedBranchIds.length > 0;

  const [dbBookings, dbServices, dbStaff, dbBranches, dbZones, tenant, loyaltyRows] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        staffId ? eq(bookingsTable.staffId, staffId) : undefined,
        hasBranchScope ? inArray(bookingsTable.branchId, assignedBranchIds) : undefined,
        eq(bookingsTable.tenantId, tenantId),
      ),
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
      where: (s, { eq, and }) => and(eq(s.tenantId, tenantId), eq(s.isActive, true), eq(s.isReceptionist, false)),
      with: {
        categories: true,
        assignments: { columns: { branchId: true, isPermanent: true } },
        user: { columns: { role: true } },
      },
    }),
    db.select().from(branches).where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true))),
    db.select().from(coverageZones).where(and(eq(coverageZones.tenantId, tenantId), eq(coverageZones.isActive, true))),
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    }),
    db.select().from(clientLoyalty).where(eq(clientLoyalty.tenantId, tenantId)),
  ]);

  const mappedServices = dbServices.map((s: any) => ({
    ...s,
    categoryIds: (s.categories || []).map((c: any) => c.categoryId),
  }));
  const mappedStaff = dbStaff
    .filter((s: any) => s.user?.role !== 'RECEPTIONIST')
    .map((s: any) => ({
      ...s,
      categoryIds: (s.categories || []).map((c: any) => c.categoryId),
    }));

  console.log(`[BookingsPage] tenantId=${tenantId} totalBookings=${dbBookings.length} latestStart=${dbBookings[0]?.startTime?.toISOString() ?? 'none'}`);

  // DIAGNOSTIC: show last 10 bookings across ALL tenants to detect cross-tenant booking issues
  try {
    const allRecentBookings = await db.select({
      id: bookingsTable.id,
      tenantId: bookingsTable.tenantId,
      startTime: bookingsTable.startTime,
      customerEmail: bookingsTable.customerEmail,
      status: bookingsTable.status,
    }).from(bookingsTable)
    .orderBy(desc(bookingsTable.startTime))
    .limit(10);
    console.log(`[BookingsPage-XTenant] last10=${JSON.stringify(allRecentBookings.map(b => ({
      id: b.id?.slice(0,8),
      tid: b.tenantId?.slice(0,8),
      start: b.startTime?.toISOString(),
      email: b.customerEmail,
      status: b.status
    })))}`);
  } catch (diagErr) {
    console.error('[BookingsPage-XTenant] diagnostic failed:', diagErr);
  }

  // Build a quick-lookup map: email → loyaltyTier
  const loyaltyMap: Record<string, string> = {};
  for (const row of loyaltyRows) {
    loyaltyMap[row.clientEmail] = row.loyaltyTier;
  }

  return (
    <BookingsClient
      initialBookings={dbBookings}
      services={mappedServices}
      staff={mappedStaff}
      branches={dbBranches}
      coverageZones={dbZones}
      tenantId={tenantId}
      tenantSettings={tenant}
      loyaltyMap={loyaltyMap}
      userRole={session?.role ?? 'ADMIN'}
      isOwner={isOwnerAdmin}
      assignedBranchIds={assignedBranchIds}
    />
  );
}
