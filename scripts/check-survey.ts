import { db } from "../src/db";
import { surveyQuestions, tenants, bookings } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "zyncsalon-spa")
  });

  if (!tenant) {
      console.log("Tenant not found");
      return;
  }

  const questions = await db.query.surveyQuestions.findMany({
    where: eq(surveyQuestions.tenantId, tenant.id)
  });

  console.log("Tenant ID:", tenant.id);
  console.log("Reviews Enabled:", tenant.reviewsEnabled);
  console.log("Questions:", JSON.stringify(questions, null, 2));

  const bookingsResult = await db.query.bookings.findMany({
      where: eq(bookings.tenantId, tenant.id),
      limit: 3
  });

  console.log("Bookings:", JSON.stringify(bookingsResult, null, 2));
}

main().catch(console.error);
