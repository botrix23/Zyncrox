import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, clientLoyalty, loyaltyRewards } from '@/db/schema';
import { eq, and, gt, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory rate limiter: max 15 lookups per IP per minute.
// Prevents bulk email enumeration without adding DB overhead to every widget load.
const ipWindow = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipWindow.get(ip);
  if (!entry || now > entry.resetAt) {
    ipWindow.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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

  // Always fetch all active rewards so the widget can show the full catalog
  const rewards = await db.query.loyaltyRewards.findMany({
    where: and(
      eq(loyaltyRewards.tenantId, tenantId),
      eq(loyaltyRewards.isActive, true)
    ),
    orderBy: [asc(loyaltyRewards.pointsCost)],
    columns: { name: true, description: true, pointsCost: true },
  });

  if (balance <= 0) {
    return NextResponse.json({ pointsEnabled: true, balance: 0, nextReward: null, rewards });
  }

  let nextReward: { name: string; pointsCost: number } | null = null;
  const nextUnaffordable = rewards.find(r => r.pointsCost > balance);
  const cheapestAffordable = rewards.find(r => r.pointsCost <= balance);
  if (cheapestAffordable) {
    nextReward = cheapestAffordable;
  } else if (nextUnaffordable) {
    nextReward = nextUnaffordable;
  }

  return NextResponse.json({ pointsEnabled: true, balance, nextReward, rewards });
}
