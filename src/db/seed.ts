import { db } from './index';
import { tenants, branches, staff, services, products, bookings, users, staffAssignments } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 Inicializando Seed de Datos en la BD...');

  // Leer credenciales desde variables de entorno
  const adminName     = process.env.SEED_ADMIN_NAME     || 'Admin Demo';
  const adminEmail    = process.env.SEED_ADMIN_EMAIL    || 'admin@demo.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const superName     = process.env.SEED_SUPER_NAME     || 'Super Admin Demo';
  const superEmail    = process.env.SEED_SUPER_EMAIL    || 'super@demo.com';
  const superPassword = process.env.SEED_SUPER_PASSWORD || 'admin123';

  try {
    const adminHashed = await bcrypt.hash(adminPassword, 10);
    const superHashed = await bcrypt.hash(superPassword, 10);
    const customPasswordHashed = await bcrypt.hash('Carajo23', 10);

    // 0. Limpiar BD previa (DESACTIVADO por solicitud del usuario para preservar datos)
    /*
    console.log('🧹 Limpiando base de datos anterior...');
    await db.delete(bookings);
    await db.delete(users);
    await db.delete(products);
    await db.delete(services);
    await db.delete(staff);
    await db.delete(branches);
    await db.delete(tenants);
    */

    // 1. Obtener o Crear Tenants
    const tenantValues = [
      { name: 'ZyncSalón Spa', slug: 'zyncsalon-spa', whatsappNumber: '50370000000', timezone: 'America/El_Salvador', status: 'ACTIVE' as const, plan: 'PRO' as const },
      { name: 'ZyncSlot Test Studio', slug: 'test', whatsappNumber: '50300000000', timezone: 'America/El_Salvador', status: 'ACTIVE' as const, primaryColor: '#000000', plan: 'PRO' as const }
    ];

    for (const val of tenantValues) {
      await db.insert(tenants).values(val).onConflictDoNothing();
    }

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, 'zyncsalon-spa') });
    const testTenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, 'test') });

    if (!tenant || !testTenant) throw new Error('Error al recuperar tenants');
    
    console.log('✅ Tenants listos');

    // 1.5 Crear Usuarios (con onConflictDoNothing para evitar errores si ya existen)
    await db.insert(users).values([
      {
        tenantId: tenant.id,
        name: 'Boris Alejandro',
        email: 'boris90alejandro@gmail.com',
        password: customPasswordHashed,
        role: 'ADMIN',
      },
      {
        name: 'Boris Guardado',
        email: 'boris90guardado@gmail.com',
        password: customPasswordHashed,
        role: 'SUPER_ADMIN',
      },
      {
        tenantId: tenant.id,
        name: adminName,
        email: adminEmail,
        password: adminHashed,
        role: 'ADMIN',
      },
      {
        name: superName,
        email: superEmail,
        password: superHashed,
        role: 'SUPER_ADMIN',
      }
    ]).onConflictDoNothing();

    console.log('✅ Usuarios administrativos configurados');

    // 2. Crear Sucursales (Solo si no existen sucursales para el tenant)
    const existingBranches = await db.select().from(branches).where(eq(branches.tenantId, tenant.id));
    let branchMain, branchTest;

    if (existingBranches.length === 0) {
      [branchMain] = await db.insert(branches).values({
        tenantId: tenant.id,
        name: 'Sucursal Zona Rosa',
        businessHours: JSON.stringify({ open: '08:00', close: '18:00' }),
      }).returning();

      [branchTest] = await db.insert(branches).values({
        tenantId: testTenant.id,
        name: 'Sucursal de Pruebas',
        businessHours: JSON.stringify({ open: '09:00', close: '17:00' }),
      }).returning();
      console.log('✅ Sucursales base creadas');
    } else {
      branchMain = existingBranches[0];
      const testBranches = await db.select().from(branches).where(eq(branches.tenantId, testTenant.id));
      branchTest = testBranches[0];
      console.log('ℹ️ Usando sucursales existentes');
    }

    // 3. Crear Equipo de Staff (Solo si no hay staff)
    const existingStaff = await db.select().from(staff).where(eq(staff.tenantId, tenant.id));
    if (existingStaff.length === 0 && branchMain && branchTest) {
      const newStaff = await db.insert(staff).values([
        { tenantId: tenant.id, branchId: branchMain.id, name: 'Ana Gomez', email: 'ana@zyncspa.com' },
        { tenantId: tenant.id, branchId: branchMain.id, name: 'Carlos Ruiz', email: 'carlos@zyncspa.com' },
        { tenantId: testTenant.id, branchId: branchTest.id, name: 'Tester Senior', email: 'tester@test.com' },
      ]).returning();

      await db.insert(staffAssignments).values(
        newStaff.map(s => ({
          tenantId: s.tenantId,
          staffId: s.id,
          branchId: s.branchId!,
          startTime: '08:00',
          endTime: '18:00',
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }))
      );
      console.log('✅ Staff y disponibilidad configurados');
    }

    // 4. Servicios (Solo si no hay servicios)
    const existingServices = await db.select().from(services).where(eq(services.tenantId, tenant.id));
    if (existingServices.length === 0) {
      const servicesData = [
        { 
          name: 'Corte y Lavado Spa Premium', 
          durationMinutes: 45, 
          price: '20.00', 
          includes: ["Lavado profundo", "Masaje", "Corte", "Secado"], 
          excludes: ["Coloración"] 
        },
        { 
          name: 'Manicura Acrílica Luxury', 
          durationMinutes: 60, 
          price: '25.00', 
          includes: ["Limpieza", "Tips", "Esmaltado"], 
          excludes: ["Retiro de otro salón"] 
        },
      ];

      await db.insert(services).values([
        ...servicesData.map(s => ({ ...s, tenantId: tenant.id })),
        ...servicesData.map(s => ({ ...s, tenantId: testTenant.id })),
      ]);
      console.log('✅ Servicios registrados');
    }

    console.log('🚀 ¡Seed completado con éxito! El entorno está listo y tus datos preservados.');
  } catch (error) {
    console.error('❌ Hubo un error poblaciondo la base de datos:', error);
  } finally {
    process.exit(0);
  }
}

main();

