-- Make bookings.staff_id nullable (allow unassigned bookings)
ALTER TABLE "bookings" ALTER COLUMN "staff_id" DROP NOT NULL;
--> statement-breakpoint
-- Drop old cascade-on-delete constraint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_staff_id_staff_id_fk";
--> statement-breakpoint
-- Re-add with SET NULL so deleting a staff member orphans bookings instead of deleting them
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
