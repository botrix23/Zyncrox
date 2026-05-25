-- Migration 0024: Add N1co plan IDs and location code to platform_config
-- Each plan in N1co has a fixed price baked in; changing price = new plan ID.
-- These fields let the super admin configure plan IDs from the UI without a redeploy.

ALTER TABLE "platform_config"
  ADD COLUMN IF NOT EXISTS "n1co_location_code" varchar(100),
  ADD COLUMN IF NOT EXISTS "n1co_plan_id_basic" varchar(255),
  ADD COLUMN IF NOT EXISTS "n1co_plan_id_professional" varchar(255),
  ADD COLUMN IF NOT EXISTS "n1co_plan_id_enterprise" varchar(255);
