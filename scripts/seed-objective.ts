import "dotenv/config";

import { closeDatabase } from "../server/db/client";
import { syncOutcomes } from "../server/domain/outcome-store";

try {
  const codes = await syncOutcomes();
  console.info(`Upserted ${codes.length} approved outcome(s): ${codes.join(", ")}.`);
} finally {
  await closeDatabase();
}
