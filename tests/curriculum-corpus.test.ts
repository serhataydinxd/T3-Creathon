import { describe, expect, it } from "vitest";
import { AGE_COHORT_IDS, WORKSHOP_DOMAIN_IDS } from "@/server/content/domains";
import { FORMATS, FORMAT_IDS } from "@/server/content/formats";
import {
  CENTRES,
  CENTRE_IDS,
  VENUE_CAPABILITIES,
  VENUE_CAPABILITY_IDS,
  confirmedCapabilities,
  unavailableCapabilities,
  unknownCapabilities,
} from "@/server/content/venues";
import {
  ALL_ROUTES,
  CURRICULUM,
  OUTCOME_IDS,
  ROUTE_TIER_ORDER,
  STAGE_KEYS,
  getOutcomeContent,
  type OutcomeId,
} from "@/server/content/curriculum";
import {
  INVENTORY_PRESETS,
  INVENTORY_PRESET_IDS,
  MATERIALS,
  MATERIAL_IDS,
} from "@/server/content/materials";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";
import { evaluateEligibility, selectRoute } from "@/server/domain/routes";
import type { ResourceProfile } from "@/server/domain/types";

/**
 * Invariants every corpus entry must satisfy. These are the tests that make
 * adding an outcome safe: a new entry is covered the moment it is declared,
 * without anyone remembering to write bespoke assertions for it.
 */
describe("corpus invariants", () => {
  it("declares at least one outcome and one route each", () => {
    expect(OUTCOME_IDS.length).toBeGreaterThan(0);
    for (const outcomeId of OUTCOME_IDS) {
      expect(getOutcomeContent(outcomeId).routes.length).toBeGreaterThan(0);
    }
  });

  it.each(OUTCOME_IDS)("%s keeps an unconditional route so selection cannot fail", (outcomeId) => {
    // Without a route that demands nothing, a bare classroom would get no plan
    // at all, which is the opposite of the product's premise.
    const unconditional = getOutcomeContent(outcomeId).routes.filter((route) => {
      const { requiresElectricity, requiresInternet, requiredMaterials } = route.eligibility;
      return !requiresElectricity && !requiresInternet && (requiredMaterials ?? []).length === 0;
    });
    expect(unconditional.length).toBeGreaterThanOrEqual(1);
  });

  it.each(OUTCOME_IDS)("%s defines all five 5E stages", (outcomeId) => {
    const { baseStages } = getOutcomeContent(outcomeId);
    expect(Object.keys(baseStages).sort()).toEqual([...STAGE_KEYS].sort());
    for (const key of STAGE_KEYS) {
      const stage = baseStages[key];
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.objectiveConnection.length).toBeGreaterThan(20);
      expect(stage.materials.length).toBeGreaterThan(0);
    }
  });

  it("references only materials that exist in the catalogue", () => {
    for (const { outcomeId, route } of ALL_ROUTES) {
      for (const requirement of route.materials) {
        expect(MATERIAL_IDS, `${outcomeId}/${route.id}`).toContain(requirement.materialId);
        expect(requirement.quantity).toBeGreaterThan(0);
      }
      for (const materialId of route.eligibility.requiredMaterials ?? []) {
        expect(MATERIAL_IDS, `${outcomeId}/${route.id} eligibility`).toContain(materialId);
      }
    }
  });

  it("keeps route ids unique across the whole corpus", () => {
    const ids = ALL_ROUTES.map(({ route }) => route.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices every material with a usable figure", () => {
    for (const id of MATERIAL_IDS) {
      expect(MATERIALS[id].unitCostTry).toBeGreaterThanOrEqual(0);
      expect(MATERIALS[id].label.length).toBeGreaterThan(1);
    }
  });

  it("builds every inventory preset from real materials", () => {
    for (const presetId of INVENTORY_PRESET_IDS) {
      for (const materialId of INVENTORY_PRESETS[presetId].materials) {
        expect(MATERIAL_IDS).toContain(materialId);
      }
    }
  });
});

/**
 * The matrix: every outcome, against every inventory preset, with and without
 * power. A plan must always come out, always sum to the requested duration and
 * never silently invent a material the classroom does not have.
 */
