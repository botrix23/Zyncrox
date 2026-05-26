import { NextRequest, NextResponse } from 'next/server';
import { expirePointsCronAction } from '@/app/actions/loyalty';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const result = await expirePointsCronAction(authHeader);
  if (!result.success) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
