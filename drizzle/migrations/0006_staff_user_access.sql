-- Agregar columnas staff_id e is_active a la tabla users
ALTER TABLE "users" ADD COLUMN "staff_id" uuid REFERENCES "public"."staff"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

-- Tabla de solicitudes de ausencia (requieren aprobación del admin)
CREATE TABLE "absence_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "staff_id" uuid NOT NULL,
  "reason" text,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'PENDING',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "absence_requests_tenant_idx" ON "absence_requests" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "absence_requests_staff_idx" ON "absence_requests" ("staff_id", "status");
