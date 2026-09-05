import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildReportPrompt, offlineNarrative, type DeliveryFacts } from "@/server/ai/reporting";
import { NARRATIVE_SECTIONS, NOT_STATED } from "@/server/domain/reports";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";

/**
 * The report is where a model is most tempted to be helpful and most damaging
 * if it is: a plausible participant count, a stage described as delivered
 * because the others were, a learning claim with no observation behind it.
 */
const plan = generateWorkshop(DEFAULT_PROFILE);

function facts(overrides: Partial<DeliveryFacts> = {}): DeliveryFacts {
  return {
    plan,
    centreName: "Bilim Trabzon",
    deliveredOn: "2026-09-05",
    actualParticipants: 21,
    actualGroups: 5,
    actualMinutes: 55,
    actualCostTry: null,
    whatWorked: null,
    whatWasHard: null,
    accessibilityApplied: null,
    safetyObservation: null,
    incidentOccurred: false,
    nextTime: null,
    stages: plan.stages.map((stage) => ({
      stageKey: stage.key,
      outcome: "applied" as const,
      note: null,
      evidenceObserved: null,
    })),
    materials: (plan.materialPlan ?? []).map((line) => ({
      materialId: line.key,
      plannedQuantity: Math.round(line.totalQuantity),
      actualQuantity: null,
      substituteMaterialId: null,
      note: null,
    })),
    ...overrides,
  };
}

