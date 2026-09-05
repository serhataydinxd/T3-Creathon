import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  adaptationRecords,
  centres,
  deliveryRecords,
  generationRuns,
  libraryEntries,
  users,
  workshopVersions,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/session";
import { requireTopicRowId, resolveOutcomeRowId } from "./topic-store";
import { resolveProposalEntryId, resolveTopic } from "./generator";
import { VENUE_CAPABILITIES } from "@/server/content/venues";
import { getFormat } from "@/server/content/formats";
import { generateWorkshop } from "./generator";
import type { Finding, ResourceProfile, WorkshopPlan } from "./types";

/**
 * Comparing a delivered session against another centre.
 *
 * Every line of this is computed. An adaptation is a claim that a session can
 * or cannot be run somewhere else, and the reasons behind it are what a
 * trainer acts on — so the model has no part in producing them, and there is
 * no score to reconstruct.
 *
 * The source is never touched. Adapting produces a new draft; the workshop
 * version and the report it came from are read and left exactly as they were.
 */

export type CompatibilityStatus = "compatible" | "adaptable" | "incompatible" | "unknown-centre";

export const COMPATIBILITY_LABEL: Record<CompatibilityStatus, string> = {
  compatible: "Tam uyumlu",
  adaptable: "Uyarlanabilir",
  incompatible: "Uyumsuz",
  "unknown-centre": "Merkez bilgileri eksik",
};

export type CompatibilityFinding = {
  code:
    | "REQUIREMENTS_MET"
    | "CAPABILITY_VERIFIED_MISSING"
    | "CAPABILITY_UNKNOWN"
    | "ROUTE_CHANGED"
    | "GROUP_COUNT_CHANGED"
    | "COST_CHANGED"
    | "BUDGET_EXCEEDED"
    | "FORMAT_DIFFERENT"
    | "MATERIALS_TO_ACQUIRE"
    | "SAFETY_CONSTRAINT";
  severity: "info" | "warning" | "blocker";
  message: string;
};

export type CompatibilityReport = {
  status: CompatibilityStatus;
  findings: CompatibilityFinding[];
  sourceRouteId?: string;
  targetRouteId?: string;
  sourceRouteName?: string;
  targetRouteName?: string;
  sourceGroupCount: number;
  targetGroupCount: number;
  sourceCostTry: number;
  targetCostTry: number;
  acquisitionCostTry: number;
  /** Alternative routes already approved for this topic, ready at the target. */
  approvedAlternatives: { routeId: string; routeName: string; status: string }[];
};

/**
 * The profile the target centre would run under.
 *
 * Everything about the session that is a pedagogical decision — topic,
 * duration, group size, format — is carried across unchanged. Only the things
 * that are properties of the venue are replaced, because those are the only
 * things adapting is supposed to change.
 */
export function profileForCentre(
  source: ResourceProfile,
  target: {
    capabilities: string[];
    unavailableCapabilities: string[];
    materials?: ResourceProfile["materials"];
    classSize?: number;
    budgetTry?: number;
  },
): ResourceProfile {
  return {
    ...source,
    capabilities: target.capabilities,
    unavailableCapabilities: target.unavailableCapabilities,
    materials: target.materials ?? source.materials,
    classSize: target.classSize ?? source.classSize,
    budgetTry: target.budgetTry ?? source.budgetTry,
    // Stock counts belong to the source venue and say nothing about the target.
    materialStock: {},
  };
}

function blockers(findings: Finding[]): Finding[] {
  return findings.filter((finding) => finding.severity === "blocker");
}

/**
 * Deterministic comparison of a delivered plan against a target centre.
 *
 * "Merkez bilgileri eksik" outranks every other verdict when the route the
 * source actually used needs a facility nobody has recorded at the target:
 * calling that incompatible would repeat the mistake the three-state model
 * exists to prevent, and calling it adaptable would paper over a real unknown.
 */
