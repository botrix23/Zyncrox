-- Migration 0025: Add price_change_notice to platform_config
-- Stores the active price-change announcement shown to tenants and sent via email.
-- null = no active notice.

ALTER TABLE "platform_config"
  ADD COLUMN IF NOT EXISTS "price_change_notice" jsonb;