describe("the offline narrative", () => {
  it("fills every section, so a gap is visible rather than absent", () => {
    const narrative = offlineNarrative(facts());
    for (const key of NARRATIVE_SECTIONS) {
      expect(narrative[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps planned and actual figures both on the page", () => {
    const narrative = offlineNarrative(facts());
    // 30 planned against 21 present is the substance of the report.
    expect(narrative.summary).toContain("30");
    expect(narrative.summary).toContain("21");
    expect(narrative.delivery).toContain("60");
    expect(narrative.delivery).toContain("55");
  });

  it("refuses to claim learning that nobody observed", () => {
    const narrative = offlineNarrative(facts());
    expect(narrative.learning).toContain("kaydedilmedi");
    expect(narrative.learning).toContain("ileri sürülemez");
  });

  it("reports observed evidence when there is some", () => {
    const withEvidence = facts({
      stages: plan.stages.map((stage, index) => ({
        stageKey: stage.key,
        outcome: "applied" as const,
        note: null,
        evidenceObserved: index === 0 ? "Katılımcı kendi modelini etiketledi." : null,
      })),
    });
    expect(offlineNarrative(withEvidence).learning).toContain("kendi modelini etiketledi");
  });

  it("never shows a raw stage key or an enum value to a reader", () => {
    const skipped = facts({
      stages: plan.stages.map((stage, index) => ({
        stageKey: stage.key,
        outcome: index === 4 ? ("skipped" as const) : ("applied" as const),
        note: index === 4 ? "Süre yetmedi." : null,
        evidenceObserved: null,
      })),
    });
    const narrative = offlineNarrative(skipped);
    expect(narrative.delivery).not.toContain("evaluate");
    expect(narrative.delivery).not.toContain("skipped");
    expect(narrative.delivery).toContain("Değerlendirme");
    expect(narrative.delivery).toContain("atlandı");
    // And no doubled full stop where a note runs into the sentence.
    expect(narrative.delivery).not.toMatch(/\.\./);
  });

  it("reads as a sentence when a value is missing, not as a spliced marker", () => {
    // "merkezinde Belirtilmedi. tarihinde uygulandı" is a broken sentence, not
    // a missing value, so the inline form drops the terminating full stop.
    const narrative = offlineNarrative(facts({ deliveredOn: null, centreName: null }));
    expect(narrative.summary).not.toContain("Belirtilmedi. tarihinde");
    expect(narrative.summary).toContain("belirtilmemiş");
  });

  it("keeps an unrecorded cost unrecorded rather than reporting zero", () => {
    const narrative = offlineNarrative(facts({ actualCostTry: null }));
    expect(narrative.materials).not.toMatch(/maliyet 0 TL/);
    expect(narrative.materials).toContain("belirtilmemiş");
  });

  it("names a skipped stage and its reason instead of glossing over it", () => {
    const skipped = facts({
      stages: plan.stages.map((stage, index) => ({
        stageKey: stage.key,
        outcome: index === 4 ? ("skipped" as const) : ("applied" as const),
        note: index === 4 ? "Süre yetmedi." : null,
        evidenceObserved: null,
      })),
    });
    const narrative = offlineNarrative(skipped);
    expect(narrative.delivery).toContain("atlandı");
    expect(narrative.delivery).toContain("Süre yetmedi");
  });

  it("surfaces an incident rather than softening it", () => {
    const narrative = offlineNarrative(
      facts({ incidentOccurred: true, safetyObservation: "Bir katılımcı parmağını kesti." }),
    );
    expect(narrative.accessibility).toContain("parmağını kesti");
    expect(narrative.accessibility).toContain("olay bildirildi");
  });

  it("says 'Belirtilmedi' for what was never entered", () => {
    const narrative = offlineNarrative(facts());
    expect(narrative.nextTime).toContain(NOT_STATED);
  });
});

describe("the prompt handed to the model", () => {
  it("shows the model the gaps already marked, so it does not fill them", () => {
    const prompt = buildReportPrompt(facts());
    expect(prompt).toContain(NOT_STATED);
    expect(prompt).toContain("GERÇEKLEŞEN");
    expect(prompt).toContain("PLANLANAN");
  });

  it("carries both figures so the model cannot merge them", () => {
    const prompt = buildReportPrompt(facts());
    expect(prompt).toMatch(/Süre: 60 dk/);
    expect(prompt).toMatch(/Süre: 55 dk/);
  });

  it("forbids invention, concealment and child data by name", () => {
    const source = readFileSync(new URL("../server/ai/reporting.ts", import.meta.url), "utf8");
    expect(source).toContain("uydurma");
    expect(source).toContain("gizleme");
    expect(source).toContain("Çocukların adını");
    expect(source).toContain("Belirtilmedi.");
  });
});

describe("the guarantees the lifecycle rests on", () => {
  const domain = readFileSync(new URL("../server/domain/reports.ts", import.meta.url), "utf8");
  const deliveries = readFileSync(new URL("../server/domain/deliveries.ts", import.meta.url), "utf8");

  it("only lets a published version be delivered", () => {
    expect(deliveries).toContain('if (version.status !== "published") throw new Error("VERSION_NOT_PUBLISHED")');
  });

  it("freezes the plan when the delivery starts", () => {
    expect(deliveries).toContain("planSnapshot: plan");
  });

  it("refuses a changed or skipped stage with no reason", () => {
    expect(deliveries).toContain("STAGE_CHANGE_NEEDS_REASON");
  });

  it("treats an empty number field as unrecorded rather than as zero", () => {
    const actions = readFileSync(new URL("../app/actions/deliveries.ts", import.meta.url), "utf8");
    // z.coerce.number() turns "" into 0, which reported an unfilled cost as a
    // session that cost nothing.
    expect(actions).toContain("blankToUndefined");
    expect(actions).not.toMatch(/actualCostTry: z\.coerce/);
  });

  it("bars an educator from approving their own account", () => {
    expect(domain).toContain("SELF_REVIEW_FORBIDDEN");
    expect(domain).toContain("record.educatorId === user.id || current.createdBy === user.id");
  });

  it("supersedes an approved report rather than editing it", () => {
    expect(domain).toContain('.set({ status: "superseded" })');
  });

  it("keeps publication a separate decision from approval", () => {
    expect(domain).toContain('if (user.role !== "manager") throw new Error("FORBIDDEN")');
    expect(domain).toContain('if (current.status !== "approved") throw new Error("INVALID_TRANSITION")');
  });
});
