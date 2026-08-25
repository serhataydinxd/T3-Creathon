import "dotenv/config";

import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../server/auth/password";
import { closeDatabase, getDb } from "../server/db/client";
import { users } from "../server/db/schema";
import { parseBootstrapManagerInput } from "../server/domain/bootstrap-manager";

const input = parseBootstrapManagerInput(process.env);
const passwordHash = await hashPassword(input.password);

try {
  const manager = await getDb().transaction(async (tx) => {
    // Prevent two one-off bootstrap tasks from racing on an empty database.
    await tx.execute(sql`select pg_advisory_xact_lock(1229802830)`);

    const existingManager = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "manager"))
      .limit(1);
    if (existingManager.length > 0) {
      throw new Error("A manager already exists; bootstrap is intentionally single-use.");
    }

    const inserted = await tx
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        role: "manager",
        status: "active",
        roleAssignedAt: new Date(),
      })
      .returning({ id: users.id, email: users.email });
    return inserted[0];
  });

  console.info(`Created the initial manager account: ${manager.email}`);
} finally {
  await closeDatabase();
}
