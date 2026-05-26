-- Migration: 0027_loyalty_history
-- Adds client_loyalty_history for tracking tier changes over time.

CREATE TABLE IF NOT EXISTS client_loyalty_history (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_email   VARCHAR(255) NOT NULL,
  client_name    VARCHAR(255) NOT NULL,
  previous_tier  VARCHAR(20)  NOT NULL,  -- 'NORMAL' | 'FREQUENT' | 'VIP'
  new_tier       VARCHAR(20)  NOT NULL,
  changed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_history_tenant_email
  ON client_loyalty_history (tenant_id, client_email);
