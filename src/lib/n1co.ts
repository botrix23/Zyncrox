/**
 * n1co Payment Gateway — El Salvador
 *
 * Replace BASE_URL and API_KEY with n1co credentials once provided.
 *
 * Card tokenization: verify with n1co whether to use their JS SDK for
 * client-side tokenization (preferred for PCI compliance) or server-side
 * as implemented here. If they provide a JS SDK / hosted fields solution,
 * replace `tokenizeCard` with client-side logic and only call `chargeWithToken`
 * from the server.
 *
 * TODO: Fill in actual endpoint paths once n1co API docs are available.
 */

const BASE_URL = process.env.N1CO_BASE_URL ?? ''
const API_KEY = process.env.N1CO_API_KEY ?? ''

export interface N1coCardData {
  number: string
  holderName: string
  expMonth: string
  expYear: string
  cvv: string
}

export interface N1coTokenResult {
  token: string
  last4: string
  brand: string
  expMonth: string
  expYear: string
}

export interface N1coChargeResult {
  success: boolean
  transactionId?: string
  errorCode?: string
  errorMessage?: string
}

/**
 * Sends card data to n1co and returns a reusable payment token.
 * TODO: Replace stub with actual n1co tokenization endpoint.
 */
export async function tokenizeCard(cardData: N1coCardData): Promise<N1coTokenResult> {
  // TODO: Implement when n1co tokenization docs are available.
  // Example shape — adjust fields to match n1co API spec:
  //
  // const res = await fetch(`${BASE_URL}/tokens`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     card_number: cardData.number,
  //     card_holder: cardData.holderName,
  //     exp_month: cardData.expMonth,
  //     exp_year: cardData.expYear,
  //     cvv: cardData.cvv,
  //   }),
  // })
  // const data = await res.json()
  // return { token: data.token, last4: data.last4, brand: data.brand, expMonth: data.expMonth, expYear: data.expYear }

  void BASE_URL
  void API_KEY
  throw new Error('n1co tokenizeCard: not yet implemented — awaiting API docs')
}

/**
 * Charges a previously tokenized card.
 * TODO: Replace stub with actual n1co charge endpoint.
 */
export async function chargeWithToken(
  token: string,
  amountUSD: number,
  description: string
): Promise<N1coChargeResult> {
  // TODO: Implement when n1co charge docs are available.
  // Example shape — adjust fields to match n1co API spec:
  //
  // const res = await fetch(`${BASE_URL}/charges`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ token, amount: Math.round(amountUSD * 100), currency: 'USD', description }),
  // })
  // const data = await res.json()
  // if (!res.ok) return { success: false, errorCode: data.code, errorMessage: data.message }
  // return { success: true, transactionId: data.transaction_id }

  void token
  void amountUSD
  void description
  throw new Error('n1co chargeWithToken: not yet implemented — awaiting API docs')
}

/**
 * Validates that a webhook payload came from n1co.
 * TODO: Replace stub with actual signature verification logic once n1co docs arrive.
 */
export function validateWebhookSignature(payload: string, signature: string): boolean {
  // TODO: Implement HMAC verification once n1co documents their webhook signing algorithm.
  // Typical approach:
  // const expected = crypto.createHmac('sha256', API_KEY).update(payload).digest('hex')
  // return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))

  void payload
  void signature
  return false
}
