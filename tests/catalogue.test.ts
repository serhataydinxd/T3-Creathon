import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE,
  CATALOGUE_ENTRIES,
  CATALOGUE_THEMES,
  catalogueCoverage,
  catalogueSlug,
  getCatalogueEntry,
  isCatalogueEntryId,
} from "@/server/content/catalogue";
import {
  AUTHORED_BY_CATALOGUE_ENTRY,
  CURRICULUM,
  OUTCOME_IDS,
  UNLISTED_OUTCOME_IDS,
} from "@/server/content/curriculum";
import { AGE_COHORT_IDS, WORKSHOP_DOMAIN_IDS } from "@/server/content/domains";
import { buildProposalTopic } from "@/server/content/proposals";
import { DEFAULT_PROFILE, generateWorkshop, resolveTopic } from "@/server/domain/generator";
import { mergeAuthoredWorkshop } from "@/server/ai/authoring";
import { resourceProfileSchema } from "@/server/domain/schemas";

/**
 * The catalogue is transcribed from screenshots of a site that will change.
 * These assertions are what a future reader has instead of the screenshots:
 * they pin the shape that was actually observed, so a careless edit shows up
 * as a failure rather than as a quietly different programme.
 */
describe("published catalogue", () => {
  it("holds every theme and cohort the programme is organised by", () => {
    expect(Object.keys(CATALOGUE).sort()).toEqual([...WORKSHOP_DOMAIN_IDS].sort());
    for (const domainId of WORKSHOP_DOMAIN_IDS) {
      expect(Object.keys(CATALOGUE[domainId]).sort()).toEqual([...AGE_COHORT_IDS].sort());
    }
  });

  it("lists nine topics per tab, except Girişim 6-8 which lists three", () => {
    for (const domainId of WORKSHOP_DOMAIN_IDS) {
      for (const cohort of AGE_COHORT_IDS) {
        const expected = domainId === "entrepreneurship" && cohort === "6-8" ? 3 : 9;
        expect(CATALOGUE[domainId][cohort]).toHaveLength(expected);
      }
    }
    expect(CATALOGUE_ENTRIES).toHaveLength(183);
  });

  it("gives every entry a unique, URL-safe id", () => {
    const ids = CATALOGUE_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z-]+:[0-9-]+:[a-z0-9-]+$/);
  });

  it("slugs Turkish letters without leaving a combining dot behind", () => {
    // "İ".toLowerCase() is "i" + U+0307 in JavaScript, which would be invisible
    // in an id and break any lookup done on a hand-typed copy of it.
    expect(catalogueSlug("İkili Kod Sistemi")).toBe("ikili-kod-sistemi");
    expect(catalogueSlug("Işık ve Optik")).toBe("isik-ve-optik");
    for (const entry of CATALOGUE_ENTRIES) expect(entry.id).not.toMatch(/̇/);
  });

  it("repeats a title across cohorts without collapsing the two entries", () => {
    // "Ay" is listed for both 6-8 and 9-11 and they are different sessions.
    const ay = CATALOGUE_ENTRIES.filter((entry) => entry.title === "Ay");
    expect(ay).toHaveLength(2);
    expect(new Set(ay.map((entry) => entry.id)).size).toBe(2);
  });

  it("records a source page for every theme", () => {
    for (const domainId of WORKSHOP_DOMAIN_IDS) {
      expect(CATALOGUE_THEMES[domainId].url).toMatch(/^https:\/\/t3bilimturkiye\.org\//);
    }
  });

  it("resolves known ids and refuses unknown ones", () => {
    expect(isCatalogueEntryId(CATALOGUE_ENTRIES[0].id)).toBe(true);
    expect(isCatalogueEntryId("technology:12-14:not-a-topic")).toBe(false);
    expect(() => getCatalogueEntry("nope")).toThrow(/UNKNOWN_CATALOGUE_ENTRY/);
  });
});

