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
  plan: varchar('plan', { length: 50 }).notNull().default('BASIC'), // 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
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
  showStaffSelection: boolean('show_staff_selection').default(true).notNull(),
  reviewsEnabled: boolean('reviews_enabled').default(false).notNull(),
  vipThreshold: integer('vip_threshold').notNull().default(5), // legacy — kept for backward compat
  // ── Loyalty / Fidelización ───────────────────────────────────────────────
  loyaltyEnabled: boolean('loyalty_enabled').notNull().default(false),
  loyaltyWindowMonths: integer('loyalty_window_months').notNull().default(6),
  loyaltyFrequentThreshold: integer('loyalty_frequent_threshold').notNull().default(5),
  loyaltyVipCitasThreshold: integer('loyalty_vip_citas_threshold'),          // null = no VIP level
  loyaltyVipAmountThreshold: decimal('loyalty_vip_amount_threshold', { precision: 10, scale: 2 }), // null = no amount req
  // ── Points Program (ENTERPRISE / Business only) ──────────────────────────
  pointsEnabled: boolean('points_enabled').notNull().default(false),
  pointsPerDollar: integer('points_per_dollar').notNull().default(10),      // points awarded per $1 spent
  pointsExpireEnabled: boolean('points_expire_enabled').notNull().default(false),
  pointsExpireMonths: integer('points_expire_months').notNull().default(6),  // months of inactivity before expiry
  // Wompi payment gateway credentials (for tenant's own card payments)
  wompiAppId: text('wompi_app_id'),
  wompiApiSecret: text('wompi_api_secret'),
  wompiIsProduction: boolean('wompi_is_production').notNull().default(false),
  emailLocale: varchar('email_locale', { length: 5 }).notNull().default('es'),
  contactEmail: varchar('contact_email', { length: 255 }),
  recoveryEmail: varchar('recovery_email', { length: 255 }),
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
  isActive: boolean('is_active').notNull().default(true),
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
  inheritBranchHours: boolean('inherit_branch_hours').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
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
  isActive: boolean('is_active').notNull().default(true),
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
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'set null' }),
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
  surveyEmailSent: boolean('survey_email_sent').notNull().default(false),
  reminderSent: boolean('reminder_sent').notNull().default(false),
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
  // 'ACTIVE' | 'CANCELLED'
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  cancelReason: varchar('cancel_reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
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

// 10. Users (Usuarios con Roles: ADMIN, SUPER_ADMIN, STAFF)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }), // Solo para rol STAFF
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('ADMIN'), // 'ADMIN' | 'SUPER_ADMIN' | 'STAFF'
  isActive: boolean('is_active').notNull().default(true),
  isOwner: boolean('is_owner').notNull().default(false),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  tempPasswordExpiresAt: timestamp('temp_password_expires_at', { withTimezone: true, mode: 'date' }),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpiresAt: timestamp('reset_password_expires_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 13. AbsenceRequests (Solicitudes de ausencia enviadas por el staff, requieren aprobación)
export const absenceRequests = pgTable('absence_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
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
  responses: json('responses').$type<Array<{ questionId: string; answer: any; questionText?: string; questionType?: string; category?: string }>>().default([]).notNull(),
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

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
  // N1CO IDs (se llenan al conectar con N1CO)
  n1coSubscriptionId: varchar('n1co_subscription_id', { length: 100 }),
  n1coPaymentMethodId: varchar('n1co_payment_method_id', { length: 100 }),
  // Datos de tarjeta (solo últimos 4 dígitos y marca — nunca el número completo)
  cardToken: text('card_token'),
  cardLast4: varchar('card_last4', { length: 4 }),
  cardBrand: varchar('card_brand', { length: 20 }),
  cardExpMonth: varchar('card_exp_month', { length: 2 }),
  cardExpYear: varchar('card_exp_year', { length: 4 }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true, mode: 'date' }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'date' }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
  gracePeriodEndsAt: timestamp('grace_period_ends_at', { withTimezone: true, mode: 'date' }),
  lastPaymentAt: timestamp('last_payment_at', { withTimezone: true, mode: 'date' }),
  lastPaymentAmount: decimal('last_payment_amount', { precision: 10, scale: 2 }),
  // Scheduled downgrade: applied by billing cron at currentPeriodEnd
  pendingPlan: varchar('pending_plan', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(users),
  branches: many(branches),
  subscription: one(subscriptions, { fields: [tenants.id], references: [subscriptions.tenantId] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptions.tenantId], references: [tenants.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  staff: one(staff, {
    fields: [users.staffId],
    references: [staff.id],
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
  user: one(users, { fields: [staff.id], references: [users.staffId] }),
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

// ── Platform-level singleton config (super admin settings) ─────────────────
// Row with id=1 is always the one record. Created by migration 0008.
export const platformConfig = pgTable('platform_config', {
  id: integer('id').primaryKey().default(1),
  wompiAppId: text('wompi_app_id'),
  wompiApiSecret: text('wompi_api_secret'),
  wompiIsProduction: boolean('wompi_is_production').notNull().default(false),
  // Custom HTML overrides for email templates (null = use default React component)
  emailTplConfirmation: text('email_tpl_confirmation'),
  emailTplReminder: text('email_tpl_reminder'),
  emailTplCancellation: text('email_tpl_cancellation'),
  emailTplReschedule: text('email_tpl_reschedule'),
  emailTplTrialWarning: text('email_tpl_trial_warning'),
  emailTplSurveyInvite: text('email_tpl_survey_invite'),
  // Precios de planes (editables desde super admin, en USD)
  planPriceBasic: decimal('plan_price_basic', { precision: 10, scale: 2 }).default('25.00'),
  planPriceProfessional: decimal('plan_price_professional', { precision: 10, scale: 2 }).default('59.00'),
  planPriceEnterprise: decimal('plan_price_enterprise', { precision: 10, scale: 2 }).default('99.00'),
  // N1co plan IDs (cada plan en N1co tiene un ID único; cambiar precio = crear nuevo plan en N1co)
  n1coLocationCode: varchar('n1co_location_code', { length: 100 }),
  n1coPlanIdBasic: varchar('n1co_plan_id_basic', { length: 255 }),
  n1coPlanIdProfessional: varchar('n1co_plan_id_professional', { length: 255 }),
  n1coPlanIdEnterprise: varchar('n1co_plan_id_enterprise', { length: 255 }),
  // Aviso de cambio de precios (null = sin aviso activo)
  priceChangeNotice: json('price_change_notice').$type<{
    effectiveDate: string        // ISO date 'YYYY-MM-DD'
    messageEs: string
    messageEn: string
    plans: { plan: string; currentPrice: number; newPrice: number }[]
  } | null>(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const absenceRequestsRelations = relations(absenceRequests, ({ one }) => ({
  tenant: one(tenants, { fields: [absenceRequests.tenantId], references: [tenants.id] }),
  staff: one(staff, { fields: [absenceRequests.staffId], references: [staff.id] }),
}));

// ── Client Notes ────────────────────────────────────────────────────────────
// Notes are keyed by clientEmail (primary) since there is no separate clients table.
// Clients are derived from bookings, so clientEmail is the stable identifier.
export const clientNotes = pgTable('client_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientEmail: varchar('client_email', { length: 255 }),  // null for clients without email
  clientName: varchar('client_name', { length: 255 }).notNull(), // display name
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorName: varchar('author_name', { length: 255 }).notNull(), // cached at write time
  authorRole: varchar('author_role', { length: 50 }).notNull(), // 'ADMIN' | 'STAFF'
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  tenant: one(tenants, { fields: [clientNotes.tenantId], references: [tenants.id] }),
  author: one(users, { fields: [clientNotes.authorId], references: [users.id] }),
}));

// ── Client Loyalty ───────────────────────────────────────────────────────────
// One row per (tenantId, clientEmail) — upserted by the recalculation engine.
// Clients without email cannot be reliably tracked across bookings → excluded.
export const clientLoyalty = pgTable('client_loyalty', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),  // last known display name
  // 'NORMAL' | 'FREQUENT' | 'VIP'
  loyaltyTier: varchar('loyalty_tier', { length: 20 }).notNull().default('NORMAL'),
  citasPeriodo: integer('citas_periodo').notNull().default(0),     // cached count within window
  montoPeriodo: decimal('monto_periodo', { precision: 10, scale: 2 }).notNull().default('0.00'),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true, mode: 'date' }),
  // ── Points balance (updated by earnPoints / redeem / expire actions) ─────
  loyaltyPointsBalance: integer('loyalty_points_balance').notNull().default(0),
  loyaltyPointsLastActivity: timestamp('loyalty_points_last_activity', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const clientLoyaltyRelations = relations(clientLoyalty, ({ one }) => ({
  tenant: one(tenants, { fields: [clientLoyalty.tenantId], references: [tenants.id] }),
}));

// ── Client Loyalty History ───────────────────────────────────────────────────
// Append-only log of tier changes. Populated by the recalculation engine
// whenever a client's loyaltyTier changes. Used to show "fue VIP de ene a abr 2026".
export const clientLoyaltyHistory = pgTable('client_loyalty_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  previousTier: varchar('previous_tier', { length: 20 }).notNull(),  // 'NORMAL' | 'FREQUENT' | 'VIP'
  newTier: varchar('new_tier', { length: 20 }).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const clientLoyaltyHistoryRelations = relations(clientLoyaltyHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [clientLoyaltyHistory.tenantId], references: [tenants.id] }),
}));

// ── Loyalty Rewards (catalog defined by tenant) ──────────────────────────────
export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({ one, many }) => ({
  tenant: one(tenants, { fields: [loyaltyRewards.tenantId], references: [tenants.id] }),
  transactions: many(loyaltyPointsTransactions),
}));

// ── Loyalty Points Transactions ───────────────────────────────────────────────
// Append-only ledger. EARNED = positive, REDEEMED/EXPIRED = negative.
export const loyaltyPointsTransactions = pgTable('loyalty_points_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'EARNED' | 'REDEEMED' | 'EXPIRED'
  points: integer('points').notNull(),             // positive for EARNED, negative for REDEEMED/EXPIRED
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  rewardId: uuid('reward_id').references(() => loyaltyRewards.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const loyaltyPointsTransactionsRelations = relations(loyaltyPointsTransactions, ({ one }) => ({
  tenant: one(tenants, { fields: [loyaltyPointsTransactions.tenantId], references: [tenants.id] }),
  booking: one(bookings, { fields: [loyaltyPointsTransactions.bookingId], references: [bookings.id] }),
  reward: one(loyaltyRewards, { fields: [loyaltyPointsTransactions.rewardId], references: [loyaltyRewards.id] }),
}));

// ── Platform Transactions ────────────────────────────────────────────────────
// Records every payment charge (successful or failed) received by the platform.
// Populated by the N1co webhook handler or by manual registration.
export const platformTransactions = pgTable('platform_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),       // denormalized
  plan: varchar('plan', { length: 50 }).notNull(),                     // BASIC | PROFESSIONAL | ENTERPRISE
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 20 }).notNull().default('SUCCEEDED'), // SUCCEEDED | FAILED | PENDING | REFUNDED
  period: varchar('period', { length: 20 }).notNull().default('MONTHLY'),   // MONTHLY | ANNUAL
  n1coTransactionId: varchar('n1co_transaction_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const platformTransactionsRelations = relations(platformTransactions, ({ one }) => ({
  tenant: one(tenants, { fields: [platformTransactions.tenantId], references: [tenants.id] }),
}));

// ── Impersonation Tokens ─────────────────────────────────────────────────────
// One-time tokens that allow a Super Admin to open a tenant's admin panel
// in a new browser tab without modifying the Super Admin's own session.
// Tokens expire after 1 hour and can only be used once.
export const impersonationTokens = pgTable('impersonation_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  superAdminUserId: uuid('super_admin_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetTenantId: uuid('target_tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  superAdminEmail: varchar('super_admin_email', { length: 255 }).notNull(),
  targetTenantName: varchar('target_tenant_name', { length: 255 }).notNull(),
  locale: varchar('locale', { length: 10 }).notNull().default('es'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const impersonationTokensRelations = relations(impersonationTokens, ({ one }) => ({
  superAdmin: one(users, { fields: [impersonationTokens.superAdminUserId], references: [users.id] }),
  targetTenant: one(tenants, { fields: [impersonationTokens.targetTenantId], references: [tenants.id] }),
}));

// ── Super Admin Notifications ────────────────────────────────────────────────
// Real-time notifications delivered to the Super Admin bell icon.
// 8 event types with urgency levels (HIGH triggers email via Resend).
export const superAdminNotifications = pgTable('super_admin_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Event type — used to render appropriate icon and message template
  type: varchar('type', { length: 50 }).notNull(),
  // Human-readable message (already formatted, stored in the DB's default language)
  message: text('message').notNull(),
  // Optional link to the relevant page within the super admin panel
  link: varchar('link', { length: 500 }),
  // Tenant related to this notification (null for platform-wide events)
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  tenantName: varchar('tenant_name', { length: 255 }),
  // Urgency: LOW | MEDIUM | HIGH (HIGH → email via Resend)
  urgency: varchar('urgency', { length: 10 }).notNull().default('MEDIUM'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const superAdminNotificationsRelations = relations(superAdminNotifications, ({ one }) => ({
  tenant: one(tenants, { fields: [superAdminNotifications.tenantId], references: [tenants.id] }),
}));
