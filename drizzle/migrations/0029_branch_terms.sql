ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "branch_terms" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "branch_terms_enabled" boolean NOT NULL DEFAULT false;
