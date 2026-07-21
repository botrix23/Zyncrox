/**
 * N1CO Integration API client (OAuth 2.0 client credentials).
 *
 * The rest of the N1CO integration uses the redirect / hosted-checkout model
 * (see lib/n1co.ts): the customer subscribes on N1CO's page and N1CO notifies us
 * via webhooks. That model has one gap — it gives us no way to STOP a recurring
 * charge. Cancelling only in our own DB would leave N1CO charging the card every
 * cycle. This module covers that gap with server-to-server API calls.
 *
 * Docs:
 *   Ambientes: https://docs.n1co.com/docs/integration-api/environment
 *   Auth:      https://docs.n1co.com/docs/integration-api/auth
 *              POST {base}/api/v3/Token  { clientId, clientSecret }
 *              → { tokenType: "Bearer", accessToken, expiresIn }
 *   Cancel:    POST {base}/api/v3/Subscriptions/{subscriptionId}/cancel  { reason }
 *
 * NOTE: the Bearer token here is a completely different mechanism from the
 * HMAC signature used to verify INCOMING webhooks (see validateWebhookSignature).
 *
 * Required env vars. Create the credentials yourself in the N1CO portal:
 * Configuraciones → API → "crear nueva API" → it returns both values.
 *   N1CO_CLIENT_ID       (alias: N1CO_API_CLIENT_ID)
 *   N1CO_CLIENT_SECRET   (alias: N1CO_API_CLIENT_SECRET)
 *   N1CO_API_BASE_URL    — optional. Defaults to production.
 *                          prod:    https://api.n1co.com
 *                          sandbox: https://api-sandbox.n1co.shop
 *                          (host only — do NOT include the /api/v3 path)
 */

const DEFAULT_BASE_URL = 'https://api.n1co.com'

/**
 * Host for the Integration API. Defaults to the documented production host and
 * is only overridden by N1CO_API_BASE_URL (e.g. to point at sandbox).
 *
 * We deliberately do NOT read the older N1CO_BASE_URL here: its value is unknown
 * and, if it already contains the /api/v3 path, requests end up at
 * `.../api/v3/api/v3/Token`, which returns an HTML 404 instead of JSON.
 * As a safety net we also strip a trailing /api/v3 from whatever we are given,
 * so both "https://api.n1co.com" and "https://api.n1co.com/api/v3" work.
 */
function getBaseUrl(): string {
  const base = process.env.N1CO_API_BASE_URL || DEFAULT_BASE_URL
  return base.replace(/\/+$/, '').replace(/\/api\/v3$/i, '')
}

/**
 * Credentials are created by the merchant in the N1CO portal
 * (Configuraciones → API → crear nueva API), which hands back exactly these
 * two values. We accept the names N1CO itself uses, with an N1CO_API_* alias.
 */
function getCredentials(): { clientId?: string; clientSecret?: string } {
  return {
    clientId:     process.env.N1CO_CLIENT_ID     || process.env.N1CO_API_CLIENT_ID,
    clientSecret: process.env.N1CO_CLIENT_SECRET || process.env.N1CO_API_CLIENT_SECRET,
  }
}

/** True when the API credentials are present, so callers can fail fast. */
export function isN1coApiConfigured(): boolean {
  const { clientId, clientSecret } = getCredentials()
  return Boolean(clientId && clientSecret)
}

// Module-scope token cache. Survives across requests on a warm serverless
// instance; a cold start simply fetches a new token.
let cachedToken: { value: string; expiresAt: number } | null = null

/** Clears the cached token (used to retry once after a 401). */
function clearTokenCache(): void {
  cachedToken = null
}

/**
 * Returns a valid Bearer access token, reusing the cached one when possible.
 * Refreshes 60s before expiry to avoid racing the boundary.
 */
export async function getN1coAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials()
  if (!clientId || !clientSecret) {
    throw new Error('N1CO API credentials missing (N1CO_CLIENT_ID / N1CO_CLIENT_SECRET)')
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value
  }

  const tokenUrl = `${getBaseUrl()}/api/v3/Token`
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  })

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`N1CO token request failed (${res.status}) at ${tokenUrl}: ${raw.slice(0, 200)}`)
  }

  let data: { accessToken?: string; expiresIn?: number }
  try {
    data = JSON.parse(raw)
  } catch {
    // Almost always means the URL is wrong and we got an HTML error page.
    throw new Error(`N1CO token response was not JSON from ${tokenUrl}: ${raw.slice(0, 200)}`)
  }
  if (!data.accessToken) {
    throw new Error('N1CO token response did not include accessToken')
  }

  cachedToken = {
    value: data.accessToken,
    expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
  }
  return cachedToken.value
}

export type N1coCancelResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number | null; error: string }

/**
 * Cancels a recurring subscription at N1CO so the card stops being charged.
 *
 * @param subscriptionId — the numeric N1CO subscription ID delivered in webhooks
 *   as `subscriptionId` / `metadata.SubscriptionId` (e.g. "7765"). This is NOT
 *   the SubscriptionLinkId and NOT the checkout link code.
 * @param reason — free-text reason stored by N1CO (surfaces as CancellationReason).
 *
 * Never throws: returns a discriminated result so the caller can decide whether
 * it is safe to mark the subscription cancelled locally.
 */
export async function cancelN1coSubscription(
  subscriptionId: string,
  reason = 'Cancelada por el cliente desde Zyncrox',
): Promise<N1coCancelResult> {
  const url = `${getBaseUrl()}/api/v3/Subscriptions/${encodeURIComponent(subscriptionId)}/cancel`

  const doRequest = async (token: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
      cache: 'no-store',
    })

  try {
    let res = await doRequest(await getN1coAccessToken())

    // A stale cached token reads as 401 — drop it and retry exactly once.
    if (res.status === 401) {
      clearTokenCache()
      res = await doRequest(await getN1coAccessToken())
    }

    const body = await res.text().catch(() => '')

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `N1CO cancel failed (${res.status}): ${body.slice(0, 300)}`,
      }
    }

    return { ok: true, status: res.status, body }
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : 'Unknown error calling N1CO cancel',
    }
  }
}
