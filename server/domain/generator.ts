import {
  DEFAULT_OUTCOME_ID,
  getOutcomeContent,
  isOutcomeId,
  type OutcomeId,
} from "@/server/content/curriculum";
import { MATERIALS, MATERIALS_PRICED_ON } from "@/server/content/materials";
import { WORKSHOP_DOMAINS } from "@/server/content/domains";
import { DEFAULT_FORMAT_ID, getFormat } from "@/server/content/formats";
import { buildStages, selectRoute } from "./routes";
import type { Finding, MaterialLine, ResourceProfile, WorkshopPlan } from "./types";

/**
 * Bumped whenever the deterministic output of this module changes in a way
 * that makes a previously generated plan stale. Generation records carry it so
 * a plan issued before a deploy is not silently saved against rules it was not
 * built under.
 *
 * Bump this for: new or removed plan fields, changed cost semantics, a changed
 * stage allocation, a new eligibility dimension, or a corpus change that moves
 * which route a given profile selects. Forgetting to bump it does not fail a
 * test — it silently disables the guard — so it belongs in the same commit as
 * the change that made it necessary.
 */
export const GENERATOR_VERSION = "2026-09-04.1";

export function resolveOutcomeId(profile: ResourceProfile): OutcomeId {
  const requested = profile.outcomeId;
  return requested && isOutcomeId(requested) ? requested : DEFAULT_OUTCOME_ID;
}

export function validateProfile(profile: ResourceProfile): Finding[] {
  const findings: Finding[] = [];
  if (profile.classSize < 6 || profile.classSize > 50) {
    findings.push({
      code: "GROUP_CAPACITY_MISMATCH",
      severity: "blocker",
      message: "Sınıf mevcudu 6–50 öğrenci aralığında olmalı.",
    });
  }
  if (profile.groupSize < 2 || profile.groupSize > 6) {
    findings.push({
      code: "GROUP_CAPACITY_MISMATCH",
      severity: "blocker",
      message: "Güvenli grup büyüklüğü 2–6 öğrenci aralığındadır.",
    });
  }
  if (profile.budgetTry < 0) {
    findings.push({
      code: "BUDGET_EXCEEDED",
      severity: "blocker",
      message: "Bütçe negatif olamaz.",
    });
  }
  return findings;
}