describe("outcome × inventory matrix", () => {
  const scenarios = INVENTORY_PRESET_IDS.flatMap((presetId) =>
    [true, false].map((hasElectricity) => ({ presetId, hasElectricity })),
  );
  const cases = OUTCOME_IDS.flatMap((outcomeId) =>
    scenarios.map((scenario) => ({ outcomeId, ...scenario })),
  );

  it.each(cases)(
    "$outcomeId · $presetId · elektrik=$hasElectricity",
    ({ outcomeId, presetId, hasElectricity }) => {
      const profile: ResourceProfile = {
        ...DEFAULT_PROFILE,
        outcomeId,
        hasElectricity,
        materials: [...INVENTORY_PRESETS[presetId].materials],
        // Generous so the budget blocker does not mask route selection here.
        budgetTry: 100_000,
      };
      const plan = generateWorkshop(profile);

      expect(plan.outcomeId).toBe(outcomeId);
      expect(plan.routeId).toBeTruthy();
      expect(plan.stages).toHaveLength(5);
      expect(plan.stages.reduce((sum, stage) => sum + stage.minutes, 0)).toBe(
        profile.durationMinutes,
      );
      expect(plan.generatorVersion).toBeTruthy();

      // A chosen route must be one the classroom actually qualifies for.
      const chosen = getOutcomeContent(outcomeId as OutcomeId).routes.find(
        (route) => route.id === plan.routeId,
      );
      expect(chosen).toBeDefined();
      expect(evaluateEligibility(chosen!, profile)).toBeNull();

      // Every rejection carries a reason a teacher could act on.
      for (const rejection of plan.rejectedRoutes ?? []) {
        expect(rejection.reason.length).toBeGreaterThan(10);
        expect(rejection.routeName.length).toBeGreaterThan(2);
      }
    },
  );
});

describe("route selection", () => {
  it.each(OUTCOME_IDS)("%s offers its richest route to a fully stocked classroom", (outcomeId) => {
    const equipped = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId,
      hasElectricity: true,
      hasInternet: true,
      materials: [...INVENTORY_PRESETS.workshop.materials],
      capabilities: [...VENUE_CAPABILITY_IDS],
      // Nothing verified absent: a fully equipped venue has every facility, so
      // stating it here keeps the profile well-formed rather than leaning on
      // the domain's tie-break for contradictory input.
      unavailableCapabilities: [],
      budgetTry: 100_000,
    });
    const best = [...getOutcomeContent(outcomeId).routes].sort(
      (a, b) => ROUTE_TIER_ORDER.indexOf(a.tier) - ROUTE_TIER_ORDER.indexOf(b.tier),
    )[0];
    expect(equipped.routeId).toBe(best.id);
    expect(equipped.rejectedRoutes).toEqual([]);
  });

  it("explains the rejection instead of silently downgrading", () => {
    const bare = generateWorkshop(DEFAULT_PROFILE);
    expect(bare.routeTier).toBe("minimal");
    const rejection = (bare.rejectedRoutes ?? [])[0];
    expect(rejection.code).toBe("MISSING_MATERIALS");
    expect(rejection.reason.length).toBeGreaterThan(20);
  });

  it("names the materials that blocked the richer route", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "light-and-lenses",
      materials: ["paper", "pencil", "plastic-cup"],
    });
    expect(plan.routeTier).toBe("minimal");
    const rejection = (plan.rejectedRoutes ?? [])[0];
    expect(rejection.code).toBe("MISSING_MATERIALS");
    expect(rejection.reason).toContain("mercek");
  });

  it("refuses to plan a purchase that breaks a strict budget", () => {
    // The guard checks what must actually be bought, so a classroom that owns
    // nothing is stopped while one that owns its stock is not.
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      materials: [],
      budgetTry: 1,
      hardBudget: true,
    });
    expect(plan.findings).toContainEqual(
      expect.objectContaining({ code: "BUDGET_EXCEEDED", severity: "blocker" }),
    );
  });

  it("surfaces every safety constraint the route declares", () => {
    const lens = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "light-and-lenses",
      materials: ["paper", "pencil", "plastic-cup", "convex-lens", "ruler"],
      capabilities: ["laboratory"],
      budgetTry: 100_000,
    });
    expect(lens.routeTier).toBe("lab");
    const safety = lens.findings.filter((finding) => finding.code === "SAFETY_CONSTRAINT");
    expect(safety.length).toBeGreaterThan(0);
    // A lens focusing sunlight is a burn and fire hazard, so the warning must
    // reach the teacher on the plan itself.
    expect(safety.map((finding) => finding.message).join(" ")).toContain("Güneş");
  });

  it("selects deterministically for the same profile", () => {
    const first = selectRoute("electrification", DEFAULT_PROFILE);
    const second = selectRoute("electrification", DEFAULT_PROFILE);
    expect(first.route.id).toBe(second.route.id);
  });

  it("falls back to the default outcome for an unknown id", () => {
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, outcomeId: "no-such-outcome" });
    expect(plan.outcomeId).toBe("electrification");
  });
});

