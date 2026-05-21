ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "pending_plan" varchar(50);