export function compareForCentre(
  sourcePlan: WorkshopPlan,
  targetProfile: ResourceProfile,
): CompatibilityReport {
  const target = generateWorkshop(targetProfile);
  const findings: CompatibilityFinding[] = [];

  const targetCandidate = target.candidates?.find(
    (candidate) => candidate.routeId === target.routeId,
  );
  const sourceRouteAtTarget = target.candidates?.find(
    (candidate) => candidate.routeId === sourcePlan.routeId,
  );

  const unknown = sourceRouteAtTarget?.unknownCapabilities ?? [];
  const routeChanged = sourcePlan.routeId !== target.routeId;

  if (unknown.length > 0) {
    findings.push({
      code: "CAPABILITY_UNKNOWN",
      severity: "warning",
      message: `Kaynak oturumun kullandığı rota için gereken donanımın durumu hedef merkezde bilinmiyor: ${unknown.join(", ")}. Yok sayılmadı.`,
    });
  }

  const verifiedMissing = (sourcePlan.profile.capabilities ?? []).filter((capability) =>
    (targetProfile.unavailableCapabilities ?? []).includes(capability),
  );
  if (verifiedMissing.length > 0) {
    findings.push({
      code: "CAPABILITY_VERIFIED_MISSING",
      severity: "warning",
      message: `Hedef merkezde bulunmadığı doğrulanmış donanım: ${verifiedMissing
        .map((capability) => VENUE_CAPABILITIES[capability as keyof typeof VENUE_CAPABILITIES]?.label ?? capability)
        .join(", ")}.`,
    });
  }

  if (routeChanged) {
    findings.push({
      code: "ROUTE_CHANGED",
      severity: "info",
      message: `Rota değişti: "${sourcePlan.routeName}" yerine "${target.routeName}" kullanılacak.`,
    });
  } else if (unknown.length === 0 && verifiedMissing.length === 0) {
    findings.push({
      code: "REQUIREMENTS_MET",
      severity: "info",
      message: "Kaynak oturumun koşulları hedef merkezde karşılanıyor.",
    });
  }

  if (sourcePlan.groupCount !== target.groupCount) {
    findings.push({
      code: "GROUP_COUNT_CHANGED",
      severity: "info",
      message: `Grup sayısı ${sourcePlan.groupCount} yerine ${target.groupCount} olacak; malzeme miktarları buna göre yeniden hesaplandı.`,
    });
  }

  if (sourcePlan.estimatedCostTry !== target.estimatedCostTry) {
    findings.push({
      code: "COST_CHANGED",
      severity: "info",
      message: `Tahmini maliyet ${sourcePlan.estimatedCostTry} ₺ yerine ${target.estimatedCostTry} ₺.`,
    });
  }

  const acquisition = target.costs?.acquisitionTry ?? 0;
  if (acquisition > 0) {
    findings.push({
      code: "MATERIALS_TO_ACQUIRE",
      severity: "warning",
      message: `Hedef merkezde olmayan malzemeler için ${acquisition} ₺ temin gerekiyor.`,
    });
  }

  const sourceFormat = getFormat(sourcePlan.profile.formatId);
  const targetFormat = getFormat(targetProfile.formatId);
  if (sourceFormat.id !== targetFormat.id) {
    findings.push({
      code: "FORMAT_DIFFERENT",
      severity: "info",
      message: `Format ${sourceFormat.label} yerine ${targetFormat.label}.`,
    });
  }

  for (const safety of targetCandidate?.safetyNotes ?? []) {
    findings.push({ code: "SAFETY_CONSTRAINT", severity: "warning", message: safety });
  }

  const targetBlockers = blockers(target.findings);
  for (const blocker of targetBlockers) {
    findings.push({ code: "BUDGET_EXCEEDED", severity: "blocker", message: blocker.message });
  }

  const status: CompatibilityStatus =
    targetBlockers.length > 0
      ? "incompatible"
      : unknown.length > 0
        ? "unknown-centre"
        : !routeChanged && acquisition === 0
          ? "compatible"
          : "adaptable";

  return {
    status,
    findings,
    sourceRouteId: sourcePlan.routeId,
    targetRouteId: target.routeId,
    sourceRouteName: sourcePlan.routeName,
    targetRouteName: target.routeName,
    sourceGroupCount: sourcePlan.groupCount,
    targetGroupCount: target.groupCount,
    sourceCostTry: sourcePlan.estimatedCostTry,
    targetCostTry: target.estimatedCostTry,
    acquisitionCostTry: acquisition,
    // Already-authored routes for the same topic, so a trainer sees what else
    // is available rather than only the one the rules picked.
    approvedAlternatives: (target.candidates ?? [])
      .filter((candidate) => candidate.routeId !== target.routeId)
      .slice(0, 3)
      .map((candidate) => ({
        routeId: candidate.routeId,
        routeName: candidate.routeName,
        status: candidate.status,
      })),
  };
}

