import "dotenv/config";

import { createHash } from "node:crypto";
import { hashPassword } from "../server/auth/password";
import { closeDatabase, getDb } from "../server/db/client";
import { objectives, users } from "../server/db/schema";
import { DEMO_OBJECTIVE } from "../server/domain/fixtures";

const demoPassword = process.env.DEMO_PASSWORD ?? "I.mkanDemo!2026";
const passwordHash = await hashPassword(demoPassword);

const seedUsers = [
  { email: "content@imkan.test", name: "Selin Aksoy", role: "content_expert" as const },
  { email: "pedagogue@imkan.test", name: "Dr. Ece Yalın", role: "pedagogue" as const },
  { email: "educator@imkan.test", name: "Mert Kaya", role: "educator" as const },
  { email: "manager@imkan.test", name: "Deniz Arman", role: "manager" as const },
];

for (const seedUser of seedUsers) {
  await getDb()
    .insert(users)
    .values({ ...seedUser, passwordHash, status: "active", roleAssignedAt: new Date() })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: seedUser.name, role: seedUser.role, passwordHash, status: "active", roleAssignedAt: new Date() },
    });
}

await getDb()
  .insert(objectives)
  .values({
    code: DEMO_OBJECTIVE.code,
    canonicalText: DEMO_OBJECTIVE.canonicalText,
    sourceUrl: "https://mufredat.meb.gov.tr/",
    contentHash: createHash("sha256").update(DEMO_OBJECTIVE.canonicalText).digest("hex"),
    approved: true,
  })
  .onConflictDoNothing();

await closeDatabase();
console.info(`Seeded ${seedUsers.length} role accounts and the demo objective.`);
