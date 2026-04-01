import { db } from "../src/db";
import { staff, staffAssignments } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🛠️ Corrigiendo asignaciones de staff...");
  const allStaff = await db.query.staff.findMany({ with: { assignments: true } });

  for (const s of allStaff) {
    if (s.assignments.length === 1 && !s.assignments[0].isPermanent) {
      console.log(`✅ Marcando a ${s.name} como Permanente.`);
      await db.update(staffAssignments)
        .set({ 
          isPermanent: true, 
          startDate: null, 
          endDate: null 
        })
        .where(eq(staffAssignments.id, s.assignments[0].id));
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
