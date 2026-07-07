-- Enable RLS on n1co_webhook_events (Supabase Security Advisor).
-- No policies are defined on purpose: the table is server-only (Drizzle
-- connects as the table owner, which bypasses RLS). Enabling RLS with no
-- policies blocks all access through the public PostgREST API.
ALTER TABLE "n1co_webhook_events" ENABLE ROW LEVEL SECURITY;
