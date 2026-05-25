import { db } from '@/db';
import { tenants, branches, services, staff } from '@/db/schema';
import { eq } from 'drizzle-orm';
import BookingWidget from '@/components/BookingWidget';

export const dynamic = 'force-dynamic';

export default async function Home({ params }: { params: { locale: string, slug: string } }) {
  const { slug } = params;

  // 1. Obtener la información del negocio por slug
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug)
  });

  // 2. Extraer los datos reales si el tenant existe
  const tenantBranches = tenant ? await db.select().from(branches).where(eq(branches.tenantId, tenant.id)) : [];

  const [rawServices, rawStaff, coverageZones] = tenant ? await Promise.all([
    db.query.services.findMany({
      where: (srv, { eq }) => eq(srv.tenantId, tenant.id),
      with: { branches: true, categories: true },
      orderBy: (srv, { asc }) => [asc(srv.sortOrder)],
    }),
    db.query.staff.findMany({
      where: (s, { eq, and }) => and(eq(s.tenantId, tenant.id), eq(s.isActive, true)),
      with: {
        categories: true,
        assignments: { columns: { branchId: true, isPermanent: true } },
      },
    }),
    db.query.coverageZones.findMany({ where: (zones, { eq }) => eq(zones.tenantId, tenant.id) }),
  ]) : [[], [], []];

  // Aplanar categoryIds a arrays de strings para el widget
  const tenantServices = rawServices.map(s => ({
    ...s,
    categoryIds: (s.categories || []).map((c: any) => c.categoryId),
  }));
  const tenantStaff = rawStaff.map(s => ({
    ...s,
    categoryIds: (s.categories || []).map((c: any) => c.categoryId),
  }));

  // Tenant suspendido: mostrar página de no disponible
  if (tenant?.status === 'SUSPENDED') {
    const locale = params.locale;
    const isSuspendedEs = locale !== 'en';
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          {tenant.logoUrl && (
            <div className="flex justify-center mb-2">
              <img src={tenant.logoUrl} alt={tenant.name || ''} className="h-10 object-contain" />
            </div>
          )}
          <div className="text-4xl">⏸️</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{tenant.name}</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">
            {isSuspendedEs
              ? 'Por el momento no está disponible para recibir reservas en línea. Contáctanos directamente para más información.'
              : 'This business is currently not available for online bookings. Please contact us directly for more information.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {tenant ? (
        <BookingWidget
          branches={tenantBranches}
          services={tenantServices}
          staff={tenantStaff}
          tenantName={tenant.name || "Zyncrox Premium Studio"}
          tenantId={tenant.id}
          whatsappNumber={tenant.whatsappNumber || ''}
          homeServiceTerms={tenant.homeServiceTerms || ''}
          homeServiceTermsEnabled={tenant.homeServiceTermsEnabled}
          waMessageTemplate={tenant.waMessageTemplate}
          bookingSettings={tenant.bookingSettings}
          primaryColor={tenant.primaryColor}
          coverUrl={tenant.coverUrl}
          forcedTheme={tenant.theme}
          tenantLogo={tenant.logoUrl || undefined}
          instagramUrl={tenant.instagramUrl || undefined}
          facebookUrl={tenant.facebookUrl || undefined}
          tiktokUrl={tenant.tiktokUrl || undefined}
          allowsHomeService={tenant.allowsHomeService}
          showStaffSelection={tenant.showStaffSelection}
          homeServiceLeadDays={tenant.homeServiceLeadDays}
          coverageZones={coverageZones}
          tenantPlan={tenant.plan}
          heroTitle={tenant.heroTitle}
          heroSubtitle={tenant.heroSubtitle}
          tenantTimezone={tenant.timezone || 'America/El_Salvador'}
        />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <h1>Por favor corre el seed de base de datos primero.</h1>
        </div>
      )}
    </>
  );
}
