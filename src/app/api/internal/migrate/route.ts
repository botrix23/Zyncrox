/**
 * One-time migration runner — creates tables that were added after the initial deploy.
 * Protected by CRON_SECRET. Call once after deploy, then ignore.
 *
 * GET /api/internal/migrate?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "n1co_webhook_events" (
        "id"              uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "received_at"     timestamptz NOT NULL DEFAULT now(),
        "event_type"      text,
        "subscription_id" text,
        "raw_payload"     jsonb       NOT NULL,
        "http_status"     integer     NOT NULL DEFAULT 200
      );
      CREATE INDEX IF NOT EXISTS "idx_n1co_events_received"    ON "n1co_webhook_events" ("received_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_n1co_events_sub"         ON "n1co_webhook_events" ("subscription_id");
      CREATE INDEX IF NOT EXISTS "idx_n1co_events_event_type"  ON "n1co_webhook_events" ("event_type");
    `)

    return NextResponse.json({ ok: true, message: 'n1co_webhook_events table created (or already existed)' })
  } catch (err) {
    console.error('[migrate] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
