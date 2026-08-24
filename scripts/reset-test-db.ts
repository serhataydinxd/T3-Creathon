import "dotenv/config";

import { sql } from "drizzle-orm";
import { closeDatabase, getDb, migrateDatabase } from "../server/db/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
const safePglite = databaseUrl.startsWith("pglite:") && databaseUrl.includes("imkan-test");
const safePostgres = databaseUrl.startsWith("postgres") && new URL(databaseUrl).pathname === "/imkan_test";
if (!safePglite && !safePostgres) {
  throw new Error("Refusing to reset a database not explicitly named imkan-test/imkan_test.");
}

const db = getDb();
await migrateDatabase();
await db.execute(sql`TRUNCATE TABLE educator_feedback, version_transitions, reviews, workshop_versions, generation_stages, generation_runs, sessions, objectives, users RESTART IDENTITY CASCADE`);
await closeDatabase();
console.info("Test database reset complete. Run db:seed next.");