describe("corpus linked to the catalogue", () => {
  it("points every authored topic at a real entry, or explicitly at none", () => {
    for (const outcomeId of OUTCOME_IDS) {
      const topic = CURRICULUM[outcomeId];
      if (topic.catalogueEntryId === null) continue;
      expect(isCatalogueEntryId(topic.catalogueEntryId)).toBe(true);
    }
  });

  it("files an authored topic under the same theme and cohort the catalogue does", () => {
    // The whole point of the link is that our taxonomy is theirs. A topic whose
    // domain disagrees with its catalogue entry is misfiled, which is exactly
    // the defect two topics carried before the catalogue existed.
    for (const outcomeId of OUTCOME_IDS) {
      const topic = CURRICULUM[outcomeId];
      if (!topic.catalogueEntryId) continue;
      const entry = getCatalogueEntry(topic.catalogueEntryId);
      expect({ id: outcomeId, domainId: topic.domainId, cohort: topic.cohort }).toEqual({
        id: outcomeId,
        domainId: entry.domainId,
        cohort: entry.cohort,
      });
    }
  });

  it("never claims one catalogue entry twice", () => {
    const claimed = OUTCOME_IDS.map((id) => CURRICULUM[id].catalogueEntryId).filter(Boolean);
    expect(new Set(claimed).size).toBe(claimed.length);
    expect(AUTHORED_BY_CATALOGUE_ENTRY.size).toBe(claimed.length);
  });

  it("counts coverage against the published programme, not against itself", () => {
    const coverage = catalogueCoverage(OUTCOME_IDS.map((id) => CURRICULUM[id]));
    expect(coverage.entriesTotal).toBe(183);
    expect(coverage.entriesAuthored).toBe(AUTHORED_BY_CATALOGUE_ENTRY.size);
    expect(coverage.entriesAuthored).toBeLessThan(coverage.entriesTotal);
    expect(coverage.unlistedTopics).toBe(UNLISTED_OUTCOME_IDS.length);
    // Every authored topic is either counted or explicitly unlisted.
    expect(coverage.entriesAuthored + coverage.unlistedTopics).toBe(OUTCOME_IDS.length);
  });
});

describe("drafting a session for an unauthored catalogue topic", () => {
  // Chosen because it is in the theme the corpus covers least: robotics and AI,
  // where nothing authored exists to lean on.
  const entryId = "technology:12-14:yapay-zeka";
  const profile = { ...DEFAULT_PROFILE, proposalEntryId: entryId };

  it("resolves to a proposal rather than falling back to an authored topic", () => {
    const resolved = resolveTopic(profile);
    expect(resolved.status).toBe("proposal");
    expect(resolved.outcomeId).toBeNull();
    expect(resolved.topic.title).toBe("Yapay Zeka");
  });

  it("produces a plan under exactly the same structural guarantees", () => {
    const plan = generateWorkshop(profile);
    expect(plan.stages).toHaveLength(5);
    expect(plan.stages.reduce((sum, stage) => sum + stage.minutes, 0)).toBe(
      profile.durationMinutes,
    );
    expect(plan.groupCount).toBe(Math.ceil(profile.classSize / profile.groupSize));
    expect(plan.generatorVersion).toBeTruthy();
  });

  it("locks the published topic name and attributes it to the catalogue page", () => {
    const plan = generateWorkshop(profile);
    expect(plan.title).toBe("Yapay Zeka");
    expect(plan.objective.locked).toBe(true);
    expect(plan.objective.source).toBe(CATALOGUE_THEMES.technology.url);
  });

  it("says on the plan that it is a proposal, not approved content", () => {
    const plan = generateWorkshop(profile);
    expect(plan.topicStatus).toBe("proposal");
    expect(plan.catalogueEntryId).toBe(entryId);
    const notice = plan.findings.find((finding) => finding.code === "UNAUTHORED_TOPIC_PROPOSAL");
    expect(notice?.severity).toBe("warning");
    expect(notice?.message).toContain("pedagog onayı");
  });

  it("never invents a curriculum mapping for a topic nobody has mapped", () => {
    const plan = generateWorkshop(profile);
    expect(plan.objective.canonicalText).not.toMatch(/^FB\.\d/);
    expect(plan.objective.code).not.toMatch(/^FB\.\d/);
  });

  it("costs nothing to acquire, because it only reaches for what is already there", () => {
    const plan = generateWorkshop(profile);
    expect(plan.costs?.acquisitionTry).toBe(0);
    for (const line of plan.materialPlan ?? []) expect(line.inInventory).toBe(true);
  });

  it("still runs when the trainer has nothing at all", () => {
    // A topic with no authored route must never be unplannable: the proposal
    // route requires nothing, so selection cannot fail.
    const bare = {
      ...profile,
      materials: [],
      hasElectricity: false,
      hasInternet: false,
      capabilities: [],
    };
    const plan = generateWorkshop(bare);
    expect(plan.stages).toHaveLength(5);
    expect(plan.materialPlan).toEqual([]);
    expect(plan.estimatedCostTry).toBe(0);
  });

  it("shares a tool across a group instead of buying one per child", () => {
    // The registry prices single items, so a blanket per-learner basis had a
    // thirty-child session claiming thirty pairs of scissors and thirty rolls
    // of tape. Only what every child personally uses scales with headcount.
    const plan = generateWorkshop({
      ...profile,
      materials: ["paper", "pencil", "scissors", "tape"],
    });
    const byKey = new Map((plan.materialPlan ?? []).map((line) => [line.key, line]));
    expect(byKey.get("paper")?.totalQuantity).toBe(profile.classSize);
    expect(byKey.get("pencil")?.totalQuantity).toBe(profile.classSize);
    expect(byKey.get("scissors")?.totalQuantity).toBe(plan.groupCount);
    expect(byKey.get("tape")?.totalQuantity).toBe(plan.groupCount);
  });

  it("adapts its material list to what the trainer actually marked", () => {
    const stocked = buildProposalTopic(entryId, ["paper", "pencil", "scissors", "tape", "ruler"]);
    const bare = buildProposalTopic(entryId, ["paper"]);
    expect(stocked.routes[0].materials.length).toBeGreaterThan(bare.routes[0].materials.length);
  });

  it("refuses to let the model rename the published topic", () => {
    const skeleton = generateWorkshop(profile);
    const merged = mergeAuthoredWorkshop(skeleton, {
      title: "Yapay Zekâ ile Süper Robotlar Atölyesi",
      adaptationSummary: "Eldeki malzemelerle uygulanabilir bir taslak oturum kurgulanır.",
      stages: skeleton.stages.map((stage) => ({
        key: stage.key,
        title: stage.title,
        teacherAction: stage.teacherAction,
        studentAction: stage.studentAction,
        evidence: stage.evidence,
        objectiveConnection: stage.objectiveConnection,
      })),
    });
    expect(merged.title).toBe("Yapay Zeka");
    // An authored topic keeps the existing behaviour: the model titles it.
    const authored = mergeAuthoredWorkshop(generateWorkshop(DEFAULT_PROFILE), {
      title: "Model tarafından yazılan başlık",
      adaptationSummary: "Eldeki malzemelerle uygulanabilir bir oturum kurgulanır.",
      stages: skeleton.stages.map((stage) => ({
        key: stage.key,
        title: stage.title,
        teacherAction: stage.teacherAction,
        studentAction: stage.studentAction,
        evidence: stage.evidence,
        objectiveConnection: stage.objectiveConnection,
      })),
    });
    expect(authored.title).toBe("Model tarafından yazılan başlık");
  });
});

