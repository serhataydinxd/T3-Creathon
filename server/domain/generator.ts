import {
  DEFAULT_OUTCOME_ID,
  getOutcomeContent,
  isOutcomeId,
  type OutcomeId,
  type WorkshopTopic,
} from "@/server/content/curriculum";
import { isCatalogueEntryId } from "@/server/content/catalogue";
import { buildProposalTopic, proposalSource } from "@/server/content/proposals";
import { WORKSHOP_DOMAINS } from "@/server/content/domains";
import { DEFAULT_FORMAT_ID, getFormat } from "@/server/content/formats";
import { SCHOOL_CLASSROOM } from "@/server/content/venues";
import { buildStagesForTopic, selectRouteForTopic } from "./routes";
import { buildCandidates } from "./candidates";
import { costRoute } from "./costing";
import type { Finding, ResourceProfile, WorkshopPlan } from "./types";

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
export const GENERATOR_VERSION = "2026-09-05.1";

export function resolveOutcomeId(profile: ResourceProfile): OutcomeId {
  const requested = profile.outcomeId;
  return requested && isOutcomeId(requested) ? requested : DEFAULT_OUTCOME_ID;
}

/**
 * A profile asks for a proposal only when it names a catalogue entry that
 * really exists. An unknown id falls back to the authored corpus rather than
 * failing: a stale link should show a workshop, not an error page.
 */
export function resolveProposalEntryId(profile: ResourceProfile): string | null {
  const requested = profile.proposalEntryId;
  return requested && isCatalogueEntryId(requested) ? requested : null;
}

export type TopicResolution = {
  topic: WorkshopTopic;
  status: "authored" | "proposal";
  /** Present only for authored topics; a proposal has no corpus entry. */
  outcomeId: OutcomeId | null;
};

export function resolveTopic(profile: ResourceProfile): TopicResolution {
  const proposalEntryId = resolveProposalEntryId(profile);
  if (proposalEntryId) {
    return {
      topic: buildProposalTopic(proposalEntryId, profile.materials),
      status: "proposal",
      outcomeId: null,
    };
  }
  const outcomeId = resolveOutcomeId(profile);
  return { topic: getOutcomeContent(outcomeId), status: "authored", outcomeId };
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
  const { topic: content, status: topicStatus, outcomeId } = resolveTopic(profile);
  const { route, rejected, uncertain } = selectRouteForTopic(content, profile);
  const stages = buildStagesForTopic(content, route, profile);
  const { materialPlan, costs, groupCount } = costRoute(route, profile);
  const estimatedCostTry = costs.totalTry;

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
  // Missing information, reported as missing information. A route left
  // unsettled must never be summarised as unavailable, and the finding names
  // what to check so the gap is actionable rather than merely disclosed.
  for (const unsettled of uncertain) {
    findings.push({
      code: "CAPABILITY_STATUS_UNKNOWN",
      severity: "warning",
      message: `${unsettled.routeName}: ${unsettled.reason}`,
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
  if (topicStatus === "proposal") {
    findings.push({
      code: "UNAUTHORED_TOPIC_PROPOSAL",
      severity: "warning",
      message:
        "Bu konu Bilim Türkiye kataloğunda yayımlanmıştır ancak İMKÂN'da onaylı içeriği yoktur. Üretilen oturum bir taslak öneridir ve pedagog onayı olmadan uygulanmamalıdır.",
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
      id: `objective-${outcomeId ?? content.catalogueEntryId}`,
      code: content.curriculumMapping?.code ?? WORKSHOP_DOMAINS[content.domainId].shortLabel,
      canonicalText: content.curriculumMapping?.canonicalText ?? content.summary,
      // A proposal's authority is the catalogue page the topic name came from,
      // not a curriculum document it has never been checked against.
      source:
        topicStatus === "proposal" && content.catalogueEntryId
          ? proposalSource(content.catalogueEntryId)
          : content.curriculumMapping?.source.document ?? "Bilim Türkiye atölye programı",
      locked: true,
      // Stamped from the corpus rather than assumed. A lock is about
      // immutability; saying "doğrulandı" is a claim about a person having
      // checked, and none of the corpus mappings have been checked yet.
      verification: content.curriculumMapping
        ? content.curriculumMapping.verification
        : ("none" as const),
    },
    profile,
    outcomeId: outcomeId ?? undefined,
    domainId: content.domainId,
    cohort: content.cohort,
    topicStatus,
    catalogueEntryId: content.catalogueEntryId,
    formatId: format.id,
    routeId: route.id,
    routeName: route.name,
    routeTier: route.tier,
    rejectedRoutes: rejected,
    uncertainRoutes: uncertain,
    candidates: buildCandidates(content, profile),
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
  // A school classroom verifiably has no centre facilities, so the default
  // profile states that rather than leaving three unknowns for the trainer.
  unavailableCapabilities: [...SCHOOL_CLASSROOM.unavailableCapabilities],
  accessibilityNeeds: ["Yüksek kontrastlı basılı materyal"],
  outcomeId: DEFAULT_OUTCOME_ID,
  formatId: DEFAULT_FORMAT_ID,
};
