"use server"

import { db } from '@/db'
import { subscriptionPlans } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-session'

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function getSubscriptionPlansAction() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return []

  return db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder))
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createSubscriptionPlanAction(data: {
  slug: string
  name: string
  description?: string
  highlights?: string
  nameEn?: string
  descriptionEn?: string
  highlightsEn?: string
  price: number
  billingCycleDays: number
  n1coLink?: string
  isActive: boolean
  isTest: boolean
  sortOrder: number
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return { success: false, error: 'Unauthorized' }

  try {
    await db.insert(subscriptionPlans).values({
      slug:             data.slug.toUpperCase().replace(/\s+/g, '_'),
      name:             data.name,
      description:      data.description || null,
      highlights:       data.highlights || null,
      nameEn:           data.nameEn || null,
      descriptionEn:    data.descriptionEn || null,
      highlightsEn:     data.highlightsEn || null,
      price:            String(data.price),
      billingCycleDays: data.billingCycleDays,
      n1coLink:         data.n1coLink || null,
      isActive:         data.isActive,
      isTest:           data.isTest,
      sortOrder:        data.sortOrder,
    })
    revalidatePath('/[locale]/admin/super/plans', 'page')
    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err: any) {
    if (err?.code === '23505') return { success: false, error: 'Ya existe un plan con ese slug' }
    console.error('createSubscriptionPlan error:', err)
    return { success: false, error: 'Error al crear el plan' }
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateSubscriptionPlanAction(
  id: string,
  data: Partial<{
    name: string
    description: string
    highlights: string
    nameEn: string
    descriptionEn: string
    highlightsEn: string
    price: number
    billingCycleDays: number
    n1coLink: string
    isActive: boolean
    isTest: boolean
    sortOrder: number
  }>
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return { success: false, error: 'Unauthorized' }

  try {
    const now = new Date()
    await db.update(subscriptionPlans)
      .set({
        ...( data.name             !== undefined && { name: data.name }),
        ...( data.description      !== undefined && { description: data.description || null }),
        ...( data.highlights       !== undefined && { highlights: data.highlights || null }),
        ...( data.nameEn           !== undefined && { nameEn: data.nameEn || null }),
        ...( data.descriptionEn    !== undefined && { descriptionEn: data.descriptionEn || null }),
        ...( data.highlightsEn     !== undefined && { highlightsEn: data.highlightsEn || null }),
        ...( data.price            !== undefined && { price: String(data.price) }),
        ...( data.billingCycleDays !== undefined && { billingCycleDays: data.billingCycleDays }),
        ...( data.n1coLink         !== undefined && { n1coLink: data.n1coLink || null }),
        ...( data.isActive         !== undefined && { isActive: data.isActive }),
        ...( data.isTest           !== undefined && { isTest: data.isTest }),
        ...( data.sortOrder        !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: now,
      })
      .where(eq(subscriptionPlans.id, id))

    revalidatePath('/[locale]/admin/super/plans', 'page')
    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('updateSubscriptionPlan error:', err)
    return { success: false, error: 'Error al actualizar el plan' }
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteSubscriptionPlanAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return { success: false, error: 'Unauthorized' }

  try {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id))
    revalidatePath('/[locale]/admin/super/plans', 'page')
    revalidatePath('/[locale]/admin/billing', 'page')
    return { success: true }
  } catch (err) {
    console.error('deleteSubscriptionPlan error:', err)
    return { success: false, error: 'Error al eliminar el plan' }
  }
}
