import "dotenv/config";

import { createHash } from "node:crypto";
import { closeDatabase, getDb } from "../server/db/client";
import { objectives } from "../server/db/schema";
import { DEMO_OBJECTIVE } from "../server/domain/fixtures";

const contentHash = createHash("sha256")
  .update(DEMO_OBJECTIVE.canonicalText)
  .digest("hex");

try {
  await getDb()
    .insert(objectives)
    .values({
      code: DEMO_OBJECTIVE.code,
      canonicalText: DEMO_OBJECTIVE.canonicalText,
      sourceUrl: "https://mufredat.meb.gov.tr/",
      contentHash,
      approved: true,
    })
    .onConflictDoUpdate({
      target: objectives.contentHash,
      set: {
        code: DEMO_OBJECTIVE.code,
        canonicalText: DEMO_OBJECTIVE.canonicalText,
        sourceUrl: "https://mufredat.meb.gov.tr/",
        approved: true,
      },
    });
  console.info(`Upserted approved objective ${DEMO_OBJECTIVE.code}.`);
} finally {
  await closeDatabase();
}
