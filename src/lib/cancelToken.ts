import crypto from 'crypto';

const SECRET = process.env.CRON_SECRET || 'cancel_token_fallback_secret';

/**
 * Generates an HMAC-SHA256 token for a booking cancel link.
 * The token is tied to the bookingId so it cannot be reused for other bookings.
 */
export function generateCancelToken(bookingId: string): string {
  return crypto.createHmac('sha256', SECRET).update(bookingId).digest('hex');
}

/**
 * Verifies a cancel token for a given bookingId using timing-safe comparison.
 */
export function verifyCancelToken(bookingId: string, token: string): boolean {
  try {
    const expected = generateCancelToken(bookingId);
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(token, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
