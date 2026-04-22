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
      where: (s, { eq }) => eq(s.tenantId, tenant.id),
      with: { categories: true },
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

  return (
    <>
      {tenant ? (
        <BookingWidget 
          branches={tenantBranches}
          services={tenantServices} 
          staff={tenantStaff}
          tenantName={tenant.name || "ZyncSlot Premium Studio"} 
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
        />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <h1>Por favor corre el seed de base de datos primero.</h1>
        </div>
      )}
    </>
  );
}
