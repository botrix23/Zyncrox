-- Migration 0021: platform_transactions
-- Stores every payment charge (successful or failed) received by the platform.

CREATE TABLE IF NOT EXISTS "platform_transactions" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"            uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
  "tenant_name"          varchar(255) NOT NULL,
  "plan"                 varchar(50)  NOT NULL,
  "amount"               numeric(10,2) NOT NULL,
  "currency"             varchar(3)   NOT NULL DEFAULT 'USD',
  "status"               varchar(20)  NOT NULL DEFAULT 'SUCCEEDED',
  "period"               varchar(20)  NOT NULL DEFAULT 'MONTHLY',
  "n1co_transaction_id"  varchar(255),
  "created_at"           timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "platform_transactions_tenant_id_idx"
  ON "platform_transactions"("tenant_id");

CREATE INDEX IF NOT EXISTS "platform_transactions_status_idx"
  ON "platform_transactions"("status");

CREATE INDEX IF NOT EXISTS "platform_transactions_created_at_idx"
  ON "platform_transactions"("created_at" DESC);
