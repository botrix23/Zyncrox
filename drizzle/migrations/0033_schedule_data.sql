ALTER TABLE "staff_assignments" ADD COLUMN IF NOT EXISTS "schedule_data" text;
ALTER TABLE "receptionist_schedules" ADD COLUMN IF NOT EXISTS "schedule_data" text;
