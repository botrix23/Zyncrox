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
  logoUrl: text('logo_url'),
  whatsappNumber: varchar('whatsapp_number', { length: 30 }), // Número WA del negocio (ej. 50370000000)
  waMessageTemplate: text('wa_message_template'),              // Template personalizado del mensaje WA a domicilio
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  plan: varchar('plan', { length: 50 }).notNull().default('FREE'), // 'FREE' | 'PRO' | 'ENTERPRISE'
  status: varchar('status', { length: 50 }).notNull().default('TRIAL'), // 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true, mode: 'date' }),
  homeServiceTerms: text('home_service_terms'),
  homeServiceTermsEnabled: boolean('home_service_terms_enabled').default(false).notNull(),
  allowsHomeService: boolean('allows_home_service').default(true).notNull(),
  homeServiceLeadDays: integer('home_service_lead_days').notNull().default(7),
  homeServiceTravelTime: integer('home_service_travel_time').notNull().default(0),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  coverUrl: text('cover_url'),
  primaryColor: varchar('primary_color', { length: 20 }).default('#9333ea').notNull(),
  theme: varchar('theme', { length: 20 }).default('light').notNull(),
  instagramUrl: varchar('instagram_url', { length: 255 }),
  facebookUrl: varchar('facebook_url', { length: 255 }),
  tiktokUrl: varchar('tiktok_url', { length: 255 }),
  bookingSettings: json('booking_settings').$type<{
    step1Title?: string;
    step2Title?: string;
    step3Title?: string;
    step4Title?: string;
    showSummaryOnLeft?: boolean;
  }>().default({}).notNull(),
  heroTitle: text('hero_title'),
  heroSubtitle: text('hero_subtitle'),
  emailBodyTemplate: text('email_body_template'),
  reviewsEnabled: boolean('reviews_enabled').default(false).notNull(),
  vipThreshold: integer('vip_threshold').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 2. Branches (Sucursales)
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }),
  phone: varchar('phone', { length: 30 }),
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
  phone: varchar('phone', { length: 30 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  allowsHomeService: boolean('allows_home_service').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 4. Services (Catálogo de servicios)
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  includes: json('includes').$type<string[]>().default([]).notNull(),
  excludes: json('excludes').$type<string[]>().default([]).notNull(),
  sortOrder: integer('sort_order').notNull().default(0), // Para ordenamiento personalizado
  allowsHomeService: boolean('allows_home_service').notNull().default(true),
  allowSimultaneous: boolean('allow_simultaneous').notNull().default(false),
  isExclusive: boolean('is_exclusive').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
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
  customerPhone: varchar('customer_phone', { length: 30 }),
  // Regla de Oro: Todo el tiempo es geográfico (UTC garantizado con withTimezone: true)
  startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('CONFIRMED'), 
  notes: text('notes'),
  isHomeService: boolean('is_home_service').notNull().default(false),
  sessionId: uuid('session_id').references(() => bookingSessions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 7. BookingSessions (Agrupador de múltiples citas de un cliente)
export const bookingSessions = pgTable('booking_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), 
  zoneId: uuid('zone_id').references(() => coverageZones.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 8. CoverageZones (Zonas de cobertura para servicio a domicilio)
export const coverageZones = pgTable('coverage_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 9. ServiceBranches (Relación muchos-a-muchos entre servicios y sucursales)
export const serviceBranches = pgTable('service_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
});

// 7. StaffAssignments (Asignaciones de staff a sucursales y rotaciones)
export const staffAssignments = pgTable('staff_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  // Rango de fechas (null en startDate significa "siempre")
  startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
  endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
  // isPermanent=true → sucursal base; se suspende automáticamente si hay un override temporal activo
  // isPermanent=false → override temporal (con startDate/endDate)
  isPermanent: boolean('is_permanent').default(false).notNull(),
  startTime: varchar('start_time', { length: 5 }),
  endTime: varchar('end_time', { length: 5 }),
  // Días de la semana que aplica esta asignación
  daysOfWeek: json('days_of_week').$type<string[]>().default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  tenant: one(tenants, { fields: [staffAssignments.tenantId], references: [tenants.id] }),
  staff: one(staff, { fields: [staffAssignments.staffId], references: [staff.id] }),
  branch: one(branches, { fields: [staffAssignments.branchId], references: [branches.id] }),
}));

// 8. Blocks (Bloqueos de calendario)
export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  // Si staffId es null, el bloqueo aplica a toda la sucursal
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 255 }),
  startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
});