export function generateWorkshop(profile: ResourceProfile): WorkshopPlan {
  const findings = validateProfile(profile);
  if (findings.some((finding) => finding.severity === "blocker")) {
    throw new Error(findings.map((finding) => finding.message).join(" "));
  }

  const format = getFormat(profile.formatId);
  const outcomeId = resolveOutcomeId(profile);
  const content = getOutcomeContent(outcomeId);
  const { route, rejected } = selectRoute(outcomeId, profile);
  const stages = buildStages(outcomeId, route, profile);
  const groupCount = Math.ceil(profile.classSize / profile.groupSize);

  const round = (value: number) => Math.round(value * 100) / 100;
  const inventory = new Set(profile.materials);
  const materialPlan: MaterialLine[] = route.materials.map(({ materialId, basis, quantity }) => {
    const material = MATERIALS[materialId];
    const perGroup = basis === "student" ? quantity * profile.groupSize : quantity;
    // What the teacher told us they have, not what a typical classroom stocks.
    const inInventory = inventory.has(materialId);
    const totalCostTry = round(material.unitCostTry * perGroup * groupCount);
    return {
      key: materialId,
      label: material.label,
      category: material.category,
      kind: material.kind,
      basis,
      quantityPerUnit: quantity,
      quantityPerGroup: round(perGroup),
      // Shared consumables such as tape are fractional per group, so the class
      // total is rounded rather than truncated away to nothing.
      totalQuantity: round(perGroup * groupCount),
      unitCostTry: material.unitCostTry,
      totalCostTry,
      inInventory,
      // Two different questions, so the figures deliberately overlap: a
      // consumable the teacher does not own is both bought and used up.
      acquisitionCostTry: inInventory ? 0 : totalCostTry,
      lessonCostTry: material.kind === "consumable" ? totalCostTry : 0,
    };
  });

  const estimatedCostTry = Math.ceil(
    materialPlan.reduce((sum, line) => sum + line.totalCostTry, 0),
  );
  const costs = {
    totalTry: estimatedCostTry,
    acquisitionTry: Math.ceil(materialPlan.reduce((sum, line) => sum + line.acquisitionCostTry, 0)),
    lessonTry: Math.ceil(materialPlan.reduce((sum, line) => sum + line.lessonCostTry, 0)),
    pricedOn: MATERIALS_PRICED_ON,
  };

  // The format's own published requirement, before the content's.
  if (format.requiresInternet && !profile.hasInternet) {
    findings.push({
      code: "FORMAT_REQUIREMENT_UNMET",
      severity: "blocker",
      message: `${format.label} internet bağlantısı gerektirir.`,
    });
  }
  if (profile.durationMinutes !== format.standardSessionMinutes) {
    findings.push({
      code: "NON_STANDARD_DURATION",
      severity: "info",
      message: `${format.label} için yayımlanmış oturum süresi ${format.standardSessionMinutes} dakikadır; bu plan ${profile.durationMinutes} dakikaya göre bölündü.`,
    });
  }
  if (format.packageNote) {
    findings.push({ code: "FORMAT_IS_A_PACKAGE", severity: "info", message: format.packageNote });
  }
  if (!profile.hasInternet) {
    findings.push({
      code: "OFFLINE_MEDIA_UNAVAILABLE",
      severity: "warning",
      message: "Video yerine yazdırılabilir görsel ve öğretmen anlatımı kullanıldı.",
    });
  }
  // A richer route was set aside, so the chosen one is a substitution. The
  // wording belongs to the route: what was swapped only makes sense against
  // the delivery that could not run.
  if (rejected.length > 0 && route.substitutionNote) {
    findings.push({
      code: "APPROVED_SUBSTITUTION_APPLIED",
      severity: "info",
      message: route.substitutionNote,
    });
  }
  for (const note of route.safetyNotes ?? []) {
    findings.push({ code: "SAFETY_CONSTRAINT", severity: "warning", message: note });
  }
  if (profile.hardBudget && costs.acquisitionTry > profile.budgetTry) {
    findings.push({
      code: "BUDGET_EXCEEDED",
      severity: "blocker",
      message: `Temin edilmesi gereken ${costs.acquisitionTry} ₺, ${profile.budgetTry} ₺ kesin bütçeyi aşıyor.`,
    });
  }
  if (profile.accessibilityNeeds.length > 0) {
    findings.push({
      code: "ACCESSIBILITY_ADAPTATION_APPLIED",
      severity: "info",
      message: "Kartlara yüksek kontrast, büyük punto ve sözlü yönerge alternatifi eklendi.",
    });
  }

  return {
    id: `${route.id}-v1`,
    mode: "REPLAY",
    title: content.title,
    // A topic without a curriculum mapping still locks something: its own
    // summary. The lock is about immutability during generation, not about MEB.
    objective: {
      id: `objective-${outcomeId}`,
      code: content.curriculumMapping?.code ?? WORKSHOP_DOMAINS[content.domainId].shortLabel,
      canonicalText: content.curriculumMapping?.canonicalText ?? content.summary,
      source:
        content.curriculumMapping?.source.document ??
        "Bilim Türkiye atölye programı",
      locked: true,
    },
    profile,
    outcomeId,
    domainId: content.domainId,
    cohort: content.cohort,
    formatId: format.id,
    routeId: route.id,
    routeName: route.name,
    routeTier: route.tier,
    rejectedRoutes: rejected,
    generatorVersion: GENERATOR_VERSION,
    groupCount,
    estimatedCostTry,
    costs,
    materialPlan,
    adaptationSummary: route.adaptationSummary,
    stages,
    findings,
    generatedAt: "2026-08-24T12:00:00.000Z",
  };
}

export const DEFAULT_PROFILE: ResourceProfile = {
  durationMinutes: 60,
  classSize: 30,
  groupSize: 5,
  budgetTry: 50,
  hardBudget: true,
  hasInternet: false,
  hasElectricity: false,
  materials: ["paper", "pencil", "scissors", "tape", "tissue"],
  accessibilityNeeds: ["Yüksek kontrastlı basılı materyal"],
  outcomeId: DEFAULT_OUTCOME_ID,
  formatId: DEFAULT_FORMAT_ID,
};
