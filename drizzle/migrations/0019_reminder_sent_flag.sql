ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_sent" boolean NOT NULL DEFAULT false;