describe("topic identity and provenance", () => {
  it.each(OUTCOME_IDS)("%s declares a Bilim Türkiye domain and age cohort", (outcomeId) => {
    const topic = CURRICULUM[outcomeId];
    expect(WORKSHOP_DOMAIN_IDS).toContain(topic.domainId);
    expect(AGE_COHORT_IDS).toContain(topic.cohort);
    expect(topic.title.length).toBeGreaterThan(5);
    expect(topic.summary.length).toBeGreaterThan(20);
  });

  it("never presents an unverified curriculum code as verified", () => {
    for (const outcomeId of OUTCOME_IDS) {
      const outcome = CURRICULUM[outcomeId].curriculumMapping;
      // A topic without a mapping is legitimate; one with a mapping must be
      // traceable.
      if (!outcome) continue;
      expect(["verified", "unverified"]).toContain(outcome.verification);
      // Every entry must be traceable whatever its verification state: the
      // point of the corpus is that a code can be checked, not that it is
      // already approved.
      expect(outcome.source.document).toContain("Türkiye Yüzyılı Maarif Modeli");
      expect(outcome.source.url).toMatch(/^https:\/\/tymm\.meb\.gov\.tr\//);
      expect(outcome.source.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(outcome.code).toMatch(/^FB\.7\.\d+\.\d+$/);
    }
  });
});

/**
 * Venue facilities are the variance Bilim Türkiye actually has: thirty centres
 * that are not equipped alike. This matrix asserts a plan always comes out and
 * that a route is never offered to a venue that cannot host it.
 */
describe("topic × centre matrix", () => {
  const cases = OUTCOME_IDS.flatMap((outcomeId) =>
    CENTRE_IDS.map((centreId) => ({ outcomeId, centreId })),
  );

  it.each(cases)("$outcomeId · $centreId", ({ outcomeId, centreId }) => {
    const profile: ResourceProfile = {
      ...DEFAULT_PROFILE,
      outcomeId,
      hasElectricity: true,
      materials: [...INVENTORY_PRESETS.workshop.materials],
      // Only what the centre's own page confirms; an unpublished facility is
      // never assumed to exist.
      capabilities: confirmedCapabilities(centreId),
      budgetTry: 100_000,
    };
    const plan = generateWorkshop(profile);

    expect(plan.stages).toHaveLength(5);
    const chosen = getOutcomeContent(outcomeId as OutcomeId).routes.find(
      (route) => route.id === plan.routeId,
    );
    expect(chosen).toBeDefined();
    for (const capability of chosen!.eligibility.requiredCapabilities ?? []) {
      expect(profile.capabilities).toContain(capability);
    }
  });
});

describe("centre registry", () => {
  it("covers all thirty centres with a location", () => {
    expect(CENTRE_IDS).toHaveLength(30);
    for (const id of CENTRE_IDS) {
      expect(CENTRES[id].name).toMatch(/^Bilim /);
      expect(CENTRES[id].location.length).toBeGreaterThan(2);
    }
  });

  it("sorts every facility into exactly one of the three states", () => {
    for (const id of CENTRE_IDS) {
      const confirmed = confirmedCapabilities(id);
      const absent = unavailableCapabilities(id);
      const unknown = unknownCapabilities(id);
      expect(confirmed.length + absent.length + unknown.length).toBe(VENUE_CAPABILITY_IDS.length);
      for (const capability of unknown) expect(confirmed).not.toContain(capability);
      for (const capability of unknown) expect(absent).not.toContain(capability);
    }
  });

  it("never records a researched centre as verifiably lacking a facility", () => {
    // Transcription can establish that a page names a planetarium. It cannot
    // establish that a centre has none — that needs a person to have checked —
    // so the static data may only ever produce "available" or "unknown".
    for (const id of CENTRE_IDS) expect(unavailableCapabilities(id)).toEqual([]);
  });

  it("reflects the centres whose pages name a planetarium", () => {
    const withDome = CENTRE_IDS.filter((id) => CENTRES[id].planetarium === "available");
    expect(withDome).toEqual(["erzurum", "gaziantep", "gungoren", "sahinbey", "trabzon"]);
  });

  it("gives a bare school classroom a workable plan for every topic", () => {
    for (const outcomeId of OUTCOME_IDS) {
      const plan = generateWorkshop({
        ...DEFAULT_PROFILE,
        outcomeId,
        capabilities: [],
      });
      expect(plan.stages).toHaveLength(5);
      expect(plan.routeTier).toBe("minimal");
    }
  });
});

describe("venue capabilities change the plan", () => {
  /**
   * A centre where the listed facilities are confirmed present and the rest
   * are confirmed absent. Both lists are set, because a profile that named
   * only one of them would leave the others unknown — a different scenario,
   * and one the uncertainty tests cover separately.
   */
  const spaceProfile = (capabilities: string[]): ResourceProfile => ({
    ...DEFAULT_PROFILE,
    outcomeId: "space-age",
    materials: [...INVENTORY_PRESETS.workshop.materials],
    capabilities,
    unavailableCapabilities: VENUE_CAPABILITY_IDS.filter((id) => !capabilities.includes(id)),
    budgetTry: 100_000,
  });

  it("uses the dome when the centre has one", () => {
    const plan = generateWorkshop(spaceProfile(["planetarium"]));
    expect(plan.routeId).toBe("space-age-planetarium");
    expect(plan.stages.find((stage) => stage.key === "explore")?.title).toContain("Kubbe");
  });

  it("explains the missing facility instead of pretending it has one", () => {
    const plan = generateWorkshop(spaceProfile([]));
    expect(plan.routeId).not.toBe("space-age-planetarium");
    const rejection = (plan.rejectedRoutes ?? []).find(
      (item) => item.code === "MISSING_CAPABILITY",
    );
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain(VENUE_CAPABILITIES.planetarium.label);
  });

  it("names the equipment when that is what is missing", () => {
    // The lens bench needs a laboratory as well as the lens itself, so owning
    // one without the other is not enough.
    const withoutLens = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "light-and-lenses",
      materials: ["paper", "pencil", "plastic-cup"],
      capabilities: [],
      budgetTry: 100_000,
    });
    expect(withoutLens.routeTier).toBe("minimal");
    expect((withoutLens.rejectedRoutes ?? [])[0].code).toBe("MISSING_MATERIALS");
  });

  it("uses the exhibition floor where a centre publishes one", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "nature-of-matter",
      materials: [...INVENTORY_PRESETS.workshop.materials],
      capabilities: confirmedCapabilities("trabzon"),
      budgetTry: 100_000,
    });
    expect(plan.routeId).toBe("matter-exhibition-stations");
  });
});

