import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  decimal,
  boolean,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Tenants (Negocio/Cuenta administradora)
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'), // Configuración de Zona Horaria local
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 2. Branches (Sucursales)
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Horarios de atención base de la sucursal (podría ser JSON o tabla separada)
  businessHours: text('business_hours'), 
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 3. Staff (Miembros del equipo)
export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 4. Services (Catálogo de servicios)
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  includes: json('includes').$type<string[]>().default([]).notNull(),
  excludes: json('excludes').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 5. Products (Catálogo de productos físicos)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 6. Bookings (Citas agendadas)
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  // Regla de Oro: Todo el tiempo es geográfico (UTC garantizado con withTimezone: true)
  startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('CONFIRMED'), 
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 7. Blocks (Bloqueos de calendario)
export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  // Si staffId es null, el bloqueo aplica a toda la sucursal
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 255 }),
  startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
});

// 8. CoverageZones (Zonas de cobertura)
export const coverageZones = pgTable('coverage_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  zipCode: varchar('zip_code', { length: 20 }),
  radiusKm: decimal('radius_km', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
