CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL UNIQUE REFERENCES "tenants"("id") ON DELETE CASCADE,
  "plan" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
  "card_token" text,
  "card_last4" varchar(4),
  "card_brand" varchar(20),
  "card_exp_month" varchar(2),
  "card_exp_year" varchar(4),
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "grace_period_ends_at" timestamp with time zone,
  "last_payment_at" timestamp with time zone,
  "last_payment_amount" decimal(10,2),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
