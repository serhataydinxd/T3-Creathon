import "dotenv/config";

import { closeDatabase, migrateDatabase } from "../server/db/client";

await migrateDatabase();
await closeDatabase();
console.info("Database migrations applied.");
