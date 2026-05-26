import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, clientLoyalty, loyaltyRewards } from '@/db/schema';
import { eq, and, gt, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  const email = searchParams.get('email');

  if (!tenantId || !email) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // Validate tenant has points enabled + ENTERPRISE plan
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { pointsEnabled: true, plan: true, pointsPerDollar: true },
  });

  if (!tenant || !tenant.pointsEnabled || tenant.plan !== 'ENTERPRISE') {
    return NextResponse.json({ pointsEnabled: false });
  }

  // Get client's loyalty record
  const loyalty = await db.query.clientLoyalty.findFirst({
    where: and(
      eq(clientLoyalty.tenantId, tenantId),
      eq(clientLoyalty.clientEmail, email.toLowerCase().trim())
    ),
    columns: { loyaltyPointsBalance: true },
  });

  const balance = loyalty?.loyaltyPointsBalance ?? 0;

  if (balance <= 0) {
    return NextResponse.json({ pointsEnabled: true, balance: 0, nextReward: null });
  }

  // Find the next reward they could earn (cheapest active reward with cost > balance → or cheapest affordable)
  // Logic: show the next reward they CAN'T afford yet (closest above balance)
  // If they can afford some, show cheapest one they can afford first
  const rewards = await db.query.loyaltyRewards.findMany({
    where: and(
      eq(loyaltyRewards.tenantId, tenantId),
      eq(loyaltyRewards.isActive, true)
    ),
    orderBy: [asc(loyaltyRewards.pointsCost)],
    columns: { name: true, pointsCost: true },
  });

  let nextReward: { name: string; pointsCost: number } | null = null;

  // Prioritize: cheapest reward they can't afford yet (motivational)
  const nextUnaffordable = rewards.find(r => r.pointsCost > balance);
  const cheapestAffordable = rewards.find(r => r.pointsCost <= balance);

  if (cheapestAffordable) {
    // They can already redeem something — show that
    nextReward = cheapestAffordable;
  } else if (nextUnaffordable) {
    // Show how far they are from the next reward
    nextReward = nextUnaffordable;
  }

  return NextResponse.json({ pointsEnabled: true, balance, nextReward });
}
