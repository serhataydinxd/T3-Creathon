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

  it("rejects unsafe group sizes before generation", () => {
    const findings = validateProfile({ ...DEFAULT_PROFILE, groupSize: 10 });
    expect(findings).toContainEqual(expect.objectContaining({ code: "GROUP_CAPACITY_MISMATCH" }));
  });
});
