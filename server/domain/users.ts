import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/session";

export async function listPendingUsers(actor: AuthUser) {
  if (actor.role !== "manager") throw new Error("FORBIDDEN");
  return getDb()
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.status, "pending"))
    .orderBy(asc(users.createdAt));
}

export async function activateUser(
  actor: AuthUser,
  targetId: string,
  role: AuthUser["role"],
) {
  if (actor.role !== "manager") throw new Error("FORBIDDEN");
  const updated = await getDb()
    .update(users)
    .set({ status: "active", role, roleAssignedBy: actor.id, roleAssignedAt: new Date() })
    .where(eq(users.id, targetId))
    .returning({ id: users.id });
  if (updated.length === 0) throw new Error("USER_NOT_FOUND");
}
