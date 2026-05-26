-- Migration: 0028_points_system
-- Adds the loyalty points program (Business plan only):
--   1. New columns on tenants (points toggle + config)
--   2. New columns on client_loyalty (points balance + last activity)
--   3. New table loyalty_rewards (admin-defined catalog)
--   4. New table loyalty_points_transactions (append-only ledger)

-- ── 1. Tenants: points program configuration ──────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS points_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS points_per_dollar      INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS points_expire_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS points_expire_months   INTEGER NOT NULL DEFAULT 6;

-- ── 2. client_loyalty: points balance ────────────────────────────────────────
ALTER TABLE client_loyalty
  ADD COLUMN IF NOT EXISTS loyalty_points_balance      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_last_activity TIMESTAMPTZ;

-- ── 3. loyalty_rewards ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER      NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_tenant
  ON loyalty_rewards (tenant_id, sort_order);

-- ── 4. loyalty_points_transactions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_email VARCHAR(255) NOT NULL,
  client_name  VARCHAR(255) NOT NULL,
  type         VARCHAR(20)  NOT NULL,   -- 'EARNED' | 'REDEEMED' | 'EXPIRED'
  points       INTEGER      NOT NULL,   -- positive=EARNED, negative=REDEEMED/EXPIRED
  booking_id   UUID         REFERENCES bookings(id) ON DELETE SET NULL,
  reward_id    UUID         REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  description  TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lpt_tenant_email
  ON loyalty_points_transactions (tenant_id, client_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lpt_tenant_type
  ON loyalty_points_transactions (tenant_id, type, created_at DESC);
