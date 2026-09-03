import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateWorkshop, validateProfile } from "@/server/domain/generator";
import { INVENTORY_PRESETS } from "@/server/content/materials";
import { OUTCOME_IDS } from "@/server/content/curriculum";

describe("İMKÂN generator", () => {
  it("preserves the locked outcome and covers all 5E stages", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);

    expect(plan.objective.locked).toBe(true);
    expect(plan.objective.code).toMatch(/^FB\.7\./);
    expect(plan.stages.map((stage) => stage.key)).toEqual([
      "engage",
      "explore",
      "explain",
      "elaborate",
      "evaluate",
    ]);
    expect(plan.stages.every((stage) => stage.objectiveConnection.length > 20)).toBe(true);
  });

  it("balances stage duration to the exact request for every outcome", () => {
    for (const outcomeId of OUTCOME_IDS) {
      for (const durationMinutes of [40, 60, 80] as const) {
        const plan = generateWorkshop({ ...DEFAULT_PROFILE, outcomeId, durationMinutes });
        expect(plan.stages.reduce((sum, stage) => sum + stage.minutes, 0)).toBe(durationMinutes);
      }
    }
  });

  it("reports availability from the teacher's inventory, not a static flag", () => {
    // The regression this guards: commonly stocked materials were reported as
    // present even when the teacher had said otherwise.
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, materials: ["paper"] });
    const byKey = Object.fromEntries((plan.materialPlan ?? []).map((line) => [line.key, line]));

    expect(byKey.paper.inInventory).toBe(true);
    expect(byKey.paper.acquisitionCostTry).toBe(0);
    const missing = (plan.materialPlan ?? []).filter((line) => !line.inInventory);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((line) => line.acquisitionCostTry === line.totalCostTry)).toBe(true);
  });

  it("separates what is consumed from what is merely used", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);
    const lines = plan.materialPlan ?? [];

    // A pencil survives one delivery, so it costs nothing to run the lesson.
    const pencil = lines.find((line) => line.key === "pencil");
    expect(pencil?.kind).toBe("reusable");
    expect(pencil?.lessonCostTry).toBe(0);
    const paper = lines.find((line) => line.key === "paper");
    expect(paper?.kind).toBe("consumable");
    expect(paper?.lessonCostTry).toBeGreaterThan(0);
  });

  it("costs a fully stocked classroom nothing to acquire", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      materials: [...INVENTORY_PRESETS.workshop.materials],
      hasElectricity: true,
      budgetTry: 100_000,
    });
    expect(plan.costs?.acquisitionTry).toBe(0);
    expect(plan.costs?.lessonTry).toBeGreaterThan(0);
  });

  it("dates every price so a stale estimate is visible", () => {
    expect(generateWorkshop(DEFAULT_PROFILE).costs?.pricedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects unsafe group sizes before generation", () => {
    const findings = validateProfile({ ...DEFAULT_PROFILE, groupSize: 10 });
    expect(findings).toContainEqual(expect.objectContaining({ code: "GROUP_CAPACITY_MISMATCH" }));
  });
});
