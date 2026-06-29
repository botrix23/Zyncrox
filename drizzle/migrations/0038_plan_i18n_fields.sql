ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "name_en"        varchar(100),
  ADD COLUMN IF NOT EXISTS "description_en" text,
  ADD COLUMN IF NOT EXISTS "highlights_en"  varchar(255);
