import "dotenv/config";

import { hashPassword } from "../server/auth/password";
import { closeDatabase, getDb } from "../server/db/client";
import { users } from "../server/db/schema";
import { syncOutcomes } from "../server/domain/outcome-store";

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

const codes = await syncOutcomes();

await closeDatabase();
console.info(`Seeded ${seedUsers.length} role accounts and ${codes.length} approved outcome(s).`);
