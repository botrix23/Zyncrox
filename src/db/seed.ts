import { db } from './index';
import { tenants, branches, staff, services, products } from './schema';

async function main() {
  console.log('🌱 Inicializando Seed de Datos Falsos en la BD...');
  
  try {
    // 1. Crear un Tenant Base (SaaS Client)
    const [tenant] = await db.insert(tenants).values({
      name: 'ZyncSalón Spa',
      timezone: 'America/El_Salvador',
    }).returning();
    
    console.log('✅ Tenant creado:', tenant.name);

    // 2. Crear una Sucursal Principal para este Tenant
    const [branchMain] = await db.insert(branches).values({
      tenantId: tenant.id,
      name: 'Surcursal Zona Rosa',
      businessHours: JSON.stringify({ open: '08:00', close: '18:00' }),
    }).returning();

    console.log('✅ Sucursal creada:', branchMain.name);

    // 3. Crear Equipo de Staff en la Sucursal
    const newStaff = await db.insert(staff).values([
      { tenantId: tenant.id, branchId: branchMain.id, name: 'Ana Gomez', email: 'ana@zyncspa.com' },
      { tenantId: tenant.id, branchId: branchMain.id, name: 'Carlos Ruiz', email: 'carlos@zyncspa.com' },
    ]).returning();

    console.log(`✅ ${newStaff.length} miembros del staff creados`);

    // 4. Crear Servicios Ofrecidos por el Tenant
    const newServices = await db.insert(services).values([
      { tenantId: tenant.id, name: 'Corte y Lavado Spa', durationMinutes: 45, price: '20.00', includes: ["Lavado de cabello profundo", "Corte con diseño", "Aplicación de cera premium"], excludes: ["Masaje capilar"] },
      { tenantId: tenant.id, name: 'Matizado y Decoloración', durationMinutes: 120, price: '75.00', includes: ["Consulta de tono", "Decoloración profesional", "Matizado Ice/Warm", "Secado incluido"], excludes: ["Corte de cabello extremo", "Tratamientos previos de queratina requeridos"] },
      { tenantId: tenant.id, name: 'Manicura Acrílica', durationMinutes: 60, price: '25.00', includes: ["Remoción de cutícula", "Acrílico largo medio", "Esmaltado gel", "Masaje de manos"], excludes: ["Retiro de acrílico previo", "Diseños 3D o joyería (costo extra)"] },
    ]).returning();

    console.log(`✅ ${newServices.length} servicios registrados`);

    // 5. Crear Productos Físicos en Venta
    await db.insert(products).values([
      { tenantId: tenant.id, name: 'Shampoo Protección Color', price: '25.00', stock: 50 },
      { tenantId: tenant.id, name: 'Cera Moldeadora Matte', price: '12.50', stock: 35 },
    ]);

    console.log('✅ Productos registrados');

    console.log('🚀 ¡Seed completado con éxito! Tienes información lista para el UI.');
  } catch (error) {
    console.error('❌ Hubo un error poblaciondo la base de datos:', error);
  } finally {
    process.exit(0);
  }
}

main();
