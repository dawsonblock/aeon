import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let pgDrizzleInstance: any = null;
let pgConnectionChecked = false;
let isPgAvailable = false;

export function getPgClient() {
  if (pgConnectionChecked) {
    return pgDrizzleInstance;
  }

  pgConnectionChecked = true;
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log("DATABASE_URL is not set. Operating in high-reliability Local File Storage mode.");
    return null;
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 2000, // rapid fallback
    });

    pgDrizzleInstance = drizzle(pool, { schema });
    isPgAvailable = true;
    console.log("Drizzle Connected successfully to PostgreSQL database.");
    return pgDrizzleInstance;
  } catch (err) {
    console.error("PostgreSQL connection failed. Emulated Local Storage active:", err);
    isPgAvailable = false;
    return null;
  }
}

export function isPg() {
  getPgClient();
  return isPgAvailable;
}
