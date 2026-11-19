import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function catalogDb() {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the catalog");
  const pool = new pg.Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 10_000 });
  if (process.env.VERCEL) attachDatabasePool(pool);
  db = drizzle(pool, { schema });
  return db;
}