/**
 * A proposal references an objectives row, so the catalogue has to be synced
 * wherever the application is deployed — not only where demo accounts are
 * created. The release script is what the migration task runs on every deploy;
 * this asserts the dependency rather than trusting a reader to notice it.
 */
describe("release-time seeding", () => {
  const release = readFileSync(new URL("../scripts/seed-objective.ts", import.meta.url), "utf8");

  it("syncs the published catalogue, not just the approved outcomes", () => {
    expect(release).toContain("syncCatalogueTopics");
    expect(release).toContain("syncOutcomes");
  });

  it("is the script the deployed migration task actually runs", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts["db:release"]).toContain("db:seed-objective");
    expect(readFileSync(new URL("../Dockerfile", import.meta.url), "utf8")).toContain("db:release");
  });
});

describe("proposal requests at the edge", () => {
  const base = {
    durationMinutes: 60,
    classSize: 30,
    groupSize: 5,
    budgetTry: 50,
    hardBudget: true,
    hasInternet: false,
    hasElectricity: false,
    materials: ["paper"],
    accessibilityNeeds: [],
  };

  it("accepts a published catalogue topic", () => {
    const parsed = resourceProfileSchema.parse({
      ...base,
      proposalEntryId: "design:9-11:makrome",
    });
    expect(parsed.proposalEntryId).toBe("design:9-11:makrome");
  });

  it("refuses a topic that is not on the catalogue", () => {
    expect(() =>
      resourceProfileSchema.parse({ ...base, proposalEntryId: "design:9-11:uydurma" }),
    ).toThrow();
  });

  it("leaves an ordinary request byte-identical to what it was before", () => {
    // The draft save re-parses the profile and compares a hash, so a field that
    // defaulted rather than stayed absent would reject every existing save.
    const parsed = resourceProfileSchema.parse(base);
    expect("proposalEntryId" in parsed).toBe(false);
  });
});
