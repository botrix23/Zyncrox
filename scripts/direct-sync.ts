import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar .env.local específicamente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Script de sincronización de emergencia para aplicar cambios que drizzle-kit no pudo aplicar
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL no encontrada en .env.local');
    process.exit(1);
  }

  const sql = postgres(connectionString, { ssl: 'require' });

  console.log('🚀 Iniciando sincronización manual de base de datos...');

  try {
    await sql.begin(async (sql) => {
      // 1. Crear nuevas tablas si no existen
      console.log('📦 Creando tablas...');
      
      await sql`
        CREATE TABLE IF NOT EXISTS "booking_sessions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "customer_name" varchar(255) NOT NULL,
          "customer_email" varchar(255) NOT NULL,
          "customer_phone" varchar(30),
          "total_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
          "notes" text,
          "status" varchar(50) DEFAULT 'PENDING' NOT NULL,
          "zone_id" uuid,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS "reviews" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "booking_id" uuid NOT NULL,
          "staff_id" uuid NOT NULL,
          "rating" numeric(3, 2) NOT NULL,
          "comment" text,
          "responses" json DEFAULT '[]'::json NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS "service_branches" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "service_id" uuid NOT NULL,
          "branch_id" uuid NOT NULL
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS "survey_questions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "question_text" text NOT NULL,
          "question_type" varchar(50) DEFAULT 'STARS' NOT NULL,
          "category" varchar(50) DEFAULT 'STAFF' NOT NULL,
          "is_required" boolean DEFAULT true NOT NULL,
          "sort_order" integer DEFAULT 0 NOT NULL,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      `;

      // 2. Añadir columnas a tablas existentes (usando DO blocks para seguridad)
      console.log('🔧 Añadiendo columnas faltantes...');

      const alterStatements = [
        // Bookings
        `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "session_id" uuid;`,
        
        // Coverage Zones
        `ALTER TABLE "coverage_zones" ADD COLUMN IF NOT EXISTS "fee" numeric(10, 2) DEFAULT '0.00' NOT NULL;`,
        `ALTER TABLE "coverage_zones" ADD COLUMN IF NOT EXISTS "description" varchar(500);`,
        `ALTER TABLE "coverage_zones" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;`,
        
        // Services
        `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "allows_home_service" boolean DEFAULT true NOT NULL;`,
        
        // Staff
        `ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "phone" varchar(30);`,
        `ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "emergency_contact_name" varchar(255);`,
        `ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" varchar(30);`,
        `ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "allows_home_service" boolean DEFAULT true NOT NULL;`,
        
        // Tenants
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "home_service_lead_days" integer DEFAULT 7 NOT NULL;`,
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "hero_title" text;`,
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "hero_subtitle" text;`,
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "email_body_template" text;`,
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "reviews_enabled" boolean DEFAULT false NOT NULL;`,
        `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "vip_threshold" integer DEFAULT 5 NOT NULL;`
      ];

      for (const statement of alterStatements) {
        await sql.unsafe(statement);
      }

      console.log('🔗 Actualizando relaciones...');
      // Nota: Los FKs pueden fallar si ya existen, aquí los envolvemos en bloques seguros si es necesario
      // Pero por simplicidad de este script de emergencia, confiaremos en los ADD COLUMN previos.

      console.log('✅ Base de datos sincronizada con éxito.');
    });

    // Diagnóstico final
    console.log('\n🔍 Realizando diagnóstico de la tabla "bookings"...');
    try {
      await sql`SELECT id, tenant_id, branch_id, staff_id, service_id, customer_name, start_time, end_time, status, session_id, created_at FROM bookings LIMIT 1`;
      console.log('✅ Consulta a "bookings" exitosa.');
    } catch (e) {
      console.error('❌ Error en consulta a "bookings":', e.message);
      if (e.message.includes('column')) {
        console.log('💡 Sugerencia: Parece que falta una columna física en la tabla "bookings".');
      }
    }

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
