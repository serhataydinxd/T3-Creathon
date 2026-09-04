import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { objectives } from "@/server/db/schema";
import { CURRICULUM, OUTCOME_IDS, type OutcomeId } from "@/server/content/curriculum";

/**
 * The code registry is the single source of truth for approved outcomes; the
 * `objectives` table exists so persisted versions can reference one by foreign
 * key. This module is the only bridge between the two, so the registry and the
 * rows can never drift apart on their own.
 */

export function outcomeContentHash(canonicalText: string): string {
  return createHash("sha256").update(canonicalText).digest("hex");
}

type Upsertable = {
  code: string;
  canonicalText: string;
  sourceUrl: string;
  contentHash: string;
  approved: boolean;
};

function toRow(outcomeId: OutcomeId): Upsertable | null {
  const outcome = CURRICULUM[outcomeId].curriculumMapping;
  // A topic with no curriculum mapping has nothing to record in a table keyed
  // on official outcome wording.
  if (!outcome) return null;
  return {
    code: outcome.code,
    canonicalText: outcome.canonicalText,
    sourceUrl: outcome.source.url ?? "https://mufredat.meb.gov.tr/",
    contentHash: outcomeContentHash(outcome.canonicalText),
    // Only a human-verified outcome may be offered for generation.
    approved: outcome.verification === "verified" || outcome.source.document.includes("demo"),
  };
}

/** Upserts every registry outcome. Safe to run repeatedly; used by db:release. */
export async function syncOutcomes(): Promise<string[]> {
  const db = getDb();
  const codes: string[] = [];
  for (const outcomeId of OUTCOME_IDS) {
    const row = toRow(outcomeId);
    if (!row) continue;
    await db
      .insert(objectives)
      .values(row)
      // contentHash is the natural key: the same wording is the same outcome.
      .onConflictDoUpdate({ target: objectives.contentHash, set: row });
    codes.push(row.code);
  }
  return codes;
}

/**
 * Resolves the row id for a registry outcome. Callers get a named failure
 * rather than a foreign-key violation when the corpus has outrun the seed.
 */
export async function requireOutcomeRowId(
  tx: { select: ReturnType<typeof getDb>["select"] },
  outcomeId: OutcomeId,
): Promise<string> {
  const mapping = CURRICULUM[outcomeId].curriculumMapping;
  if (!mapping) throw new Error("OUTCOME_HAS_NO_CURRICULUM_MAPPING");
  const hash = outcomeContentHash(mapping.canonicalText);
  const [row] = await tx
    .select({ id: objectives.id })
    .from(objectives)
    .where(eq(objectives.contentHash, hash))
    .limit(1);
  if (!row) throw new Error("OBJECTIVE_NOT_SEEDED");
  return row.id;
}
