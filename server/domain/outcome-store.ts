import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { objectives } from "@/server/db/schema";
import { CURRICULUM, OUTCOME_IDS, type OutcomeId } from "@/server/content/curriculum";
import { CATALOGUE_ENTRIES, CATALOGUE_THEMES, getCatalogueEntry } from "@/server/content/catalogue";
import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";

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

/**
 * The natural key for a published catalogue topic.
 *
 * Hashed over the entry id rather than the title because titles repeat across
 * cohorts — "Ay" is listed for both 6-8 and 9-11 — and two different sessions
 * must not collapse onto one row.
 */
export function catalogueContentHash(entryId: string): string {
  return createHash("sha256").update(`catalogue:${entryId}`).digest("hex");
}

/**
 * Upserts a row for every published catalogue topic, so a proposal drafted for
 * one has something to reference.
 *
 * These are deliberately `approved: false`. A catalogue entry is a topic Bilim
 * Türkiye publishes, not a session anyone has approved; the approval that
 * matters is the pedagogue's, and it happens in the review workflow.
 */
export async function syncCatalogueTopics(): Promise<number> {
  const db = getDb();
  for (const entry of CATALOGUE_ENTRIES) {
    const row = {
      code: `BT.${entry.domainId}.${entry.cohort}`,
      canonicalText: `${entry.title} — ${WORKSHOP_DOMAINS[entry.domainId].label}, ${AGE_COHORTS[entry.cohort].label}`,
      sourceUrl: CATALOGUE_THEMES[entry.domainId].url,
      contentHash: catalogueContentHash(entry.id),
      approved: false,
    };
    await db
      .insert(objectives)
      .values(row)
      .onConflictDoUpdate({ target: objectives.contentHash, set: row });
  }
  return CATALOGUE_ENTRIES.length;
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
 * Row id for whichever topic a profile actually asked for: an authored corpus
 * outcome, or a published catalogue topic being drafted. Kept here beside the
 * upserts so the read and the write agree on the natural key by construction.
 */
export async function requireTopicRowId(
  tx: { select: ReturnType<typeof getDb>["select"] },
  input: { outcomeId: OutcomeId | null; proposalEntryId: string | null },
): Promise<string> {
  if (input.proposalEntryId) {
    // Throws for an unknown id rather than falling back, because by this point
    // the schema has already accepted it: a miss here is a real inconsistency.
    const entry = getCatalogueEntry(input.proposalEntryId);
    const [row] = await tx
      .select({ id: objectives.id })
      .from(objectives)
      .where(eq(objectives.contentHash, catalogueContentHash(entry.id)))
      .limit(1);
    if (!row) throw new Error("CATALOGUE_TOPIC_NOT_SEEDED");
    return row.id;
  }
  if (!input.outcomeId) throw new Error("NO_TOPIC_SELECTED");
  return requireOutcomeRowId(tx, input.outcomeId);
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
