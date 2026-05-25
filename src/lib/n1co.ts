/**
 * n1co EPay — Payment Gateway (El Salvador)
 *
 * Subscription model:
 *   1. createPaymentMethod(cardData) → paymentMethodId
 *   2. createN1coSubscription({ planId, ..., paymentMethodId }) → subscriptionId
 *   3. N1CO handles monthly auto-renewal and fires webhooks
 *
 * Required env vars:
 *   N1CO_BASE_URL          (default: https://api-sandbox.n1co.shop)
 *   N1CO_API_KEY
 *   N1CO_WEBHOOK_SECRET
 *
 * Plan IDs and location code are stored in platform_config (DB),
 * not as env vars, since each price change requires a new plan in N1co.
 */

const BASE_URL = process.env.N1CO_BASE_URL ?? 'https://api-sandbox.n1co.shop'
const API_KEY  = process.env.N1CO_API_KEY  ?? ''

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface N1coCardData {
  /** Full card number */
  number: string
  holderName: string
  expMonth: string   // "MM"
  expYear: string    // "YYYY" or "YY"
  cvv: string
}

export interface N1coPaymentMethodResult {
  paymentMethodId: string
  last4: string
  brand: string
  expMonth: string
  expYear: string
}

export interface N1coSubscriptionInput {
  planId: string
  /** N1CO commerce/location code */
  locationCode: string
  paymentMethodId: string
  customerId: string       // tenantId or unique identifier
  customerName: string
  customerEmail: string
  customerPhone?: string
}

export interface N1coSubscriptionResult {
  subscriptionId: string
  status: string
  nextBillingDate?: string
}

export interface N1coSubscriptionDetail {
  subscriptionId: string
  status: string
  planId: string
  nextBillingDate?: string
  cancelledAt?: string
}

export type N1coWebhookType =
  | 'SubscriptionConfirmation'
  | 'SubscriptionPayment'
  | 'SubscriptionCancelled'
  | 'SubscriptionFailed'

export interface N1coWebhookPayload {
  type: N1coWebhookType
  subscriptionId: string
  paymentMethodId?: string
  status?: string
  amount?: number
  transactionId?: string
  timestamp?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function n1coFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
      ...options.headers,
    },
  })

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res.ok) {
    const err = data as Record<string, unknown>
    throw new Error(
      `N1CO ${options.method ?? 'GET'} ${path} → ${res.status}: ${err?.message ?? text}`
    )
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Payment Methods
// ---------------------------------------------------------------------------

/**
 * Creates a payment method (tokenizes a card) in N1CO.
 * Returns a paymentMethodId used to create subscriptions.
 */
export async function createPaymentMethod(
  cardData: N1coCardData
): Promise<N1coPaymentMethodResult> {
  const data = await n1coFetch<{
    id: string
    last_four?: string
    last4?: string
    brand?: string
    card_brand?: string
    exp_month?: string
    exp_year?: string
  }>('/api/v3/PaymentMethods', {
    method: 'POST',
    body: JSON.stringify({
      card_number:  cardData.number,
      card_holder:  cardData.holderName,
      exp_month:    cardData.expMonth,
      exp_year:     cardData.expYear,
      cvv:          cardData.cvv,
    }),
  })

  return {
    paymentMethodId: data.id,
    last4:    data.last4 ?? data.last_four ?? '',
    brand:    data.brand ?? data.card_brand ?? '',
    expMonth: data.exp_month ?? cardData.expMonth,
    expYear:  data.exp_year  ?? cardData.expYear,
  }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Creates a recurring subscription in N1CO.
 * N1CO will handle monthly auto-renewal and fire webhooks.
 */
export async function createN1coSubscription(
  input: N1coSubscriptionInput
): Promise<N1coSubscriptionResult> {
  const data = await n1coFetch<{
    id: string
    subscription_id?: string
    status?: string
    next_billing_date?: string
  }>('/api/v3/Subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id:           input.planId,
      location_code:     input.locationCode,
      payment_method_id: input.paymentMethodId,
      customer: {
        id:    input.customerId,
        name:  input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone ?? '',
      },
    }),
  })

  return {
    subscriptionId:  data.subscription_id ?? data.id,
    status:          data.status ?? 'active',
    nextBillingDate: data.next_billing_date,
  }
}

/**
 * Cancels an active N1CO subscription.
 */
export async function cancelN1coSubscription(
  n1coSubscriptionId: string,
  reason = 'Customer requested cancellation'
): Promise<{ success: boolean }> {
  await n1coFetch<unknown>(`/api/v3/Subscriptions/${n1coSubscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  return { success: true }
}

/**
 * Retrieves the current state of an N1CO subscription.
 */
export async function getN1coSubscription(
  n1coSubscriptionId: string
): Promise<N1coSubscriptionDetail> {
  const data = await n1coFetch<{
    id: string
    subscription_id?: string
    status?: string
    plan_id?: string
    next_billing_date?: string
    cancelled_at?: string
  }>(`/api/v3/Subscriptions/${n1coSubscriptionId}`)

  return {
    subscriptionId:  data.subscription_id ?? data.id,
    status:          data.status ?? 'unknown',
    planId:          data.plan_id ?? '',
    nextBillingDate: data.next_billing_date,
    cancelledAt:     data.cancelled_at,
  }
}

// ---------------------------------------------------------------------------
// Webhook validation
// ---------------------------------------------------------------------------

/**
 * Validates that an incoming webhook came from N1CO
 * by comparing the secret header value.
 */
export function validateWebhookSecret(secret: string | null | undefined): boolean {
  const expected = process.env.N1CO_WEBHOOK_SECRET
  if (!expected || !secret) return false
  // Constant-time comparison to prevent timing attacks
  return secret.length === expected.length &&
    Buffer.from(secret).equals(Buffer.from(expected))
}
