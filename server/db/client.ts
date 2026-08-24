import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

type ImkanDatabase = NodePgDatabase<typeof schema>;
type GlobalDatabase = {
  imkanDb?: ImkanDatabase;
  imkanDriver?: Pool | PGlite;
  imkanDriverType?: "node-pg" | "pglite";
};

const globalForDatabase = globalThis as unknown as GlobalDatabase;

function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for authentication and persistence.");

  if (connectionString.startsWith("pglite:")) {
    const dataDir = connectionString.slice("pglite:".length) || "memory://";
    const client = new PGlite(dataDir);
    globalForDatabase.imkanDriver = client;
    globalForDatabase.imkanDriverType = "pglite";
    globalForDatabase.imkanDb = drizzlePglite({ client, schema }) as unknown as ImkanDatabase;
    return;
  }

  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 10 : 4,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  globalForDatabase.imkanDriver = pool;
  globalForDatabase.imkanDriverType = "node-pg";
  globalForDatabase.imkanDb = drizzleNodePg({ client: pool, schema });
}

export function getDb() {
  if (!globalForDatabase.imkanDb) initializeDatabase();
  return globalForDatabase.imkanDb!;
}

export async function migrateDatabase() {
  const db = getDb();
  if (globalForDatabase.imkanDriverType === "pglite") {
    await migratePglite(db as never, { migrationsFolder: "server/db/migrations" });
  } else {
    await migrateNodePg(db, { migrationsFolder: "server/db/migrations" });
  }
}

export async function closeDatabase() {
  const driver = globalForDatabase.imkanDriver;
  if (driver) {
    if (globalForDatabase.imkanDriverType === "pglite") await (driver as PGlite).close();
    else await (driver as Pool).end();
  }
  globalForDatabase.imkanDb = undefined;
  globalForDatabase.imkanDriver = undefined;
  globalForDatabase.imkanDriverType = undefined;
}