/**
 * Formats carry their own published constraints, so a plan has to respect the
 * format as well as the venue and the stock.
 */
describe("education formats", () => {
  it("declares all four published formats with their official names", () => {
    expect(FORMAT_IDS).toHaveLength(4);
    expect(FORMATS["school-group"].label).toBe("Okul Gruplarına Yönelik Eğitimler");
    // Their own spelling puts "çevrim içi" apart.
    expect(FORMATS.online.label).toContain("Çevrim İçi");
    for (const id of FORMAT_IDS) {
      expect(FORMATS[id].standardSessionMinutes).toBe(60);
    }
  });

  it("refuses a centre facility in an online session", () => {
    // The participant is at home, so the dome cannot be part of the delivery
    // however well equipped the centre is.
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "space-age",
      formatId: "online",
      hasInternet: true,
      capabilities: [...VENUE_CAPABILITY_IDS],
      materials: [...INVENTORY_PRESETS.workshop.materials],
      budgetTry: 100_000,
    });
    expect(plan.routeId).not.toBe("space-age-planetarium");
    const rejection = (plan.rejectedRoutes ?? []).find((item) => item.code === "NOT_IN_FORMAT");
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain("Çevrim İçi");
  });

  it("blocks an online session with no connection", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      formatId: "online",
      hasInternet: false,
    });
    expect(plan.findings).toContainEqual(
      expect.objectContaining({ code: "FORMAT_REQUIREMENT_UNMET", severity: "blocker" }),
    );
  });

  it("uses the dome for the same topic in a school group session", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      outcomeId: "space-age",
      formatId: "school-group",
      capabilities: confirmedCapabilities("trabzon"),
      materials: [...INVENTORY_PRESETS.workshop.materials],
      budgetTry: 100_000,
    });
    expect(plan.routeId).toBe("space-age-planetarium");
  });

  it("says a long package is a package rather than pretending to cover it", () => {
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, formatId: "long-term" });
    expect(plan.findings).toContainEqual(
      expect.objectContaining({ code: "FORMAT_IS_A_PACKAGE", severity: "info" }),
    );
    expect(FORMATS["long-term"].plansWholeFormat).toBe(false);
  });

  it("flags a session that departs from the published length", () => {
    const standard = generateWorkshop(DEFAULT_PROFILE);
    expect(standard.findings.map((finding) => finding.code)).not.toContain(
      "NON_STANDARD_DURATION",
    );
    const shorter = generateWorkshop({ ...DEFAULT_PROFILE, durationMinutes: 40 });
    expect(shorter.findings).toContainEqual(
      expect.objectContaining({ code: "NON_STANDARD_DURATION", severity: "info" }),
    );
    // Still a complete plan; the divergence is reported, not refused.
    expect(shorter.stages.reduce((sum, stage) => sum + stage.minutes, 0)).toBe(40);
  });
});
