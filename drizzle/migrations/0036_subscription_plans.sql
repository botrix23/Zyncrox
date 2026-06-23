-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug"               varchar(50)  NOT NULL UNIQUE,
  "name"               varchar(100) NOT NULL,
  "description"        text,
  "highlights"         varchar(255),
  "price"              numeric(10,2) NOT NULL,
  "billing_cycle_days" integer NOT NULL DEFAULT 30,
  "n1co_link"          text,
  "is_active"          boolean NOT NULL DEFAULT true,
  "is_test"            boolean NOT NULL DEFAULT false,
  "sort_order"         integer NOT NULL DEFAULT 0,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed the 4 existing plans
INSERT INTO "subscription_plans" ("slug", "name", "description", "highlights", "price", "billing_cycle_days", "n1co_link", "is_active", "is_test", "sort_order")
VALUES
  ('BASIC_TEST',   'Básico Test',    'Plan de prueba — $1 cada 2 días',         '1 sucursal · 3 especialistas · 20 servicios',   1.00,  2,  'https://pay.n1co.shop/pl/AVvwMiGQ9', true, true,  0),
  ('BASIC',        'Inicial',        'Para profesionales independientes',        '1 sucursal · 3 especialistas · 20 servicios',  25.00, 30, 'https://pay.n1co.shop/pl/k3RdPFkYZ', true, false, 1),
  ('PROFESSIONAL', 'Profesional',    'Para salones medianos',                   '2 sucursales · 10 especialistas · 50 servicios', 59.00, 30, 'https://pay.n1co.shop/pl/5X53luXKA', true, false, 2),
  ('ENTERPRISE',   'Negocio',        'Para cadenas y clínicas',                  'Todo ilimitado',                               99.00, 30, 'https://pay.n1co.shop/pl/VkblNUkly', true, false, 3)
ON CONFLICT ("slug") DO NOTHING;
