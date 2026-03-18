import { db } from '../db';
import { tenants, branches, services, staff } from '../db/schema';
import { eq } from 'drizzle-orm';
import BookingWidget from '../components/BookingWidget';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Obtener la información del negocio local
  const allTenants = await db.select().from(tenants).limit(1);
  const tenant = allTenants[0];

  // 2. Extraer los datos reales insertados desde el Seed
  const tenantBranches = tenant ? await db.select().from(branches).where(eq(branches.tenantId, tenant.id)) : [];
  const tenantServices = tenant ? await db.select().from(services).where(eq(services.tenantId, tenant.id)) : [];
  const tenantStaff = tenant ? await db.select().from(staff).where(eq(staff.tenantId, tenant.id)) : [];

  return (
    <>
      {tenant ? (
        <BookingWidget 
          branches={tenantBranches}
          services={tenantServices} 
          staff={tenantStaff}
          tenantName={tenant.name || "ZyncSlot Premium Studio"} 
        />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <h1>Por favor corre el seed de base de datos primero.</h1>
        </div>
      )}
    </>
  );
}
