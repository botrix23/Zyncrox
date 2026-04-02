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
  const tenantServices = tenant ? await db.query.services.findMany({
    where: (srv, { eq }) => eq(srv.tenantId, tenant.id),
    with: {
      branches: true
    },
    orderBy: (srv, { asc }) => [asc(srv.sortOrder)]
  }) : [];
  const tenantStaff = tenant ? await db.select().from(staff).where(eq(staff.tenantId, tenant.id)) : [];
  const coverageZones = tenant ? await db.query.coverageZones.findMany({ where: (zones, { eq }) => eq(zones.tenantId, tenant.id) }) : [];

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
          homeServiceLeadDays={tenant.homeServiceLeadDays}
          coverageZones={coverageZones}
          tenantPlan={tenant.plan}
        />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <h1>Por favor corre el seed de base de datos primero.</h1>
        </div>
      )}
    </>
  );
}
