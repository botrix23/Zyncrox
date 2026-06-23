ALTER TABLE "impersonation_tokens" ADD COLUMN IF NOT EXISTS "target_role" varchar(20) NOT NULL DEFAULT 'ADMIN';
