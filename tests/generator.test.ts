import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateWorkshop, validateProfile } from "@/server/domain/generator";

describe("İMKÂN replay generator", () => {
  it("preserves the approved objective and covers all 5E stages", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);

    expect(plan.objective.locked).toBe(true);
    expect(plan.objective.code).toBe("F.7.7.1.1");
    expect(plan.stages.map((stage) => stage.key)).toEqual([
      "engage",
      "explore",
      "explain",
      "elaborate",
      "evaluate",
    ]);
    expect(plan.stages.every((stage) => stage.objectiveConnection.length > 20)).toBe(true);
  });

  it("balances stage duration to the exact request", () => {
    for (const durationMinutes of [40, 60, 80] as const) {
      const plan = generateWorkshop({ ...DEFAULT_PROFILE, durationMinutes });
      expect(plan.stages.reduce((sum, stage) => sum + stage.minutes, 0)).toBe(durationMinutes);
    }
  });

  it("uses the approved paper model when circuit materials or power are absent", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);

    expect(plan.stages.find((stage) => stage.key === "explore")?.title).toContain("İnsan devresi");
    expect(plan.findings.map((finding) => finding.code)).toContain("APPROVED_SUBSTITUTION_APPLIED");
    expect(plan.stages.flatMap((stage) => stage.materialKeys)).not.toContain("battery");
  });

  it("uses a physical circuit only when the full kit and power are present", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: [...DEFAULT_PROFILE.materials, "battery", "led", "copper-wire"],
      budgetTry: 500,
    });

    expect(plan.stages.find((stage) => stage.key === "explore")?.title).toContain("Devreyi kur");
  });

  it("keeps summary, activity, cost, and substitution aligned when the kit exists but power does not", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      materials: [...DEFAULT_PROFILE.materials, "battery", "led", "copper-wire"],
    });

    expect(plan.adaptationSummary).toContain("enerji gerektirmeyen");
    expect(plan.stages.find((stage) => stage.key === "explore")?.title).toContain("İnsan devresi");
    expect(plan.findings.map((finding) => finding.code)).toContain("APPROVED_SUBSTITUTION_APPLIED");
    expect(plan.estimatedCostTry).toBeLessThan(50);
  });

  it("emits a hard blocker when the chosen route exceeds a strict budget", () => {
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, budgetTry: 0 });
    expect(plan.findings).toContainEqual(
      expect.objectContaining({ code: "BUDGET_EXCEEDED", severity: "blocker" }),
    );
  });

  it("publishes a per-group shopping list that reconciles with the cost estimate", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);
    const lines = plan.materialPlan ?? [];

    // 30 students in groups of 5 is six groups of the paper-model route.
    expect(plan.groupCount).toBe(6);
    expect(lines.map((line) => line.key)).toEqual(["paper", "tape"]);
    expect(lines.find((line) => line.key === "paper")).toMatchObject({
      quantityPerGroup: 4,
      totalQuantity: 24,
      totalCostTry: 12,
    });
    // A shared roll of tape must not be rounded away to zero.
    expect(lines.find((line) => line.key === "tape")).toMatchObject({
      quantityPerGroup: 0.25,
      totalQuantity: 1.5,
      totalCostTry: 1.5,
    });
    const summed = lines.reduce((total, line) => total + line.totalCostTry, 0);
    expect(plan.estimatedCostTry).toBe(Math.ceil(summed));
  });

  it("lists the circuit kit when the physical route is chosen", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: [...DEFAULT_PROFILE.materials, "battery", "led", "copper-wire"],
      budgetTry: 500,
    });
    const lines = plan.materialPlan ?? [];

    expect(lines.map((line) => line.key)).toEqual(["battery", "led", "copper-wire", "paper"]);
    expect(lines.find((line) => line.key === "led")).toMatchObject({
      quantityPerGroup: 2,
      totalQuantity: 12,
      totalCostTry: 60,
    });
    expect(plan.estimatedCostTry).toBe(186);
  });

  it("rejects unsafe group sizes before generation", () => {
    const findings = validateProfile({ ...DEFAULT_PROFILE, groupSize: 10 });
    expect(findings).toContainEqual(expect.objectContaining({ code: "GROUP_CAPACITY_MISMATCH" }));
  });
});
