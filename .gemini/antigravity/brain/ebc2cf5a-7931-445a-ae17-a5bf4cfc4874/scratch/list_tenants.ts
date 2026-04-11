
import { db } from './src/db';
import { tenants } from './src/db/schema';

async function listTenants() {
  const result = await db.select().from(tenants);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

listTenants();
