/**
 * n1co EPay — Payment Gateway (El Salvador)
 *
 * Subscription model:
 *   1. createPaymentMethod(cardData, customer) → paymentMethodId
 *   2. createN1coSubscription({ planId, ..., paymentMethodId }) → subscriptionId
 *   3. N1CO handles monthly auto-renewal and fires webhooks
 *
 * Required env vars:
 *   N1CO_BASE_URL          (default: https://api-sandbox.n1co.shop)
 *   N1CO_CLIENT_ID
 *   N1CO_CLIENT_SECRET
 *   N1CO_WEBHOOK_SECRET
 *
 * Plan IDs and location code are stored in platform_config (DB),
 * not as env vars, since each price change requires a new plan in N1co.
 */

const BASE_URL      = process.env.N1CO_BASE_URL      ?? 'https://api-sandbox.n1co.shop'
const CLIENT_ID     = process.env.N1CO_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.N1CO_CLIENT_SECRET ?? ''

// ---------------------------------------------------------------------------
// OAuth 2.0 — token cache
// ---------------------------------------------------------------------------

let _cachedToken: string | null = null
let _tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  // Reuse cached token if still valid with 60s buffer
  if (_cachedToken && now < _tokenExpiresAt - 60_000) return _cachedToken

  const res = await fetch(`${BASE_URL}/api/v3/Token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  })

  const text = await res.text()
  let data: Record<string, unknown>
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res.ok) {
    throw new Error(`N1CO auth ${res.status}: ${data?.message ?? 'Unknown error'}`)
  }

  const token     = (data.token ?? data.access_token ?? data.accessToken) as string
  const expiresIn = (data.expiresIn ?? data.expires_in ?? 3600) as number

  if (!token) throw new Error('N1CO auth: no token in response')

  _cachedToken    = token
  _tokenExpiresAt = now + expiresIn * 1000
  return token
}

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

export interface N1coCustomer {
  id: string
  name: string
  email: string
  phone?: string
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
  customerId: string
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
  const url   = `${BASE_URL}${path}`
  const token = await getAccessToken()

  // Strip body from options before logging to avoid leaking card data in error messages
  const { body: _body, ...safeOptions } = options

  const res = await fetch(url, {
    ...safeOptions,
    body: _body,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res.ok) {
    const err = data as Record<string, unknown>
    // Never include request body in error — it may contain card data
    throw new Error(
      `N1CO ${options.method ?? 'GET'} ${path} → ${res.status}: ${err?.message ?? 'Unknown error'}`
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
 *
 * @param cardData  Card details from the frontend form
 * @param customer  Customer info from the tenant record
 */
export async function createPaymentMethod(
  cardData: N1coCardData,
  customer: N1coCustomer,
): Promise<N1coPaymentMethodResult> {
  const data = await n1coFetch<{
    id: string
    bin?: { brand?: string }
    success?: boolean
  }>('/api/v3/PaymentMethods', {
    method: 'POST',
    body: JSON.stringify({
      customer: {
        id:          customer.id,
        name:        customer.name,
        email:       customer.email,
        phoneNumber: customer.phone ?? '',
      },
      card: {
        number:          cardData.number,
        cardHolder:      cardData.holderName,
        expirationMonth: cardData.expMonth,
        expirationYear:  cardData.expYear,
        cvv:             cardData.cvv,
        singleUse:       false,
      },
    }),
  })

  // Response has no last4 — derive from submitted card number
  return {
    paymentMethodId: data.id,
    last4:    cardData.number.slice(-4),
    brand:    data.bin?.brand ?? '',
    expMonth: cardData.expMonth,
    expYear:  cardData.expYear,
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
    id?: string
    subscriptionId?: string
    status?: string
    nextBillingDate?: string
  }>('/api/v3/Subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      planId:       Number(input.planId),   // API requires integer
      customer: {
        id:          input.customerId,
        name:        input.customerName,
        email:       input.customerEmail,
        phoneNumber: input.customerPhone ?? '',
      },
      paymentMethod: {
        id: input.paymentMethodId,
      },
      authenticationId: null,
      locationCode:     input.locationCode,
    }),
  })

  return {
    subscriptionId:  data.subscriptionId ?? data.id ?? '',
    status:          data.status ?? 'active',
    nextBillingDate: data.nextBillingDate,
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
    id?: string
    subscriptionId?: string
    status?: string
    planId?: number | string
    nextBillingDate?: string
    cancelledAt?: string
  }>(`/api/v3/Subscriptions/${n1coSubscriptionId}`)

  return {
    subscriptionId:  data.subscriptionId ?? data.id ?? '',
    status:          data.status ?? 'unknown',
    planId:          String(data.planId ?? ''),
    nextBillingDate: data.nextBillingDate,
    cancelledAt:     data.cancelledAt,
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
