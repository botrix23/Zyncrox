CREATE TABLE "slot_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"staff_id" uuid,
	"date" varchar(10) NOT NULL,
	"time" varchar(5) NOT NULL,
	"session_token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "slot_locks_tenant_date_idx" ON "slot_locks" ("tenant_id", "date", "time");
--> statement-breakpoint
CREATE INDEX "slot_locks_token_idx" ON "slot_locks" ("session_token");
--> statement-breakpoint
CREATE INDEX "slot_locks_expires_idx" ON "slot_locks" ("expires_at");
