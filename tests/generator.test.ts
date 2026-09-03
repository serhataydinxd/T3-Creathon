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
    expect(lines.map((line) => line.key)).toEqual(["paper", "pencil", "scissors", "tape"]);
    expect(lines.find((line) => line.key === "paper")).toMatchObject({
      basis: "group",
      quantityPerUnit: 4,
      quantityPerGroup: 4,
      totalQuantity: 24,
      totalCostTry: 12,
    });
    // A per-learner line scales by group size, not by group count.
    expect(lines.find((line) => line.key === "pencil")).toMatchObject({
      basis: "student",
      quantityPerUnit: 1,
      quantityPerGroup: 5,
      totalQuantity: 30,
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

  it("keeps the offline route inside the default classroom inventory", () => {
    const lines = generateWorkshop(DEFAULT_PROFILE).materialPlan ?? [];
    expect(lines.every((line) => line.inInventory)).toBe(true);
    expect(generateWorkshop(DEFAULT_PROFILE).costs?.acquisitionTry).toBe(0);
  });

  it("reports availability from the teacher's inventory, not a static flag", () => {
    // The regression this replaces: scissors and tape are commonly stocked, so
    // a per-material flag claimed the classroom had them even when the teacher
    // had said otherwise, and billed tape that then needed no purchase.
    const plan = generateWorkshop({ ...DEFAULT_PROFILE, materials: ["paper", "pencil"] });
    const byKey = Object.fromEntries((plan.materialPlan ?? []).map((line) => [line.key, line]));

    expect(byKey.paper.inInventory).toBe(true);
    expect(byKey.pencil.inInventory).toBe(true);
    expect(byKey.scissors.inInventory).toBe(false);
    expect(byKey.tape.inInventory).toBe(false);

    // Only the missing materials cost money to obtain.
    expect(byKey.paper.acquisitionCostTry).toBe(0);
    expect(byKey.tape.acquisitionCostTry).toBe(1.5);
    expect(plan.costs?.acquisitionTry).toBe(2);
  });

  it("separates what is consumed from what is merely used", () => {
    const plan = generateWorkshop(DEFAULT_PROFILE);
    const byKey = Object.fromEntries((plan.materialPlan ?? []).map((line) => [line.key, line]));

    expect(byKey.paper.kind).toBe("consumable");
    expect(byKey.scissors.kind).toBe("reusable");
    // Scissors are needed but survive the lesson, so they cost nothing to run.
    expect(byKey.scissors.lessonCostTry).toBe(0);
    // Paper 12 TRY plus tape 1.5 TRY, rounded up.
    expect(plan.costs?.lessonTry).toBe(14);
  });

  it("leaves the published budget figures untouched", () => {
    // These two numbers appear in the submitted deck and video narration, so
    // the guard deliberately still checks the full estimate.
    expect(generateWorkshop(DEFAULT_PROFILE).estimatedCostTry).toBe(14);
    const kitted = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: [...DEFAULT_PROFILE.materials, "battery", "led", "copper-wire"],
      budgetTry: 500,
    });
    expect(kitted.estimatedCostTry).toBe(186);
    expect(kitted.costs?.totalTry).toBe(186);
  });

  it("dates every price so a stale estimate is visible", () => {
    expect(generateWorkshop(DEFAULT_PROFILE).costs?.pricedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lists the circuit kit and flags what must be procured", () => {
    const plan = generateWorkshop({
      ...DEFAULT_PROFILE,
      hasElectricity: true,
      materials: [...DEFAULT_PROFILE.materials, "battery", "led", "copper-wire"],
      budgetTry: 500,
    });
    const lines = plan.materialPlan ?? [];

    expect(lines.map((line) => line.key)).toEqual([
      "battery",
      "led",
      "copper-wire",
      "paper",
      "pencil",
    ]);
    expect(lines.find((line) => line.key === "led")).toMatchObject({
      quantityPerGroup: 2,
      totalQuantity: 12,
      totalCostTry: 60,
      kind: "reusable",
    });
    // The teacher selected the kit, so nothing needs buying: availability now
    // follows the submitted inventory rather than how common a material is.
    expect(lines.every((line) => line.inInventory)).toBe(true);
    expect(plan.costs?.acquisitionTry).toBe(0);
    expect(plan.estimatedCostTry).toBe(186);
  });

  it("rejects unsafe group sizes before generation", () => {
    const findings = validateProfile({ ...DEFAULT_PROFILE, groupSize: 10 });
    expect(findings).toContainEqual(expect.objectContaining({ code: "GROUP_CAPACITY_MISMATCH" }));
  });
});
