-- Migration: 0026_loyalty_system
-- Adds the loyalty/fidelización system:
--   1. New columns on tenants (toggle + thresholds + window)
--   2. New table client_loyalty (per-client tier cache)

-- ── 1. Tenants: loyalty configuration ────────────────────────────────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS loyalty_enabled              BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS loyalty_window_months        INTEGER      NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS loyalty_frequent_threshold   INTEGER      NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS loyalty_vip_citas_threshold  INTEGER,
  ADD COLUMN IF NOT EXISTS loyalty_vip_amount_threshold NUMERIC(10, 2);

-- ── 2. client_loyalty table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_loyalty (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_email        VARCHAR(255) NOT NULL,
  client_name         VARCHAR(255) NOT NULL,
  loyalty_tier        VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',  -- 'NORMAL' | 'FREQUENT' | 'VIP'
  citas_periodo       INTEGER      NOT NULL DEFAULT 0,
  monto_periodo       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  last_calculated_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- One row per client per tenant
  UNIQUE (tenant_id, client_email)
);

-- Index for fast lookups by tenant (used by cron + UI)
CREATE INDEX IF NOT EXISTS idx_client_loyalty_tenant_id
  ON client_loyalty (tenant_id);

-- Index to quickly filter by tier
CREATE INDEX IF NOT EXISTS idx_client_loyalty_tier
  ON client_loyalty (tenant_id, loyalty_tier);
