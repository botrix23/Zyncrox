import { db } from "../src/db";
import { staffAssignments } from "../src/db/schema";
import { isNull, and } from "drizzle-orm";

async function main() {
  console.log("🚀 Iniciando backfill de asignaciones permanentes...");
  
  try {
    const result = await db
      .update(staffAssignments)
      .set({ isPermanent: true })
      .where(
        and(
          isNull(staffAssignments.startDate),
          isNull(staffAssignments.endDate)
        )
      )
      .returning({ id: staffAssignments.id });

    console.log(`✅ Se actualizaron ${result.length} asignaciones como permanentes.`);
  } catch (error) {
    console.error("❌ Error en el backfill:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
