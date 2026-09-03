import {
  ROUTE_TIER_ORDER,
  STAGE_IDENTITY,
  STAGE_KEYS,
  getOutcomeContent,
  type OutcomeId,
  type RouteDefinition,
  type StageBlueprint,
  type StageKey,
} from "@/server/content/curriculum";
import { MATERIALS } from "@/server/content/materials";
import type { ResourceProfile, RouteRejection, Stage } from "./types";

/**
 * Why a route could not be offered, in the teacher's terms. Returned rather
 * than discarded so the interface can explain the adaptation instead of
 * presenting one plan as if it were the only possibility.
 */
export function evaluateEligibility(
  route: RouteDefinition,
  profile: ResourceProfile,
): RouteRejection | null {
  const { eligibility } = route;
  if (eligibility.requiresElectricity && !profile.hasElectricity) {
    return {
      routeId: route.id,
      routeName: route.name,
      code: "NO_ELECTRICITY",
      reason: "Sınıfta elektrik bulunmadığı için bu rota uygulanamaz.",
    };
  }
  if (eligibility.requiresInternet && !profile.hasInternet) {
    return {
      routeId: route.id,
      routeName: route.name,
      code: "NO_INTERNET",
      reason: "Sınıfta internet bulunmadığı için bu rota uygulanamaz.",
    };
  }
  const missing = (eligibility.requiredMaterials ?? []).filter(
    (materialId) => !profile.materials.includes(materialId),
  );
  if (missing.length > 0) {
    return {
      routeId: route.id,
      routeName: route.name,
      code: "MISSING_MATERIALS",
      reason: `Gerekli malzemeler envanterde yok: ${missing
        .map((materialId) => MATERIALS[materialId].label)
        .join(", ")}.`,
    };
  }
  return null;
}

export type RouteSelection = {
  route: RouteDefinition;
  rejected: RouteRejection[];
};

/**
 * Picks the richest route the classroom can actually support. Every outcome
 * must keep a route with no requirements, so selection cannot fail — that
 * invariant is asserted in the corpus tests rather than handled at run time.
 */
export function selectRoute(outcomeId: OutcomeId, profile: ResourceProfile): RouteSelection {
  const routes = [...getOutcomeContent(outcomeId).routes].sort(
    (a, b) => ROUTE_TIER_ORDER.indexOf(a.tier) - ROUTE_TIER_ORDER.indexOf(b.tier),
  );
  const rejected: RouteRejection[] = [];
  for (const route of routes) {
    const rejection = evaluateEligibility(route, profile);
    if (rejection) {
      rejected.push(rejection);
      continue;
    }
    return { route, rejected };
  }
  throw new Error(`NO_ELIGIBLE_ROUTE:${outcomeId}`);
}

function resolveBlueprint(
  outcomeId: OutcomeId,
  route: RouteDefinition,
  key: StageKey,
): StageBlueprint {
  const base = getOutcomeContent(outcomeId).baseStages[key];
  const override = route.stageOverrides?.[key];
  return override ? { ...base, ...override } : base;
}

/**
 * Splits the requested duration across the 5E ratios. The last stage absorbs
 * the rounding remainder so the stage minutes always sum to exactly what the
 * teacher asked for.
 */
export function allocateMinutes(total: number): number[] {
  const values = STAGE_KEYS.map((key) => Math.max(4, Math.round(total * STAGE_IDENTITY[key].ratio)));
  values[values.length - 1] += total - values.reduce((sum, value) => sum + value, 0);
  return values;
}

export function buildStages(
  outcomeId: OutcomeId,
  route: RouteDefinition,
  profile: ResourceProfile,
): Stage[] {
  const minutes = allocateMinutes(profile.durationMinutes);
  return STAGE_KEYS.map((key, index) => {
    const blueprint = resolveBlueprint(outcomeId, route, key);
    return {
      key,
      name: STAGE_IDENTITY[key].name,
      shortName: STAGE_IDENTITY[key].shortName,
      minutes: minutes[index],
      title: blueprint.title,
      teacherAction: blueprint.teacherAction,
      studentAction: blueprint.studentAction,
      evidence: blueprint.evidence,
      materialKeys: [...blueprint.materials],
      objectiveConnection: blueprint.objectiveConnection,
    };
  });
}
