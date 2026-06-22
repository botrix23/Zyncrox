ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact_name" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" varchar(30);

CREATE TABLE IF NOT EXISTS "receptionist_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
  "days_of_week" jsonb NOT NULL DEFAULT '[]',
  "start_time" varchar(5) NOT NULL,
  "end_time" varchar(5) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
