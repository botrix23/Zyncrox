import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { impersonationTokens } from '@/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth-session';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenId = params.token;

  // 1. Find the token — must exist, not used, and not expired
  const now = new Date();
  const token = await db.query.impersonationTokens.findFirst({
    where: and(
      eq(impersonationTokens.id, tokenId),
      isNull(impersonationTokens.usedAt),
      gt(impersonationTokens.expiresAt, now),
    ),
  });

  const locale = token?.locale ?? 'es';
  const errorRedirect = `/${locale}/admin/super/tenants?impersonation_error=1`;

  if (!token) {
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }

  // 2. Mark token as used (single-use)
  await db
    .update(impersonationTokens)
    .set({ usedAt: now })
    .where(eq(impersonationTokens.id, tokenId));

  // 3. Get the current Super Admin session from cookie
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }

  // 4. Set impersonation context in session cookie
  // The Super Admin's role and email remain unchanged — only the impersonated
  // tenant context is added. Both the super admin tab and this new tab share
  // the same cookie, so the banner will appear in both.
  const impersonatedSession = {
    ...session,
    impersonatedTenantId: token.targetTenantId,
    impersonatedTenantName: token.targetTenantName,
  };

  cookies().set('zync_session', JSON.stringify(impersonatedSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60, // 1 hour — matches token expiry
    path: '/',
    sameSite: 'lax',
  });

  await logAuditEvent({
    action: 'IMPERSONATION_STARTED',
    userId: session.userId,
    tenantId: token.targetTenantId,
    details: {
      superAdminEmail: session.email,
      tenantName: token.targetTenantName,
      tokenId: token.id,
      method: 'token',
    },
  });

  // 5. Redirect to the tenant's admin dashboard
  return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
}
