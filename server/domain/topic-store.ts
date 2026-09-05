import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { topicOutcomeMappings, topics } from "@/server/db/schema";
import {
  CATALOGUE_ENTRIES,
  CATALOGUE_THEMES,
  getCatalogueEntry,
  isCatalogueEntryId,
} from "@/server/content/catalogue";
import { CURRICULUM, OUTCOME_IDS, type OutcomeId } from "@/server/content/curriculum";
import { outcomeContentHash, requireOutcomeRowId } from "./outcome-store";

/**
 * The bridge between the topic registries in code and the `topics` table.
 *
 * A topic is the product's identity — Bilim Türkiye theme, cohort and title —
 * and is deliberately not an entry in `objectives`. That table means "official
 * curriculum outcome", and a published workshop topic is not one; conflating
 * them is what previously let a catalogue topic be persisted under a synthetic
 * `BT.*` code as though it had curriculum authority.
 */

/**
 * Stable key for a topic row.
 *
 * A catalogue topic is identified by its catalogue entry id. An İMKÂN-authored
 * topic the catalogue does not list gets an `imkan:` prefix, so the two
 * namespaces can never collide and the origin is legible in the row itself.
 */
export function topicSlug(input: { catalogueEntryId: string | null; outcomeId?: OutcomeId }): string {
  if (input.catalogueEntryId) return input.catalogueEntryId;
  if (!input.outcomeId) throw new Error("TOPIC_HAS_NO_IDENTITY");
  return `imkan:${input.outcomeId}`;
}

type TopicRow = typeof topics.$inferInsert;

function catalogueRow(entryId: string): TopicRow {
  const entry = getCatalogueEntry(entryId);
  // An authored topic claims a catalogue entry; the row records which, so the
  // corpus link survives outside the code registries.
  const authored = OUTCOME_IDS.find((id) => CURRICULUM[id].catalogueEntryId === entry.id);
  return {
    slug: entry.id,
    source: "catalogue",
    catalogueEntryId: entry.id,
    outcomeId: authored ?? null,
    domainId: entry.domainId,
    cohort: entry.cohort,
    title: entry.title,
    sourceUrl: CATALOGUE_THEMES[entry.domainId].url,
  };
}

function unlistedRow(outcomeId: OutcomeId): TopicRow {
  const topic = CURRICULUM[outcomeId];
  return {
    slug: topicSlug({ catalogueEntryId: null, outcomeId }),
    source: "imkan",
    catalogueEntryId: null,
    outcomeId,
    domainId: topic.domainId,
    cohort: topic.cohort,
    title: topic.title,
    sourceUrl: CATALOGUE_THEMES[topic.domainId].url,
  };
}

/**
 * Upserts every published catalogue topic and every authored topic the
 * catalogue does not list. Idempotent, and run at release time so a deployed
 * environment can reference a topic the moment its code knows about it.
 */
export async function syncTopics(): Promise<number> {
  const db = getDb();
  const rows = [
    ...CATALOGUE_ENTRIES.map((entry) => catalogueRow(entry.id)),
    ...OUTCOME_IDS.filter((id) => CURRICULUM[id].catalogueEntryId === null).map(unlistedRow),
  ];
  for (const row of rows) {
    await db.insert(topics).values(row).onConflictDoUpdate({ target: topics.slug, set: row });
  }
  return rows.length;
}

/**
 * Records which curriculum outcome an authored topic maps onto.
 *
 * Written as unverified, because that is what the corpus says: the codes were
 * transcribed from unit pages and no human has checked them. The mapping is a
 * claim about a topic, never part of its identity, so it lives in its own
 * table and can be verified — or withdrawn — without touching the topic.
 */
export async function syncTopicOutcomeMappings(): Promise<number> {
  const db = getDb();
  let linked = 0;
  for (const outcomeId of OUTCOME_IDS) {
    const topic = CURRICULUM[outcomeId];
    const mapping = topic.curriculumMapping;
    if (!mapping) continue;
    const [topicRow] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.slug, topicSlug({ catalogueEntryId: topic.catalogueEntryId, outcomeId })))
      .limit(1);
    if (!topicRow) throw new Error(`TOPIC_NOT_SEEDED:${outcomeId}`);
    const objectiveId = await requireOutcomeRowId(db, outcomeId);
    const row = {
      topicId: topicRow.id,
      objectiveId,
      verified: mapping.verification === "verified",
      sourceReference: mapping.source.reference ?? mapping.source.document,
    };
    await db
      .insert(topicOutcomeMappings)
      .values(row)
      .onConflictDoUpdate({
        target: [topicOutcomeMappings.topicId, topicOutcomeMappings.objectiveId],
        // Verification state is owned by whoever checked it, so an upsert must
        // not silently reset a human's verification back to the registry's.
        set: { sourceReference: row.sourceReference },
      });
    linked += 1;
  }
  return linked;
}

/** Content hash of an outcome, re-exported so callers need one import. */
export { outcomeContentHash };

/**
 * Row id for the topic a profile selected, whether authored or a catalogue
 * topic being drafted. Fails by name rather than by foreign-key violation when
 * the registries have outrun the seed.
 */
export async function requireTopicRowId(
  tx: { select: ReturnType<typeof getDb>["select"] },
  input: { outcomeId: OutcomeId | null; proposalEntryId: string | null },
): Promise<string> {
  let slug: string;
  if (input.proposalEntryId) {
    if (!isCatalogueEntryId(input.proposalEntryId)) {
      throw new Error(`UNKNOWN_CATALOGUE_ENTRY:${input.proposalEntryId}`);
    }
    slug = input.proposalEntryId;
  } else if (input.outcomeId) {
    const topic = CURRICULUM[input.outcomeId];
    slug = topicSlug({ catalogueEntryId: topic.catalogueEntryId, outcomeId: input.outcomeId });
  } else {
    throw new Error("NO_TOPIC_SELECTED");
  }
  const [row] = await tx.select({ id: topics.id }).from(topics).where(eq(topics.slug, slug)).limit(1);
  if (!row) throw new Error("TOPIC_NOT_SEEDED");
  return row.id;
}

/**
 * The curriculum outcome row a run should reference, if any.
 *
 * Null is the normal answer: a catalogue topic has no learning outcome behind
 * it, and inventing one is the exact confusion the split removes.
 */
export async function resolveOutcomeRowId(
  tx: { select: ReturnType<typeof getDb>["select"] },
  input: { outcomeId: OutcomeId | null; proposalEntryId: string | null },
): Promise<string | null> {
  if (input.proposalEntryId || !input.outcomeId) return null;
  if (!CURRICULUM[input.outcomeId].curriculumMapping) return null;
  return requireOutcomeRowId(tx, input.outcomeId);
}
