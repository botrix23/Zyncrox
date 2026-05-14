"use server"

import { db } from '@/db'
import { subscriptions, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-session'
import { tokenizeCard, chargeWithToken, N1coCardData } from '@/lib/n1co'
import { getPlanPrice } from '@/core/plans'
import { enforceDowngradeLimits } from '@/lib/billing'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const PLAN_ORDER: Record<string, number> = { BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

function isDowngrade(currentPlan: string, newPlan: string): boolean {
  return (PLAN_ORDER[newPlan] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0)
}

export async function getSubscriptionAction(tenantId: string) {
  const session = await getSession()
  if (!session) return null

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenantId),
  })
  return sub ?? null
}

export async function activateSubscriptionAction(
  tenantId: string,
  plan: string,
  cardData: N1coCardData
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tokenResult = await tokenizeCard(cardData)
    const amount = getPlanPrice(plan)
    const chargeResult = await chargeWithToken(tokenResult.token, amount, `Suscripción ${plan}`)

    if (!chargeResult.success) {
      return { success: false, error: chargeResult.errorMessage ?? 'Pago rechazado' }
    }

    const now = new Date()
    const periodEnd = addDays(now, 30)

    await db.insert(subscriptions).values({
      tenantId,
      plan,
      status: 'ACTIVE',
      cardToken: tokenResult.token,
      cardLast4: tokenResult.last4,
      cardBrand: tokenResult.brand,
      cardExpMonth: tokenResult.expMonth,
      cardExpYear: tokenResult.expYear,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentAt: now,
      lastPaymentAmount: String(amount),
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        plan,
        status: 'ACTIVE',
        cardToken: tokenResult.token,
        cardLast4: tokenResult.last4,
        cardBrand: tokenResult.brand,
        cardExpMonth: tokenResult.expMonth,
        cardExpYear: tokenResult.expYear,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        gracePeriodEndsAt: null,
        lastPaymentAt: now,
        lastPaymentAmount: String(amount),
        updatedAt: now,
      },
    })

    await db.update(tenants)
      .set({ plan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('activateSubscription error:', err)
    return { success: false, error: 'Error al procesar el pago' }
  }
}

export async function changePlanAction(tenantId: string, newPlan: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    })

    if (!sub || !sub.cardToken) {
      return { success: false, error: 'No hay método de pago registrado' }
    }

    const amount = getPlanPrice(newPlan)
    const chargeResult = await chargeWithToken(sub.cardToken, amount, `Cambio a plan ${newPlan}`)

    if (!chargeResult.success) {
      return { success: false, error: chargeResult.errorMessage ?? 'Pago rechazado' }
    }

    const now = new Date()
    const periodEnd = addDays(now, 30)

    await db.update(subscriptions)
      .set({
        plan: newPlan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        gracePeriodEndsAt: null,
        lastPaymentAt: now,
        lastPaymentAmount: String(amount),
        updatedAt: now,
      })
      .where(eq(subscriptions.tenantId, tenantId))

    await db.update(tenants)
      .set({ plan: newPlan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    const currentPlan = sub.plan
    if (isDowngrade(currentPlan, newPlan)) {
      if (newPlan === 'BASIC') {
        await db.update(tenants)
          .set({
            heroSubtitle: null,
            theme: 'light',
            emailBodyTemplate: null,
            updatedAt: now,
          })
          .where(eq(tenants.id, tenantId))
      }
      await enforceDowngradeLimits(tenantId, newPlan)
    }

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('changePlan error:', err)
    return { success: false, error: 'Error al cambiar el plan' }
  }
}

export async function cancelSubscriptionAction(tenantId: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const now = new Date()

    await db.update(subscriptions)
      .set({
        status: 'CANCELLED',
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptions.tenantId, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('cancelSubscription error:', err)
    return { success: false, error: 'Error al cancelar la suscripción' }
  }
}

export async function updateCardAction(tenantId: string, cardData: N1coCardData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tokenResult = await tokenizeCard(cardData)
    const now = new Date()

    await db.update(subscriptions)
      .set({
        cardToken: tokenResult.token,
        cardLast4: tokenResult.last4,
        cardBrand: tokenResult.brand,
        cardExpMonth: tokenResult.expMonth,
        cardExpYear: tokenResult.expYear,
        updatedAt: now,
      })
      .where(eq(subscriptions.tenantId, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('updateCard error:', err)
    return { success: false, error: 'Error al actualizar la tarjeta' }
  }
}

export async function reactivateSubscriptionAction(
  tenantId: string,
  newPlan: string,
  cardData?: N1coCardData
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    })

    let token = sub?.cardToken
    let last4 = sub?.cardLast4
    let brand = sub?.cardBrand
    let expMonth = sub?.cardExpMonth
    let expYear = sub?.cardExpYear

    if (cardData) {
      const tokenResult = await tokenizeCard(cardData)
      token = tokenResult.token
      last4 = tokenResult.last4
      brand = tokenResult.brand
      expMonth = tokenResult.expMonth
      expYear = tokenResult.expYear
    }

    if (!token) {
      return { success: false, error: 'Se requiere método de pago' }
    }

    const amount = getPlanPrice(newPlan)
    const chargeResult = await chargeWithToken(token, amount, `Reactivación plan ${newPlan}`)

    if (!chargeResult.success) {
      return { success: false, error: chargeResult.errorMessage ?? 'Pago rechazado' }
    }

    const now = new Date()
    const periodEnd = addDays(now, 30)

    await db.insert(subscriptions).values({
      tenantId,
      plan: newPlan,
      status: 'ACTIVE',
      cardToken: token,
      cardLast4: last4 ?? undefined,
      cardBrand: brand ?? undefined,
      cardExpMonth: expMonth ?? undefined,
      cardExpYear: expYear ?? undefined,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentAt: now,
      lastPaymentAmount: String(amount),
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        plan: newPlan,
        status: 'ACTIVE',
        cardToken: token,
        cardLast4: last4,
        cardBrand: brand,
        cardExpMonth: expMonth,
        cardExpYear: expYear,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        gracePeriodEndsAt: null,
        lastPaymentAt: now,
        lastPaymentAmount: String(amount),
        updatedAt: now,
      },
    })

    await db.update(tenants)
      .set({ plan: newPlan, status: 'ACTIVE', updatedAt: now })
      .where(eq(tenants.id, tenantId))

    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('reactivateSubscription error:', err)
    return { success: false, error: 'Error al reactivar la suscripción' }
  }
}
