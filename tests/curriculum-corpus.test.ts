import { describe, expect, it } from "vitest";
import {
  ALL_ROUTES,
  CURRICULUM,
  OUTCOME_IDS,
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
  it("prefers the richest route the classroom can support", () => {
    const equipped = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: [...INVENTORY_PRESETS.workshop.materials],
      budgetTry: 100_000,
    });
    expect(equipped.routeTier).toBe("lab");
    expect(equipped.rejectedRoutes).toEqual([]);
  });

  it("explains the rejection instead of silently downgrading", () => {
    const bare = generateWorkshop(DEFAULT_PROFILE);
    expect(bare.routeTier).toBe("minimal");
    const rejection = (bare.rejectedRoutes ?? [])[0];
    expect(rejection.code).toBe("NO_ELECTRICITY");
    expect(rejection.reason).toContain("elektrik");
  });

  it("names the missing materials when power is available but the kit is not", () => {
    const powered = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: ["paper", "pencil", "scissors", "tape"],
    });
    const rejection = (powered.rejectedRoutes ?? [])[0];
    expect(rejection.code).toBe("MISSING_MATERIALS");
    expect(rejection.reason).toContain("Pil");
    expect(rejection.reason).toContain("LED");
  });

  it("selects deterministically for the same profile", () => {
    const first = selectRoute("electric-circuits", DEFAULT_PROFILE);
    const second = selectRoute("electric-circuits", DEFAULT_PROFILE);
    expect(first.route.id).toBe(second.route.id);
  });

  it("falls back to the default outcome for an unknown id", () => {
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, outcomeId: "no-such-outcome" });
    expect(plan.outcomeId).toBe("electric-circuits");
  });
});

describe("outcome provenance", () => {
  it("never presents an unverified curriculum code as verified", () => {
    for (const outcomeId of OUTCOME_IDS) {
      const { outcome } = CURRICULUM[outcomeId];
      expect(["verified", "unverified"]).toContain(outcome.verification);
      if (outcome.verification === "unverified") {
        // Honest while the code is still awaiting a human check against the
        // official document.
        expect(outcome.source.document.toLowerCase()).toContain("demo");
      } else {
        expect(outcome.source.url).toBeTruthy();
        expect(outcome.source.accessedOn).toBeTruthy();
      }
    }
  });
});
