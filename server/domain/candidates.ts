import { MATERIALS } from "@/server/content/materials";
import { VENUE_CAPABILITIES } from "@/server/content/venues";
import { getFormat } from "@/server/content/formats";
import { AGE_COHORTS } from "@/server/content/domains";
import { ROUTE_TIER_ORDER, type RouteDefinition, type WorkshopTopic } from "@/server/content/curriculum";
import { evaluateRoute } from "./routes";
import { costRoute } from "./costing";
import type { ResourceProfile } from "./types";

/**
 * Every route a topic offers, with the reasons it can or cannot be delivered.
 *
 * Presenting one chosen route made the product look like it had made a
 * decision on the trainer's behalf. It had not — it applied rules — and the
 * rules are more useful than their conclusion: "the dome route needs a
 * planetarium and nobody has recorded whether this centre has one" tells a
 * trainer what to do, where a silently substituted paper-tube activity does
 * not.
 *
 * Every field here is computed. There is no score, and no model input: an
 * ordering a person cannot reconstruct is worse than a list.
 */
export type CandidateStatus = "ready" | "adaptable" | "uncertain" | "blocked";

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  ready: "Doğrudan uygulanabilir",
  adaptable: "Küçük uyarlamayla uygulanabilir",
  uncertain: "Bilgi eksikliği nedeniyle belirsiz",
  blocked: "Uygulanamaz",
};

/** Best first. Blocked routes stay on the list, last, with their reason. */
const STATUS_ORDER: CandidateStatus[] = ["ready", "adaptable", "uncertain", "blocked"];

export type RouteCandidate = {
  routeId: string;
  routeName: string;
  tier: RouteDefinition["tier"];
  status: CandidateStatus;
  /** Why, in the trainer's terms. Always at least one line. */
  reasons: string[];
  /** Materials the route needs that the profile does not have. */
  missingMaterials: string[];
  /** Facilities whose status nobody has established. */
  unknownCapabilities: string[];
  safetyNotes: string[];
  totalCostTry: number;
  acquisitionCostTry: number;
  /** True when acquiring what is missing would break a hard budget. */
  overBudget: boolean;
  substitutionNote?: string;
};

function fitReasons(topic: WorkshopTopic, profile: ResourceProfile): string[] {
  const format = getFormat(profile.formatId);
  const reasons = [`${AGE_COHORTS[topic.cohort].label} · ${format.label}`];
  if (profile.durationMinutes !== format.standardSessionMinutes) {
    reasons.push(
      `Süre ${profile.durationMinutes} dk; bu format için yayımlanmış süre ${format.standardSessionMinutes} dk.`,
    );
  }
  return reasons;
}

/**
 * Ranks the routes a topic offers for one profile.
 *
 * `ready` and `adaptable` are separated by acquisition cost rather than by
 * tier: a richer route the trainer already has everything for is directly
 * deliverable, and a plainer one needing a trip to a shop is not — which is
 * the distinction someone planning next week's session actually cares about.
 */
export function buildCandidates(
  topic: WorkshopTopic,
  profile: ResourceProfile,
): RouteCandidate[] {
  const candidates = topic.routes.map((route): RouteCandidate => {
    const verdict = evaluateRoute(route, profile);
    const { costs } = costRoute(route, profile);
    const missingMaterials = (route.eligibility.requiredMaterials ?? []).filter(
      (materialId) => !profile.materials.includes(materialId),
    );
    const overBudget = profile.hardBudget && costs.acquisitionTry > profile.budgetTry;

    const base = {
      routeId: route.id,
      routeName: route.name,
      tier: route.tier,
      missingMaterials: missingMaterials.map((id) => MATERIALS[id].label),
      unknownCapabilities: [] as string[],
      safetyNotes: [...(route.safetyNotes ?? [])],
      totalCostTry: costs.totalTry,
      acquisitionCostTry: costs.acquisitionTry,
      overBudget,
      substitutionNote: route.substitutionNote,
    };
    const fit = fitReasons(topic, profile);

    if (verdict.status === "blocked") {
      return { ...base, status: "blocked", reasons: [verdict.rejection.reason, ...fit] };
    }
    if (verdict.status === "uncertain") {
      return {
        ...base,
        status: "uncertain",
        unknownCapabilities: verdict.uncertainty.unknownCapabilities.map(
          (capability) => VENUE_CAPABILITIES[capability as keyof typeof VENUE_CAPABILITIES].label,
        ),
        reasons: [verdict.uncertainty.reason, ...fit],
      };
    }
    if (costs.acquisitionTry > 0) {
      return {
        ...base,
        status: "adaptable",
        reasons: [
          overBudget
            ? `Temin edilmesi gereken ${costs.acquisitionTry} ₺, ${profile.budgetTry} ₺ kesin bütçeyi aşıyor.`
            : `Elde olmayan malzemeler için ${costs.acquisitionTry} ₺ gerekiyor.`,
          ...fit,
        ],
      };
    }
    return {
      ...base,
      status: "ready",
      reasons: ["Gereken her şey elde; ek temin gerekmiyor.", ...fit],
    };
  });

  return candidates.sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    // Within a status, the richer delivery first: it is the one a trainer
    // would pick if both are equally possible.
    return ROUTE_TIER_ORDER.indexOf(a.tier) - ROUTE_TIER_ORDER.indexOf(b.tier);
  });
}

/**
 * The handful worth showing. Capped at three because a list long enough to
 * need scanning stops being an explanation, and a blocked route is only worth
 * the space when nothing better fills it.
 */
export function topCandidates(candidates: RouteCandidate[], limit = 3): RouteCandidate[] {
  return candidates.slice(0, limit);
}
