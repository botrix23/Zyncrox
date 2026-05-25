CREATE TABLE IF NOT EXISTS "client_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_email" varchar(255),
  "client_name" varchar(255) NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "author_name" varchar(255) NOT NULL,
  "author_role" varchar(50) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_client_notes_tenant_email" ON "client_notes" ("tenant_id", "client_email");
CREATE INDEX IF NOT EXISTS "idx_client_notes_author" ON "client_notes" ("author_id");
