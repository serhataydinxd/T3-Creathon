import "dotenv/config";

import { closeDatabase } from "../server/db/client";
import { syncCatalogueTopics, syncOutcomes } from "../server/domain/outcome-store";

/**
 * The release-time content sync, run by the migration task on every deploy
 * (Dockerfile: `npm run db:release`).
 *
 * Both registries land here rather than only in `db:seed`, because `db:seed`
 * also creates demo accounts and is never run against staging. Anything the
 * application needs rows for in order to function has to be in this path: the
 * catalogue was briefly not, which would have failed a proposal save in
 * production with CATALOGUE_TOPIC_NOT_SEEDED while every local test passed.
 */
try {
  const codes = await syncOutcomes();
  const catalogueTopics = await syncCatalogueTopics();
  console.info(`Upserted ${codes.length} approved outcome(s): ${codes.join(", ")}.`);
  console.info(`Upserted ${catalogueTopics} published catalogue topic(s).`);
} finally {
  await closeDatabase();
}
