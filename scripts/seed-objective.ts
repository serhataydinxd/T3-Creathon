import "dotenv/config";

import { closeDatabase } from "../server/db/client";
import { syncOutcomes } from "../server/domain/outcome-store";
import { syncTopicOutcomeMappings, syncTopics } from "../server/domain/topic-store";
import { syncCentres } from "../server/domain/centre-store";

/**
 * The release-time content sync, run by the migration task on every deploy
 * (Dockerfile: `npm run db:release`).
 *
 * All three registries land here rather than only in `db:seed`, because
 * `db:seed` also creates demo accounts and is never run against staging.
 * Anything the application needs rows for in order to function has to be in
 * this path: the catalogue was briefly not, which would have failed a save in
 * production while every local test passed.
 *
 * Order matters. Mappings reference both a topic and an outcome, so those are
 * synced first.
 */
try {
  const codes = await syncOutcomes();
  const topicCount = await syncTopics();
  const mappingCount = await syncTopicOutcomeMappings();
  const centreCount = await syncCentres();
  console.info(`Upserted ${codes.length} MEB outcome(s): ${codes.join(", ")}.`);
  console.info(`Upserted ${topicCount} workshop topic(s).`);
  console.info(`Linked ${mappingCount} topic-outcome mapping(s), all pending verification.`);
  console.info(`Upserted ${centreCount} centre(s) with published facility claims.`);
} finally {
  await closeDatabase();
}