// 9. SlotLocks (Reservas temporales de slots — expiran en ~10 min si no se confirma)
export const slotLocks = pgTable('slot_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }), // null = cualquier staff
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  time: varchar('time', { length: 5 }).notNull(),  // HH:MM
  sessionToken: varchar('session_token', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 10. Users (Usuarios con Roles: ADMIN, SUPER_ADMIN)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Null si es Super Admin
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(), 
  role: varchar('role', { length: 50 }).notNull().default('ADMIN'), // 'ADMIN' | 'SUPER_ADMIN'
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpiresAt: timestamp('reset_password_expires_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 10. Audit Logs (Registro de auditoría de toda la app)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }), // Null para eventos globales (Super Admin)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),       // Quién realizó la acción
  action: varchar('action', { length: 100 }).notNull(), // 'LOGIN_SUCCESS' | 'TENANT_STATUS_CHANGED' | etc.
  details: json('details').$type<Record<string, unknown>>(), // Contexto adicional del evento
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 11. Reviews (Calificaciones de clientes al staff)
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull(), // Permite promedios (ej 4.5)
  comment: text('comment'),
  responses: json('responses').$type<Array<{ questionId: string; answer: any; questionText?: string; questionType?: string }>>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 12. SurveyQuestions (Preguntas personalizadas para la encuesta)
export const surveyQuestions = pgTable('survey_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: varchar('question_type', { length: 50 }).notNull().default('STARS'), // 'STARS' | 'YES_NO' | 'TEXT' | 'NPS'
  category: varchar('category', { length: 50 }).notNull().default('STAFF'), // 'STAFF' | 'BUSINESS'
  isRequired: boolean('is_required').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  branches: many(branches),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));
export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  staff: many(staff),
  bookings: many(bookings),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, { fields: [staff.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [staff.branchId], references: [branches.id] }),
  bookings: many(bookings),
  assignments: many(staffAssignments),
  reviews: many(reviews),
  categories: many(staffToCategories),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
  branches: many(serviceBranches),
  categories: many(serviceToCategories),
}));

export const serviceBranchesRelations = relations(serviceBranches, ({ one }) => ({
  tenant: one(tenants, { fields: [serviceBranches.tenantId], references: [tenants.id] }),
  service: one(services, { fields: [serviceBranches.serviceId], references: [services.id] }),
  branch: one(branches, { fields: [serviceBranches.branchId], references: [branches.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [bookings.branchId], references: [branches.id] }),
  staff: one(staff, { fields: [bookings.staffId], references: [staff.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  session: one(bookingSessions, { fields: [bookings.sessionId], references: [bookingSessions.id] }),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
}));

export const bookingSessionsRelations = relations(bookingSessions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [bookingSessions.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
  zone: one(coverageZones, { fields: [bookingSessions.zoneId], references: [coverageZones.id] }),
}));

export const coverageZonesRelations = relations(coverageZones, ({ one, many }) => ({
  tenant: one(tenants, { fields: [coverageZones.tenantId], references: [tenants.id] }),
  sessions: many(bookingSessions),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tenant: one(tenants, { fields: [reviews.tenantId], references: [tenants.id] }),
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  staff: one(staff, { fields: [reviews.staffId], references: [staff.id] }),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one }) => ({
  tenant: one(tenants, { fields: [surveyQuestions.tenantId], references: [tenants.id] }),
}));

// 13. ServiceCategories (Etiquetas de especialidad: "uñas", "cabello", "masajes", etc.)
export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }).notNull().default('#8b5cf6'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 14. ServiceToCategories (M:N Servicio ↔ Categoría)
export const serviceToCategories = pgTable('service_to_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'cascade' }),
});

// 15. StaffToCategories (M:N Staff ↔ Categoría)
export const staffToCategories = pgTable('staff_to_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'cascade' }),
});

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [serviceCategories.tenantId], references: [tenants.id] }),
  services: many(serviceToCategories),
  staff: many(staffToCategories),
}));

export const serviceToCategoriessRelations = relations(serviceToCategories, ({ one }) => ({
  tenant: one(tenants, { fields: [serviceToCategories.tenantId], references: [tenants.id] }),
  service: one(services, { fields: [serviceToCategories.serviceId], references: [services.id] }),
  category: one(serviceCategories, { fields: [serviceToCategories.categoryId], references: [serviceCategories.id] }),
}));

export const staffToCategoriessRelations = relations(staffToCategories, ({ one }) => ({
  tenant: one(tenants, { fields: [staffToCategories.tenantId], references: [tenants.id] }),
  staff: one(staff, { fields: [staffToCategories.staffId], references: [staff.id] }),
  category: one(serviceCategories, { fields: [staffToCategories.categoryId], references: [serviceCategories.id] }),
}));
