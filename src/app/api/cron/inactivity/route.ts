/**
 * Inactivity Cron — runs daily.
 *
 * Finds ACTIVE tenants that have had no bookings in the last 14 days
 * and sends a TENANT_INACTIVE notification to the Super Admin.
 * This helps identify churn risk early.
 *
 * Avoids duplicate notifications by checking if one was already sent
 * in the last 14 days for the same tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, bookings, superAdminNotifications } from '@/db/schema';
import { and, eq, gte, sql, not, exists } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Find ACTIVE tenants with no bookings in the last 14 days
    const activeTenants = await db.query.tenants.findMany({
      where: eq(tenants.status, 'ACTIVE'),
      columns: { id: true, name: true },
    });

    let notified = 0;

    for (const tenant of activeTenants) {
      // Check if they have any recent booking
      const recentBooking = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.tenantId, tenant.id),
          gte(bookings.createdAt, fourteenDaysAgo),
        ),
        columns: { id: true },
      });

      if (recentBooking) continue; // Active — skip

      // Check if we already sent an inactivity notification in the last 14 days
      const recentNotif = await db.query.superAdminNotifications.findFirst({
        where: and(
          eq(superAdminNotifications.tenantId, tenant.id),
          eq(superAdminNotifications.type, 'TENANT_INACTIVE'),
          gte(superAdminNotifications.createdAt, fourteenDaysAgo),
        ),
        columns: { id: true },
      });

      if (recentNotif) continue; // Already notified recently — skip

      await createNotification({
        type: 'TENANT_INACTIVE',
        message: `"${tenant.name}" no ha tenido reservas en los últimos 14 días`,
        link: `/admin/super/tenants`,
        tenantId: tenant.id,
        tenantName: tenant.name,
        urgency: 'MEDIUM',
      });
      notified++;
    }

    await logAuditEvent({
      action: 'CRON_TRIAL_RUN', // reuse closest existing action type
      details: { cron: 'inactivity', notified, checked: activeTenants.length, success: true },
    });

    return NextResponse.json({ ok: true, notified, checked: activeTenants.length });
  } catch (error) {
    console.error('[Inactivity Cron] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
