import {
  ROUTE_TIER_ORDER,
  STAGE_IDENTITY,
  STAGE_KEYS,
  getOutcomeContent,
  type OutcomeId,
  type WorkshopTopic,
  type RouteDefinition,
  type StageBlueprint,
  type StageKey,
} from "@/server/content/curriculum";
import { MATERIALS } from "@/server/content/materials";
import { VENUE_CAPABILITIES } from "@/server/content/venues";
import { getFormat } from "@/server/content/formats";
import type { ResourceProfile, RouteRejection, RouteUncertainty, Stage } from "./types";

/**
 * Whether a route can be offered, ruled out, or neither.
 *
 * Three verdicts rather than two, because a venue facility has three states.
 * Treating "nobody recorded whether this centre has a dome" as "this centre
 * has no dome" discards a route on the strength of missing paperwork, which is
 * exactly the judgement the product exists to avoid making silently.
 *
 * Definite failures are checked before unknowns: a route that also needs
 * electricity the room does not have is blocked whatever the dome's status, and
 * saying so is more useful than asking someone to go and check a facility that
 * would not have helped.
 *
 * Within the definite failures the order is deliberate — power, connectivity,
 * format, verified-absent facilities, then stock. A trainer can buy a lens
 * before the next session but cannot build a planetarium, so the less fixable
 * blocker is the more useful thing to say.
 */
export type RouteVerdict =
  | { status: "eligible" }
  | { status: "blocked"; rejection: RouteRejection }
  | { status: "uncertain"; uncertainty: RouteUncertainty };

export function evaluateRoute(route: RouteDefinition, profile: ResourceProfile): RouteVerdict {
  const { eligibility } = route;
  const blocked = (code: RouteRejection["code"], reason: string): RouteVerdict => ({
    status: "blocked",
    rejection: { routeId: route.id, routeName: route.name, code, reason },
  });

  if (eligibility.requiresElectricity && !profile.hasElectricity) {
    return blocked("NO_ELECTRICITY", "Sınıfta elektrik bulunmadığı için bu rota uygulanamaz.");
  }
  if (eligibility.requiresInternet && !profile.hasInternet) {
    return blocked("NO_INTERNET", "Sınıfta internet bulunmadığı için bu rota uygulanamaz.");
  }
  const format = getFormat(profile.formatId);
  const required = eligibility.requiredCapabilities ?? [];
  if (!format.allowsVenueCapabilities && required.length > 0) {
    return blocked("NOT_IN_FORMAT", `${format.label} formatında merkez donanımı kullanılamaz.`);
  }

  const present = profile.capabilities ?? [];
  // Presence wins if a profile somehow asserts both. The request schema
  // rejects that contradiction at the edge, so reaching here means malformed
  // input, and of the two readings only this one avoids discarding a route on
  // the strength of a claim the same profile contradicts.
  const verifiedAbsent = (profile.unavailableCapabilities ?? []).filter(
    (capability) => !present.includes(capability),
  );
  const missing = required.filter((capability) => verifiedAbsent.includes(capability));
  if (missing.length > 0) {
    return blocked(
      "MISSING_CAPABILITY",
      `Mekânda gereken donanım yok: ${missing
        .map((capability) => VENUE_CAPABILITIES[capability].label)
        .join(", ")}.`,
    );
  }

  const missingMaterials = (eligibility.requiredMaterials ?? []).filter(
    (materialId) => !profile.materials.includes(materialId),
  );
  if (missingMaterials.length > 0) {
    return blocked(
      "MISSING_MATERIALS",
      `Gerekli malzemeler envanterde yok: ${missingMaterials
        .map((materialId) => MATERIALS[materialId].label)
        .join(", ")}.`,
    );
  }

  // Nothing rules the route out. It can still only be offered if every facility
  // it needs is confirmed present; anything unrecorded leaves it unsettled.
  const unknown = required.filter(
    (capability) => !present.includes(capability) && !verifiedAbsent.includes(capability),
  );
  if (unknown.length > 0) {
    const labels = unknown.map((capability) => VENUE_CAPABILITIES[capability].label).join(", ");
    return {
      status: "uncertain",
      uncertainty: {
        routeId: route.id,
        routeName: route.name,
        code: "CAPABILITY_UNKNOWN",
        unknownCapabilities: [...unknown],
        reason: `Bu rota için gereken donanımın durumu bilinmiyor: ${labels}. Yok sayılmadı; merkezde varsa işaretleyin, yoksa yok olarak doğrulayın.`,
      },
    };
  }
  return { status: "eligible" };
}

/**
 * Kept as the older boolean-shaped answer for callers that only need to know
 * whether a route is ruled out. An uncertain route is not a rejection, so it
 * reports null here — the caller that cares must read the verdict.
 */
export function evaluateEligibility(
  route: RouteDefinition,
  profile: ResourceProfile,
): RouteRejection | null {
  const verdict = evaluateRoute(route, profile);
  return verdict.status === "blocked" ? verdict.rejection : null;
}

export type RouteSelection = {
  route: RouteDefinition;
  rejected: RouteRejection[];
  /**
   * Routes left unsettled by unknown facility status. Reported rather than
   * chosen: selecting one would amount to assuming the dome is there.
   */
  uncertain: RouteUncertainty[];
};

/**
 * Picks the richest route the classroom can actually support. Every outcome
 * must keep a route with no requirements, so selection cannot fail — that
 * invariant is asserted in the corpus tests rather than handled at run time.
 */
export function selectRoute(outcomeId: OutcomeId, profile: ResourceProfile): RouteSelection {
  return selectRouteForTopic(getOutcomeContent(outcomeId), profile);
}

/**
 * The same selection against a topic that may not be in the corpus. A proposal
 * for an unauthored catalogue entry is a WorkshopTopic like any other, so it
 * goes through identical eligibility rules rather than a lenient side path.
 */
export function selectRouteForTopic(
  topic: WorkshopTopic,
  profile: ResourceProfile,
): RouteSelection {
  const routes = [...topic.routes].sort(
    (a, b) => ROUTE_TIER_ORDER.indexOf(a.tier) - ROUTE_TIER_ORDER.indexOf(b.tier),
  );
  const rejected: RouteRejection[] = [];
  const uncertain: RouteUncertainty[] = [];
  for (const route of routes) {
    const verdict = evaluateRoute(route, profile);
    if (verdict.status === "blocked") {
      rejected.push(verdict.rejection);
      continue;
    }
    // An unconfirmed route is passed over for delivery but kept on the record,
    // so the plan can say what would have to be checked to unlock it.
    if (verdict.status === "uncertain") {
      uncertain.push(verdict.uncertainty);
      continue;
    }
    return { route, rejected, uncertain };
  }
  throw new Error(`NO_ELIGIBLE_ROUTE:${topic.catalogueEntryId ?? topic.title}`);
}

function resolveBlueprint(
  topic: WorkshopTopic,
  route: RouteDefinition,
  key: StageKey,
): StageBlueprint {
  const base = topic.baseStages[key];
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
  return buildStagesForTopic(getOutcomeContent(outcomeId), route, profile);
}

export function buildStagesForTopic(
  topic: WorkshopTopic,
  route: RouteDefinition,
  profile: ResourceProfile,
): Stage[] {
  const minutes = allocateMinutes(profile.durationMinutes);
  return STAGE_KEYS.map((key, index) => {
    const blueprint = resolveBlueprint(topic, route, key);
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
