-- Migration: 0022_impersonation_tokens
-- Creates the impersonation_tokens table for secure Super Admin → Tenant impersonation.
-- Tokens are single-use, expire after 1 hour, and are rate-limited to 10/hour per Super Admin.

CREATE TABLE IF NOT EXISTS "impersonation_tokens" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "super_admin_user_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_tenant_id"     uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "super_admin_email"    varchar(255) NOT NULL,
  "target_tenant_name"   varchar(255) NOT NULL,
  "locale"               varchar(10) NOT NULL DEFAULT 'es',
  "expires_at"           timestamptz NOT NULL,
  "used_at"              timestamptz,
  "created_at"           timestamptz NOT NULL DEFAULT now()
);

-- Index for token lookup (most common query: find by id where not used and not expired)
CREATE INDEX IF NOT EXISTS "impersonation_tokens_expires_at_idx"
  ON "impersonation_tokens" ("expires_at");

-- Index for rate-limit check (count tokens per super admin in the last hour)
CREATE INDEX IF NOT EXISTS "impersonation_tokens_super_admin_created_idx"
  ON "impersonation_tokens" ("super_admin_user_id", "created_at" DESC);
