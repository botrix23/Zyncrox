-- Migration: 0023_super_admin_notifications
-- Creates the super_admin_notifications table for the bell-icon notification system.
-- 8 event types with urgency levels. HIGH urgency triggers an email via Resend.

CREATE TABLE IF NOT EXISTS "super_admin_notifications" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"         varchar(50)  NOT NULL,
  "message"      text         NOT NULL,
  "link"         varchar(500),
  "tenant_id"    uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
  "tenant_name"  varchar(255),
  "urgency"      varchar(10)  NOT NULL DEFAULT 'MEDIUM',
  "is_read"      boolean      NOT NULL DEFAULT false,
  "created_at"   timestamptz  NOT NULL DEFAULT now()
);

-- Fast lookup for the badge count (unread)
CREATE INDEX IF NOT EXISTS "super_admin_notifications_is_read_idx"
  ON "super_admin_notifications" ("is_read", "created_at" DESC);

-- Lookup by tenant (for tenant-specific notification history)
CREATE INDEX IF NOT EXISTS "super_admin_notifications_tenant_idx"
  ON "super_admin_notifications" ("tenant_id", "created_at" DESC);
