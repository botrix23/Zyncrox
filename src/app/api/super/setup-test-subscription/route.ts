/**
 * ENDPOINT TEMPORAL — Solo para setup de datos de prueba.
 * Llamar una vez y luego eliminar el archivo.
 * GET /api/super/setup-test-subscription?secret=CRON_SECRET&tenantName=RelaxTime
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, subscriptions } from '@/db/schema';
import { eq, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantName = req.nextUrl.searchParams.get('tenantName') ?? 'RelaxTime';

  // Find tenant by name
  const tenant = await db.query.tenants.findFirst({
    where: ilike(tenants.name, `%${tenantName}%`),
  });

  if (!tenant) {
    return NextResponse.json({ error: `Tenant '${tenantName}' not found` }, { status: 404 });
  }

  const activatedAt = new Date('2025-05-15T12:00:00Z');
  const periodEnd   = new Date('2025-06-15T12:00:00Z');

  // Update tenant to ACTIVE + PROFESSIONAL
  await db.update(tenants)
    .set({ plan: 'PROFESSIONAL', status: 'ACTIVE', updatedAt: new Date() })
    .where(eq(tenants.id, tenant.id));

  // Upsert subscription
  await db.insert(subscriptions).values({
    tenantId:           tenant.id,
    plan:               'PROFESSIONAL',
    status:             'ACTIVE',
    cardLast4:          '4242',
    cardBrand:          'Visa',
    cardExpMonth:       '12',
    cardExpYear:        '27',
    n1coSubscriptionId: 'test-sub-relaxtime',
    n1coPaymentMethodId:'test-pm-relaxtime',
    currentPeriodStart: activatedAt,
    currentPeriodEnd:   periodEnd,
    lastPaymentAt:      activatedAt,
    lastPaymentAmount:  '59',
  }).onConflictDoUpdate({
    target: subscriptions.tenantId,
    set: {
      plan:               'PROFESSIONAL',
      status:             'ACTIVE',
      cardLast4:          '4242',
      cardBrand:          'Visa',
      cardExpMonth:       '12',
      cardExpYear:        '27',
      n1coSubscriptionId: 'test-sub-relaxtime',
      n1coPaymentMethodId:'test-pm-relaxtime',
      currentPeriodStart: activatedAt,
      currentPeriodEnd:   periodEnd,
      cancelledAt:        null,
      gracePeriodEndsAt:  null,
      lastPaymentAt:      activatedAt,
      lastPaymentAmount:  '59',
      updatedAt:          new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    tenantName: tenant.name,
    plan: 'PROFESSIONAL',
    status: 'ACTIVE',
    currentPeriodStart: activatedAt.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    message: '✅ Subscription set up for testing. Delete this endpoint after use.',
  });
}
