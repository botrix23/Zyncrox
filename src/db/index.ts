import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://zyncslot_user:zyncslot_password@localhost:5432/zyncslot_db';

// El driver de base de datos
const client = postgres(connectionString);

// Exportamos la instancia de la base de datos
export const db = drizzle(client, { schema });
