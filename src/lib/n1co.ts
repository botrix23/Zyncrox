/**
 * N1CO Subscription Links — Redirect / Hosted-Checkout Model
 *
 * Zyncrox redirects customers to N1CO's hosted subscription page.
 * Cards NEVER touch Zyncrox servers — full PCI compliance on N1CO's side.
 *
 * Flow:
 *   1. Tenant clicks "Subscribe" → Zyncrox redirects to the N1CO link for that plan
 *   2. Customer enters card on N1CO's hosted page
 *   3. N1CO charges and fires a webhook to /api/webhooks/n1co
 *   4. Webhook handler activates the tenant (matched by subscriber email)
 *
 * Required env vars:
 *   N1CO_LINK_BASIC         — https://pay.n1co.shop/pl/k3RdPFkYZ
 *   N1CO_LINK_PROFESSIONAL  — https://pay.n1co.shop/pl/5X53luXKA
 *   N1CO_LINK_ENTERPRISE    — https://pay.n1co.shop/pl/VkblNUkly
 *   N1CO_WEBHOOK_SECRET     — secret to validate incoming webhooks
 */

// ---------------------------------------------------------------------------
// Subscription link URLs
// ---------------------------------------------------------------------------

export type N1coPlanKey = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'BASIC_TEST'

const LINK_ENV_KEYS: Record<N1coPlanKey, string> = {
  BASIC_TEST:   'N1CO_LINK_BASIC_TEST',
  BASIC:        'N1CO_LINK_BASIC',
  PROFESSIONAL: 'N1CO_LINK_PROFESSIONAL',
  ENTERPRISE:   'N1CO_LINK_ENTERPRISE',
}

/**
 * Returns the N1CO hosted subscription link for the given plan.
 * Optionally pre-fills the subscriber's email to improve webhook matching.
 *
 * @param plan   — BASIC | PROFESSIONAL | ENTERPRISE
 * @param email  — tenant owner email to pre-fill on N1CO's checkout page
 */
export function getN1coSubscriptionLink(plan: string, email?: string): string {
  const key = plan as N1coPlanKey
  const envKey = LINK_ENV_KEYS[key]
  if (!envKey) throw new Error(`Unknown N1CO plan: ${plan}`)

  const baseUrl = process.env[envKey] ?? ''
  if (!baseUrl) throw new Error(`N1CO subscription link not configured: ${envKey}`)

  if (!email) return baseUrl
  return `${baseUrl}?email=${encodeURIComponent(email)}`
}

// ---------------------------------------------------------------------------
// Webhook types
// ---------------------------------------------------------------------------

export type N1coWebhookType =
  | 'SubscriptionConfirmation'
  | 'SubscriptionPayment'
  | 'SubscriptionCancelled'
  | 'SubscriptionFailed'

export interface N1coWebhookPayload {
  type: N1coWebhookType
  /** N1CO subscription ID for this subscriber */
  subscriptionId: string
  /** Subscriber email — used to identify the Zyncrox tenant */
  email?: string
  subscriberEmail?: string
  customerEmail?: string
  /** N1CO subscription link numeric ID (e.g. 5531, 5532, 5533) */
  linkId?: number | string
  amount?: number
  transactionId?: string
  timestamp?: string
  [key: string]: unknown
}

/**
 * Extracts subscriber email from a webhook payload, trying multiple field names
 * since N1CO may vary key names across event types.
 */
export function extractWebhookEmail(payload: N1coWebhookPayload): string | null {
  return (
    payload.email ??
    payload.subscriberEmail ??
    payload.customerEmail ??
    null
  )
}

// ---------------------------------------------------------------------------
// Webhook secret validation
// ---------------------------------------------------------------------------

/**
 * Validates that an incoming webhook came from N1CO.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateWebhookSecret(secret: string | null | undefined): boolean {
  const expected = process.env.N1CO_WEBHOOK_SECRET
  if (!expected || !secret) return false
  if (secret.length !== expected.length) return false
  return Buffer.from(secret).equals(Buffer.from(expected))
}
