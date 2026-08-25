import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import * as schema from "./schema";

type ImkanDatabase = NodePgDatabase<typeof schema>;
type GlobalDatabase = {
  imkanDb?: ImkanDatabase;
  imkanDriver?: Pool | PGlite;
  imkanDriverType?: "node-pg" | "pglite";
};

const globalForDatabase = globalThis as unknown as GlobalDatabase;

export function resolveDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Database configuration is incomplete. Set DATABASE_URL or: ${missing.join(", ")}.`,
    );
  }

  const username = encodeURIComponent(env.DB_USER!);
  const password = encodeURIComponent(env.DB_PASSWORD!);
  const database = encodeURIComponent(env.DB_NAME!);
  const port = env.DB_PORT ?? "5432";
  return `postgresql://${username}:${password}@${env.DB_HOST}:${port}/${database}`;
}

export function resolveDatabaseSsl(
  env: Readonly<Record<string, string | undefined>> = process.env,
  readCertificate: (path: string, encoding: BufferEncoding) => string = readFileSync,
) {
  if (env.DATABASE_SSL !== "true") return undefined;

  if (!env.DATABASE_CA_CERT) {
    throw new Error("DATABASE_CA_CERT is required when DATABASE_SSL=true.");
  }

  return {
    ca: readCertificate(env.DATABASE_CA_CERT, "utf8"),
    rejectUnauthorized: true as const,
  };
}

function initializeDatabase() {
  const connectionString = resolveDatabaseUrl();

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
    ssl: resolveDatabaseSsl(),
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
