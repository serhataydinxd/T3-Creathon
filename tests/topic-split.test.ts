import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { topicSlug } from "@/server/domain/topic-store";
import { CURRICULUM, OUTCOME_IDS } from "@/server/content/curriculum";
import { CATALOGUE_ENTRIES } from "@/server/content/catalogue";

/**
 * A Bilim Türkiye workshop topic and a MEB learning outcome are different
 * things: the topic is the product's identity, the outcome an optional claim
 * about it. They were briefly the same table, which let a published catalogue
 * topic be persisted under a synthetic BT.* code as though it carried
 * curriculum authority. These assertions keep them apart.
 */
describe("topic identity", () => {
  it("names a catalogue topic by its catalogue entry", () => {
    const entry = CATALOGUE_ENTRIES[0];
    expect(topicSlug({ catalogueEntryId: entry.id })).toBe(entry.id);
  });

  it("namespaces an unlisted İMKÂN topic so it cannot collide with a catalogue id", () => {
    expect(topicSlug({ catalogueEntryId: null, outcomeId: "sustainable-life" })).toBe(
      "imkan:sustainable-life",
    );
  });

  it("refuses a topic with no identity at all", () => {
    expect(() => topicSlug({ catalogueEntryId: null })).toThrow(/TOPIC_HAS_NO_IDENTITY/);
  });

  it("gives every corpus topic exactly one slug, and never a duplicate", () => {
    const slugs = OUTCOME_IDS.map((outcomeId) =>
      topicSlug({ catalogueEntryId: CURRICULUM[outcomeId].catalogueEntryId, outcomeId }),
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("the migration that separates them", () => {
  const dir = new URL("../server/db/migrations/", import.meta.url);
  // Only the migration this change introduces. Earlier ones legitimately
  // dropped columns; the additive constraint is about not breaking packages
  // that are already saved, which is a property of the new step alone.
  const latest = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .at(-1)!;
  const sql = readFileSync(new URL(latest, dir), "utf8");

  it("is additive: it creates the new tables without dropping anything", () => {
    expect(sql).toContain('CREATE TABLE "topics"');
    expect(sql).toContain('CREATE TABLE "topic_outcome_mappings"');
    // Saved packages must keep reading, so nothing may be dropped or renamed.
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP COLUMN/i);
  });

  it("lets a run reference a topic that has no curriculum outcome", () => {
    expect(sql).toContain('ALTER TABLE "generation_runs" ALTER COLUMN "objective_id" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "generation_runs" ADD COLUMN "topic_id" uuid');
  });

  it("marks the synthetic rows rather than deleting rows other tables point at", () => {
    expect(sql).toContain("UPDATE \"objectives\" SET \"kind\" = 'legacy_catalogue_topic'");
    expect(sql).not.toMatch(/DELETE FROM "objectives"/i);
  });
});

describe("no synthetic code reaches a reader", () => {
  it("never renders a BT.* technical code in the interface", () => {
    // The lock card shows objective.code. For a topic with no mapping that is
    // the theme's short label; a BT.* string there would read as a MEB code.
    const sources = ["../server/domain/generator.ts", "../components/workshop-lab.tsx"].map(
      (path) => readFileSync(new URL(path, import.meta.url), "utf8"),
    );
    for (const source of sources) expect(source).not.toMatch(/["'`]BT\./);
  });

  it("keeps every corpus mapping unverified until a human checks it", () => {
    // All seven were transcribed from unit pages by a model, not verified.
    for (const outcomeId of OUTCOME_IDS) {
      const mapping = CURRICULUM[outcomeId].curriculumMapping;
      if (!mapping) continue;
      expect(mapping.verification).toBe("unverified");
    }
  });
});
