import { db } from "../src/db";
import { bookings, tenants, surveyQuestions, staff, branches, services } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { addMinutes, subDays } from "date-fns";

async function main() {
  const slug = "zyncsalon-spa";
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug)
  });

  if (!tenant) {
    console.error("No se encontró el tenant principal (zyncsalon-spa).");
    return;
  }

  // 1. Activar reseñas si están desactivadas
  if (!tenant.reviewsEnabled) {
    await db.update(tenants).set({ reviewsEnabled: true }).where(eq(tenants.id, tenant.id));
    console.log(`✅ Reseñas activadas para el tenant: ${tenant.name}`);
  } else {
    console.log(`ℹ️ Las reseñas ya estaban activadas para: ${tenant.name}`);
  }

  // 2. Verificar preguntas
  const questions = await db.query.surveyQuestions.findMany({
    where: and(eq(surveyQuestions.tenantId, tenant.id), eq(surveyQuestions.isActive, true))
  });

  if (questions.length === 0) {
    console.log("⚠️ No hay preguntas activas, creando preguntas por defecto...");
    await db.insert(surveyQuestions).values([
      {
        tenantId: tenant.id,
        questionText: "¿Cómo calificarías la atención?",
        questionType: "STARS",
        category: "STAFF",
        isRequired: true,
        sortOrder: 0
      },
      {
        tenantId: tenant.id,
        questionText: "¿Recomendarías nuestro servicio?",
        questionType: "NPS",
        category: "BUSINESS",
        isRequired: true,
        sortOrder: 1
      }
    ]);
  }

  // 3. Obtener datos para crear citas (sucursal, servicio, staff)
  const branch = await db.query.branches.findFirst({ where: eq(branches.tenantId, tenant.id) });
  const service = await db.query.services.findFirst({ where: eq(services.tenantId, tenant.id) });
  const staffMember = await db.query.staff.findFirst({ where: eq(staff.tenantId, tenant.id) });

  if (!branch || !service || !staffMember) {
    console.error("Faltan datos base (sucursal, servicio o staff) para crear citas de prueba.");
    return;
  }

  // 4. Crear 3 citas de prueba
  console.log("🏗️ Creando citas de prueba...");
  const testers = ["Ana García (Test)", "Carlos Pérez (Test)", "Lucia Méndez (Test)"];
  const now = new Date();

  const createdBookings = [];
  for (let i = 0; i < testers.length; i++) {
    const [newBooking] = await db.insert(bookings).values({
      tenantId: tenant.id,
      branchId: branch.id,
      serviceId: service.id,
      staffId: staffMember.id,
      customerName: testers[i],
      customerEmail: `test${i}@example.com`,
      startTime: subDays(now, i + 1),
      endTime: addMinutes(subDays(now, i + 1), 60),
      status: "FINALIZADA"
    }).returning();
    createdBookings.push(newBooking);
  }

  console.log("\n🚀 URLS DE PRUEBA ACTIVADAS:");
  createdBookings.forEach((b, idx) => {
    console.log(`${testers[idx]}: http://localhost:3000/es/review/${b.id}`);
  });
}

main().catch(console.error);
