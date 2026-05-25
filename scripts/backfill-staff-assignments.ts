/**
 * backfill-staff-assignments.ts
 *
 * Migración de datos históricos (Caso 6 — deuda técnica pre-feature).
 *
 * Contexto: la tabla `staff_assignments` se creó después de que existían
 * registros de staff. Los staff creados antes del feature no tienen ningún
 * registro en esa tabla. El filtro `displayStaff` del widget tiene un
 * "legacy fallback" (if !s.assignments return true) que los deja pasar,
 * pero el comportamiento correcto es que tengan una asignación permanente.
 *
 * Este script:
 *  1. Obtiene todos los staff activos que no tienen ningún registro en
 *     `staff_assignments`.
 *  2. Crea una asignación permanente usando el campo `branchId` del staff
 *     (sucursal base legacy) con horarios completos (lun–dom).
 *
 * Ejecución:
 *   npx tsx scripts/backfill-staff-assignments.ts
 */

import { db } from "../src/db";
import { staff, staffAssignments } from "../src/db/schema";

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

async function main() {
  console.log('🚀 Iniciando migración de asignaciones de staff...\n');

  const allStaff = await db.query.staff.findMany({
    with: { assignments: true },
  });

  const unassigned = allStaff.filter(s => s.assignments.length === 0);

  console.log(`📊 Staff total: ${allStaff.length}`);
  console.log(`🔍 Sin asignaciones (a migrar): ${unassigned.length}\n`);

  if (unassigned.length === 0) {
    console.log('✅ Todos los staff ya tienen asignaciones. Nada que migrar.');
    process.exit(0);
  }

  let migrated = 0;
  let skipped = 0;

  for (const s of unassigned) {
    if (!s.branchId) {
      console.warn(`⚠️  ${s.name} (${s.id}) no tiene branchId — omitiendo.`);
      skipped++;
      continue;
    }

    await db.insert(staffAssignments).values({
      tenantId: s.tenantId,
      staffId: s.id,
      branchId: s.branchId,
      isPermanent: true,
      startDate: null,
      endDate: null,
      startTime: '08:00',
      endTime: '20:00',
      daysOfWeek: ALL_DAYS,
    });

    console.log(`✅ ${s.name} → sucursal ${s.branchId} (asignación permanente creada)`);
    migrated++;
  }

  console.log(`\n📦 Migración completa: ${migrated} creados, ${skipped} omitidos.`);
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error en migración:', e);
  process.exit(1);
});
