'use server';

import { db } from '@/db';
import {
  loyaltyRewards,
  loyaltyPointsTransactions,
  clientLoyalty,
  tenants,
  bookings,
} from '@/db/schema';
import { eq, and, lt, gt, desc, sql } from 'drizzle-orm';
import { getSession, getEffectiveTenantId } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// REWARDS CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getRewardsAction() {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { success: false, rewards: [] };

  const rows = await db.select()
    .from(loyaltyRewards)
    .where(eq(loyaltyRewards.tenantId, tenantId))
    .orderBy(loyaltyRewards.sortOrder, loyaltyRewards.createdAt);

  return { success: true, rewards: rows };
}

export async function createRewardAction(data: {
  name: string;
  description?: string;
  pointsCost: number;
  isActive: boolean;
}) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { success: false, error: 'Unauthorized' };

  // Check max 10 rewards
  const existing = await db.select({ id: loyaltyRewards.id })
    .from(loyaltyRewards)
    .where(eq(loyaltyRewards.tenantId, tenantId));
  if (existing.length >= 10) return { success: false, error: 'Max 10 rewards reached' };

  // Get current max sortOrder
  const maxSort = existing.length;

  await db.insert(loyaltyRewards).values({
    tenantId,
    name: data.name,
    description: data.description || null,
    pointsCost: data.pointsCost,
    isActive: data.isActive,
    sortOrder: maxSort,
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateRewardAction(data: {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  isActive: boolean;
  sortOrder?: number;
}) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { success: false, error: 'Unauthorized' };

  await db.update(loyaltyRewards)
    .set({
      name: data.name,
      description: data.description || null,
      pointsCost: data.pointsCost,
      isActive: data.isActive,
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    })
    .where(and(eq(loyaltyRewards.id, data.id), eq(loyaltyRewards.tenantId, tenantId)));

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function deleteRewardAction(rewardId: string) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { success: false, error: 'Unauthorized' };

  await db.delete(loyaltyRewards)
    .where(and(eq(loyaltyRewards.id, rewardId), eq(loyaltyRewards.tenantId, tenantId)));

  revalidatePath('/', 'layout');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// EARN POINTS (called when booking status → FINALIZADA)
// ─────────────────────────────────────────────────────────────────────────────

export async function earnPointsForBookingAction(bookingId: string) {
  try {
    // Load booking with service
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: { service: true },
    });
    if (!booking || !booking.customerEmail) return;

    // Load tenant config
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, booking.tenantId),
    });
    if (!tenant || !tenant.pointsEnabled || tenant.plan !== 'ENTERPRISE') return;

    const price = parseFloat(booking.service?.price ?? '0') || 0;
    if (price <= 0) return;

    const pointsEarned = Math.floor(price * tenant.pointsPerDollar);
    if (pointsEarned <= 0) return;

    const email = booking.customerEmail.toLowerCase();
    const name = booking.customerName;

    // Upsert client_loyalty row
    const existing = await db.query.clientLoyalty.findFirst({
      where: and(
        eq(clientLoyalty.tenantId, booking.tenantId),
        eq(clientLoyalty.clientEmail, email)
      ),
    });

    if (existing) {
      await db.update(clientLoyalty)
        .set({
          loyaltyPointsBalance: existing.loyaltyPointsBalance + pointsEarned,
          loyaltyPointsLastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clientLoyalty.id, existing.id));
    } else {
      await db.insert(clientLoyalty).values({
        tenantId: booking.tenantId,
        clientEmail: email,
        clientName: name,
        loyaltyPointsBalance: pointsEarned,
        loyaltyPointsLastActivity: new Date(),
      });
    }

    // Log transaction
    await db.insert(loyaltyPointsTransactions).values({
      tenantId: booking.tenantId,
      clientEmail: email,
      clientName: name,
      type: 'EARNED',
      points: pointsEarned,
      bookingId: bookingId,
      description: `Puntos por ${booking.service?.name ?? 'servicio'} — $${price.toFixed(2)}`,
    });
  } catch (err) {
    console.error('[earnPointsForBooking]', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REDEEM REWARD
// ─────────────────────────────────────────────────────────────────────────────

export async function redeemRewardAction(data: {
  clientEmail: string;
  clientName: string;
  rewardId: string;
}) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { success: false, error: 'Unauthorized' };

  const reward = await db.query.loyaltyRewards.findFirst({
    where: and(eq(loyaltyRewards.id, data.rewardId), eq(loyaltyRewards.tenantId, tenantId)),
  });
  if (!reward || !reward.isActive) return { success: false, error: 'Reward not available' };

  const email = data.clientEmail.toLowerCase();

  const loyalty = await db.query.clientLoyalty.findFirst({
    where: and(eq(clientLoyalty.tenantId, tenantId), eq(clientLoyalty.clientEmail, email)),
  });
  if (!loyalty) return { success: false, error: 'Client has no points' };
  if (loyalty.loyaltyPointsBalance < reward.pointsCost)
    return { success: false, error: 'Insufficient points' };

  const newBalance = loyalty.loyaltyPointsBalance - reward.pointsCost;

  await db.update(clientLoyalty)
    .set({ loyaltyPointsBalance: newBalance, updatedAt: new Date() })
    .where(eq(clientLoyalty.id, loyalty.id));

  await db.insert(loyaltyPointsTransactions).values({
    tenantId,
    clientEmail: email,
    clientName: data.clientName,
    type: 'REDEEMED',
    points: -reward.pointsCost,
    rewardId: reward.id,
    description: `Canje: ${reward.name}`,
  });

  revalidatePath('/', 'layout');
  return { success: true, newBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CLIENT POINTS DATA (for client profile modal)
// ─────────────────────────────────────────────────────────────────────────────

export async function getClientPointsAction(clientEmail: string) {
  const session = await getSession();
  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return null;

  const email = clientEmail.toLowerCase();

  const [loyalty, transactions, rewards] = await Promise.all([
    db.query.clientLoyalty.findFirst({
      where: and(eq(clientLoyalty.tenantId, tenantId), eq(clientLoyalty.clientEmail, email)),
    }),
    db.select()
      .from(loyaltyPointsTransactions)
      .where(and(
        eq(loyaltyPointsTransactions.tenantId, tenantId),
        eq(loyaltyPointsTransactions.clientEmail, email)
      ))
      .orderBy(desc(loyaltyPointsTransactions.createdAt))
      .limit(50),
    db.select()
      .from(loyaltyRewards)
      .where(and(eq(loyaltyRewards.tenantId, tenantId), eq(loyaltyRewards.isActive, true)))
      .orderBy(loyaltyRewards.pointsCost),
  ]);

  return {
    balance: loyalty?.loyaltyPointsBalance ?? 0,
    lastActivity: loyalty?.loyaltyPointsLastActivity ?? null,
    transactions,
    rewards,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRE POINTS CRON (called daily by cron job)
// ─────────────────────────────────────────────────────────────────────────────

export async function expirePointsCronAction(authHeader: string) {
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return { success: false, error: 'Unauthorized' };
  }

  const now = new Date();
  let expired = 0;
  let warned = 0;

  // Get all tenants with points expiration enabled
  const tenantsWithPoints = await db.select()
    .from(tenants)
    .where(and(
      eq(tenants.pointsEnabled, true),
      eq(tenants.pointsExpireEnabled, true)
    ));

  for (const tenant of tenantsWithPoints) {
    const expiryMonths = tenant.pointsExpireMonths;
    const expiryThreshold = new Date(now);
    expiryThreshold.setMonth(expiryThreshold.getMonth() - expiryMonths);

    const warnThreshold = new Date(expiryThreshold);
    warnThreshold.setDate(warnThreshold.getDate() + 30); // 30 days before expiry

    // Clients whose points HAVE expired
    const expiredClients = await db.select()
      .from(clientLoyalty)
      .where(and(
        eq(clientLoyalty.tenantId, tenant.id),
        gt(clientLoyalty.loyaltyPointsBalance, 0),
        lt(clientLoyalty.loyaltyPointsLastActivity, expiryThreshold)
      ));

    for (const client of expiredClients) {
      const pts = client.loyaltyPointsBalance;
      await db.update(clientLoyalty)
        .set({ loyaltyPointsBalance: 0, updatedAt: new Date() })
        .where(eq(clientLoyalty.id, client.id));

      await db.insert(loyaltyPointsTransactions).values({
        tenantId: tenant.id,
        clientEmail: client.clientEmail,
        clientName: client.clientName,
        type: 'EXPIRED',
        points: -pts,
        description: 'Puntos expirados por inactividad',
      });
      expired++;
    }

    // Clients whose points will expire in ~30 days — send warning email
    const warnClients = await db.select()
      .from(clientLoyalty)
      .where(and(
        eq(clientLoyalty.tenantId, tenant.id),
        gt(clientLoyalty.loyaltyPointsBalance, 0),
        lt(clientLoyalty.loyaltyPointsLastActivity, warnThreshold),
        gt(clientLoyalty.loyaltyPointsLastActivity, expiryThreshold) // not yet expired
      ));

    for (const client of warnClients) {
      if (!client.clientEmail) continue;
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@zyncrox.com',
          to: client.clientEmail,
          subject: `Tus puntos en ${tenant.name} expiran pronto`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="color:#7c3aed;">¡Tus puntos están por expirar!</h2>
              <p>Hola ${client.clientName},</p>
              <p>Tienes <strong>${client.loyaltyPointsBalance} puntos</strong> acumulados en <strong>${tenant.name}</strong> que expirarán en 30 días por inactividad.</p>
              <p>¡Reserva una cita para conservar tus puntos y seguir acumulando!</p>
              <a href="https://zyncrox.com/${tenant.slug}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Reservar ahora</a>
            </div>
          `,
        });
        warned++;
      } catch (e) {
        console.error('[expirePoints warn email]', client.clientEmail, e);
      }
    }
  }

  return { success: true, expired, warned };
}
