/**
 * Migration: crear tabla subscription_plans y sembrar los 4 planes base.
 *
 * Uso (desde la raíz del proyecto):
 *   DATABASE_URL="postgresql://postgres.kvgkjjqttxzqiiqtvbxo:DeiRaKmacPX0xkaN@aws-1-us-east-1.pooler.supabase.com:6543/postgres" \
 *   npx tsx scripts/migrate-subscription-plans.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL — pasa la URL de Supabase producción como variable de entorno')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client)

async function main() {
  console.log('🔄 Ejecutando migración 0036 — subscription_plans…')

  await db.execute(sql`
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
    )
  `)
  console.log('✅ Tabla subscription_plans creada (o ya existía)')

  await db.execute(sql`
    INSERT INTO "subscription_plans" ("slug","name","description","highlights","price","billing_cycle_days","n1co_link","is_active","is_test","sort_order")
    VALUES
      ('BASIC_TEST',   'Básico Test',  'Plan de prueba — $1 cada 2 días',          '1 sucursal · 3 especialistas · 20 servicios',   1.00,  2,  'https://pay.n1co.shop/pl/AVvwMiGQ9', true, true,  0),
      ('BASIC',        'Inicial',      'Para profesionales independientes',         '1 sucursal · 3 especialistas · 20 servicios',  25.00, 30, 'https://pay.n1co.shop/pl/k3RdPFkYZ', true, false, 1),
      ('PROFESSIONAL', 'Profesional',  'Para salones medianos',                    '2 sucursales · 10 especialistas · 50 servicios', 59.00, 30, 'https://pay.n1co.shop/pl/5X53luXKA', true, false, 2),
      ('ENTERPRISE',   'Negocio',      'Para cadenas y clínicas',                   'Todo ilimitado',                               99.00, 30, 'https://pay.n1co.shop/pl/VkblNUkly', true, false, 3)
    ON CONFLICT ("slug") DO NOTHING
  `)
  console.log('✅ 4 planes sembrados (o ya existían)')

  console.log('')
  console.log('🎉 Migración completada. Ya puedes gestionar planes en /es/admin/super/plans')
  await client.end()
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
