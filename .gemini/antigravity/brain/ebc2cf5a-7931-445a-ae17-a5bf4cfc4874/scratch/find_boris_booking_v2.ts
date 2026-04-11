
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Define connection string from env or fallback
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.kvgkjjqttxzqiiqtvbxo:DeiRaKmacPX0xkaN@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

// Import schema from the actual project file (we might need to point to the compiled one or use tsx)
// Since we are running with tsx, we can import .ts files.

async function findBooking() {
  const client = postgres(connectionString, { max: 1 });
  const dbModule = require('../../../../src/db/schema'); // Path relative to the scratch file
  const drizzleModule = require('drizzle-orm');
  const { eq, or, ilike } = drizzleModule;
  
  const db = drizzle(client, { schema: dbModule });

  try {
    const results = await db.select().from(dbModule.bookings).where(
      or(
        eq(dbModule.bookings.customerEmail, 'boris90guardado@gmail.com'),
        ilike(dbModule.bookings.customerName, '%BORIS%')
      )
    );
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

findBooking();
