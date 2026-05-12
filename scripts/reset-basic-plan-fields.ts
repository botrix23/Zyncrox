import { db } from "../src/db";
import { tenants, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const TARGET_EMAIL = "boris90alejandro@gmail.com";

async function main() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, TARGET_EMAIL),
    columns: { tenantId: true },
  });

  if (!user?.tenantId) {
    console.error(`No se encontró usuario con email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId),
    columns: { id: true, name: true, plan: true, heroSubtitle: true, theme: true },
  });

  console.log(`Tenant: ${tenant?.name} | Plan: ${tenant?.plan}`);
  console.log(`heroSubtitle actual: "${tenant?.heroSubtitle}"`);
  console.log(`theme actual: "${tenant?.theme}"`);

  await db.update(tenants)
    .set({
      heroSubtitle: null,
      theme: "light",
      emailBodyTemplate: null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, user.tenantId));

  console.log("✅ Campos resetados a valores por defecto del plan BASIC.");
}

main().catch(console.error).finally(() => process.exit(0));
