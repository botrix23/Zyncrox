
const postgres = require('postgres');
const connectionString = 'postgresql://postgres.kvgkjjqttxzqiiqtvbxo:DeiRaKmacPX0xkaN@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

async function listTenants() {
  const sql = postgres(connectionString);
  try {
    const tenants = await sql`SELECT id, name, slug FROM tenants`;
    console.log(JSON.stringify(tenants, null, 2));
    
    const latestBookings = await sql`SELECT id, tenant_id, customer_name, customer_email, start_time FROM bookings ORDER BY created_at DESC LIMIT 5`;
    console.log("Latest bookings:");
    console.log(JSON.stringify(latestBookings, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

listTenants();
