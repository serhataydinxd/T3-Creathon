import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "content_expert" | "pedagogue" | "educator" | "manager";
};

const COOKIE_NAME = "imkan_session";
const SESSION_DAYS = 7;

function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getDb().insert(sessions).values({ userId, tokenHash: digestToken(token), expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await getDb().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, digestToken(token)));
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await getDb()
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, digestToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(sessions.revokedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  const user = rows[0];
  if (!user || !user.role || user.status !== "active") return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: AuthUser["role"][]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?error=forbidden");
  return user;
}
