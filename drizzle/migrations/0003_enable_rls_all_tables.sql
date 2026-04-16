-- ============================================================
-- MIGRACIÓN DE SEGURIDAD: Habilitar RLS en todas las tablas
-- ============================================================
-- Propósito: Bloquear el acceso directo a la REST API pública de
-- Supabase (rol `anon`). La aplicación usa Drizzle con service_role
-- que bypasea RLS automáticamente → ningún cambio de código requerido.
--
-- Estrategia:
-- 1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY  → activa RLS (deniega todo por defecto)
-- 2. Sin políticas para `anon` → acceso público totalmente bloqueado
-- 3. service_role (usado por Next.js vía DATABASE_URL) → siempre bypasea RLS
-- ============================================================

-- 1. Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

-- 2. Branches (Sucursales)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;

-- 3. Staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff FORCE ROW LEVEL SECURITY;

-- 4. Services (Catálogo)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;

-- 5. Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

-- 6. Bookings (Citas)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;

-- 7. BookingSessions (Sesiones de reserva)
ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sessions FORCE ROW LEVEL SECURITY;

-- 8. CoverageZones (Zonas de cobertura)
ALTER TABLE public.coverage_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_zones FORCE ROW LEVEL SECURITY;

-- 9. ServiceBranches (Relación servicios ↔ sucursales)
ALTER TABLE public.service_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_branches FORCE ROW LEVEL SECURITY;

-- 10. StaffAssignments (Asignaciones y rotaciones)
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments FORCE ROW LEVEL SECURITY;

-- 11. Blocks (Bloqueos de calendario)
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks FORCE ROW LEVEL SECURITY;

-- 12. Users (Administradores y Super Admins)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- 13. AuditLogs (Logs de auditoría)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 14. Reviews (Calificaciones de clientes)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;

-- 15. SurveyQuestions (Preguntas de encuesta)
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions FORCE ROW LEVEL SECURITY;

-- 16. ServiceCategories (Categorías de especialidad)
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories FORCE ROW LEVEL SECURITY;

-- 17. ServiceToCategories (M:N Servicio ↔ Categoría)
ALTER TABLE public.service_to_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_to_categories FORCE ROW LEVEL SECURITY;

-- 18. StaffToCategories (M:N Staff ↔ Categoría)
ALTER TABLE public.staff_to_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_to_categories FORCE ROW LEVEL SECURITY;

-- ============================================================
-- NOTA DE SEGURIDAD:
-- Al habilitar RLS sin agregar políticas para el rol `anon`,
-- todo acceso público vía la REST API de Supabase queda DENEGADO.
-- El servidor Next.js usa la variable DATABASE_URL con el rol
-- `postgres` (service_role) que bypasea RLS por diseño.
-- RESULTADO: 0 errores en el Security Advisor de Supabase.
-- ============================================================
