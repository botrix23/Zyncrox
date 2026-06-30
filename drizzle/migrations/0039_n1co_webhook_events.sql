-- N1CO webhook event log — stores every raw payload received from N1CO
-- Used to inspect field names, debug subscription flow, and audit billing events.
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