/**
 * Creates an independent draft of a library entry for another centre.
 *
 * "Independent" is the load-bearing word. The source version, its report and
 * the library entry are read and left untouched; what comes out is a new draft
 * that must go through the ordinary review before it can be delivered. An
 * adaptation that edited its source would quietly rewrite the record of a
 * session someone else already ran.
 *
 * The topic is carried across unchanged. Changing it would make this a
 * different workshop rather than an adaptation of this one, so the caller
 * cannot: only venue-shaped inputs are replaced.
 */
export async function adaptForCentre(
  user: AuthUser,
  input: {
    libraryEntryId: string;
    targetCentreSlug: string | null;
    targetProfile: ResourceProfile;
  },
): Promise<{ versionId: string; compatibility: CompatibilityReport }> {
  if (!(["educator", "content_expert", "manager"] as AuthUser["role"][]).includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  const db = getDb();
  const [entry] = await db
    .select()
    .from(libraryEntries)
    .where(eq(libraryEntries.id, input.libraryEntryId))
    .limit(1);
  if (!entry) throw new Error("ENTRY_NOT_FOUND");

  const [delivery] = await db
    .select({ record: deliveryRecords, sourceVersionId: deliveryRecords.versionId })
    .from(deliveryRecords)
    .where(eq(deliveryRecords.id, entry.deliveryId))
    .limit(1);
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");

  const sourcePlan = delivery.record.planSnapshot as WorkshopPlan;
  // The topic is not the caller's to change, so it is taken from the source
  // rather than from anything the request supplied.
  const profile: ResourceProfile = {
    ...input.targetProfile,
    outcomeId: sourcePlan.profile.outcomeId,
    proposalEntryId: sourcePlan.profile.proposalEntryId,
  };
  const compatibility = compareForCentre(sourcePlan, profile);
  const plan = generateWorkshop(profile);

  let targetCentreId: string | null = null;
  if (input.targetCentreSlug) {
    const [centre] = await db
      .select({ id: centres.id })
      .from(centres)
      .where(eq(centres.slug, input.targetCentreSlug))
      .limit(1);
    targetCentreId = centre?.id ?? null;
  }

  return db.transaction(async (tx) => {
    const selection = {
      outcomeId: resolveTopic(profile).outcomeId,
      proposalEntryId: resolveProposalEntryId(profile),
    };
    const topicId = await requireTopicRowId(tx, selection);
    const objectiveId = await resolveOutcomeRowId(tx, selection);

    const [run] = await tx
      .insert(generationRuns)
      .values({
        topicId,
        objectiveId,
        requestedBy: user.id,
        idempotencyKey: `adapt:${input.libraryEntryId}:${user.id}:${Date.now()}`,
        requestHash: createHash("sha256").update(JSON.stringify(profile)).digest("hex"),
        mode: "replay",
        status: "ready_for_review",
        request: profile,
        objectiveSnapshot: plan.objective,
      })
      .returning({ id: generationRuns.id });

    const [version] = await tx
      .insert(workshopVersions)
      .values({
        runId: run.id,
        title: plan.title,
        content: plan,
        contentHash: createHash("sha256").update(JSON.stringify(plan)).digest("hex"),
        createdBy: user.id,
      })
      .returning({ id: workshopVersions.id });

    await tx.insert(adaptationRecords).values({
      libraryEntryId: input.libraryEntryId,
      sourceVersionId: delivery.sourceVersionId,
      targetVersionId: version.id,
      targetCentreId,
      adaptedBy: user.id,
      compatibility,
    });

    // Denormalised on the entry so the library can sort by it without a join.
    await tx
      .update(libraryEntries)
      .set({ adaptationCount: entry.adaptationCount + 1 })
      .where(eq(libraryEntries.id, input.libraryEntryId));

    return { versionId: version.id, compatibility };
  });
}

/** Provenance for a draft that came from a library entry, if it did. */
export async function adaptationOrigin(versionId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      record: adaptationRecords,
      entryTitle: libraryEntries.title,
      entryId: libraryEntries.id,
      sourceCentre: libraryEntries.centreName,
      adaptedByName: users.name,
    })
    .from(adaptationRecords)
    .innerJoin(libraryEntries, eq(adaptationRecords.libraryEntryId, libraryEntries.id))
    .innerJoin(users, eq(adaptationRecords.adaptedBy, users.id))
    .where(eq(adaptationRecords.targetVersionId, versionId))
    .limit(1);
  return row ?? null;
}
