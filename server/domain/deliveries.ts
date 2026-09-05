import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  centres,
  deliveryMaterials,
  deliveryRecords,
  deliveryReports,
  deliveryStages,
  reportTransitions,
  users,
  workshopVersions,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/session";
import type { WorkshopPlan } from "./types";

/**
 * Recording what actually happened when a published workshop was delivered.
 *
 * The rule that shapes everything here: planned and actual never share a
 * field. The plan is frozen into a snapshot when the delivery starts, and the
 * observations sit beside it. A report whose "planned duration" quietly became
 * the delivered one would be worthless as a record, and it is the comparison —
 * 24 expected, 21 present — that makes it worth writing at all.
 */

export type DeliveryStageOutcome = "applied" | "modified" | "skipped";

export type DeliveryInput = {
  deliveredOn?: string | null;
  actualParticipants?: number | null;
  actualGroups?: number | null;
  actualMinutes?: number | null;
  actualCostTry?: number | null;
  whatWorked?: string | null;
  whatWasHard?: string | null;
  accessibilityApplied?: string | null;
  safetyObservation?: string | null;
  incidentOccurred?: boolean;
  nextTime?: string | null;
  visibility?: "private" | "centre" | "public";
  stages?: { stageKey: string; outcome: DeliveryStageOutcome; note?: string | null; evidenceObserved?: string | null }[];
  materials?: { materialId: string; plannedQuantity?: number | null; actualQuantity?: number | null; substituteMaterialId?: string | null; note?: string | null }[];
};

/**
 * Starts a delivery record against a published workshop version.
 *
 * Only published versions, because a delivery is a claim that this session was
 * run with children in a room: a draft has not been through pedagogical review
 * and must not be deliverable, let alone reportable.
 */
export async function startDelivery(
  user: AuthUser,
  versionId: string,
  centreSlug: string | null,
): Promise<string> {
  if (!(["educator", "manager"] as AuthUser["role"][]).includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  const db = getDb();
  const [version] = await db
    .select({ id: workshopVersions.id, status: workshopVersions.status, content: workshopVersions.content })
    .from(workshopVersions)
    .where(eq(workshopVersions.id, versionId))
    .limit(1);
  if (!version) throw new Error("VERSION_NOT_FOUND");
  if (version.status !== "published") throw new Error("VERSION_NOT_PUBLISHED");

  let centreId: string | null = null;
  if (centreSlug) {
    const [centre] = await db
      .select({ id: centres.id })
      .from(centres)
      .where(eq(centres.slug, centreSlug))
      .limit(1);
    if (!centre) throw new Error("CENTRE_NOT_FOUND");
    centreId = centre.id;
  }

  const plan = version.content as WorkshopPlan;
  return db.transaction(async (tx) => {
    const [record] = await tx
      .insert(deliveryRecords)
      .values({
        versionId,
        centreId,
        educatorId: user.id,
        // Frozen here and never rewritten. A later revision of the workshop
        // must not change what this report says was planned.
        planSnapshot: plan,
        actualParticipants: null,
        actualGroups: null,
        actualMinutes: null,
      })
      .returning({ id: deliveryRecords.id });

    // Seed one row per planned stage so the educator confirms or corrects each
    // rather than remembering which ones to mention.
    for (const stage of plan.stages ?? []) {
      await tx.insert(deliveryStages).values({
        deliveryId: record.id,
        stageKey: stage.key,
        outcome: "applied",
      });
    }
    for (const line of plan.materialPlan ?? []) {
      await tx.insert(deliveryMaterials).values({
        deliveryId: record.id,
        materialId: line.key,
        plannedQuantity: Math.round(line.totalQuantity),
      });
    }
    return record.id;
  });
}

/** Saves observations. Never touches the snapshot. */
export async function saveDeliveryObservations(
  user: AuthUser,
  deliveryId: string,
  input: DeliveryInput,
): Promise<void> {
  const db = getDb();
  const record = await requireOwnDelivery(user, deliveryId);
  const latest = await latestReport(deliveryId);
  // Once a report is with a reviewer or approved, the facts behind it are
  // fixed; changing them would leave the reviewer looking at a different
  // session from the one they read.
  if (latest && !["draft", "changes_requested"].includes(latest.status)) {
    throw new Error("DELIVERY_LOCKED");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(deliveryRecords)
      .set({
        deliveredOn: input.deliveredOn ?? record.deliveredOn,
        actualParticipants: input.actualParticipants ?? record.actualParticipants,
        actualGroups: input.actualGroups ?? record.actualGroups,
        actualMinutes: input.actualMinutes ?? record.actualMinutes,
        actualCostTry: input.actualCostTry ?? record.actualCostTry,
        whatWorked: input.whatWorked ?? record.whatWorked,
        whatWasHard: input.whatWasHard ?? record.whatWasHard,
        accessibilityApplied: input.accessibilityApplied ?? record.accessibilityApplied,
        safetyObservation: input.safetyObservation ?? record.safetyObservation,
        incidentOccurred: input.incidentOccurred ?? record.incidentOccurred,
        nextTime: input.nextTime ?? record.nextTime,
        visibility: input.visibility ?? record.visibility,
        updatedAt: new Date(),
      })
      .where(eq(deliveryRecords.id, deliveryId));

    for (const stage of input.stages ?? []) {
      // A changed or skipped stage without a reason is not a record of
      // anything, so the domain refuses it rather than storing a blank.
      if (stage.outcome !== "applied" && !stage.note?.trim()) {
        throw new Error("STAGE_CHANGE_NEEDS_REASON");
      }
      await tx
        .update(deliveryStages)
        .set({
          outcome: stage.outcome,
          note: stage.note?.trim() || null,
          evidenceObserved: stage.evidenceObserved?.trim() || null,
        })
        .where(
          and(eq(deliveryStages.deliveryId, deliveryId), eq(deliveryStages.stageKey, stage.stageKey)),
        );
    }
    for (const material of input.materials ?? []) {
      await tx
        .update(deliveryMaterials)
        .set({
          actualQuantity: material.actualQuantity ?? null,
          substituteMaterialId: material.substituteMaterialId ?? null,
          note: material.note?.trim() || null,
        })
        .where(
          and(
            eq(deliveryMaterials.deliveryId, deliveryId),
            eq(deliveryMaterials.materialId, material.materialId),
          ),
        );
    }
  });
}

async function requireOwnDelivery(user: AuthUser, deliveryId: string) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(deliveryRecords)
    .where(eq(deliveryRecords.id, deliveryId))
    .limit(1);
  if (!record) throw new Error("DELIVERY_NOT_FOUND");
  // A manager may correct any record; an educator only their own.
  if (user.role !== "manager" && record.educatorId !== user.id) throw new Error("FORBIDDEN");
  return record;
}

export async function latestReport(deliveryId: string) {
  const db = getDb();
  const [report] = await db
    .select()
    .from(deliveryReports)
    .where(eq(deliveryReports.deliveryId, deliveryId))
    .orderBy(desc(deliveryReports.version))
    .limit(1);
  return report ?? null;
}

/** The whole record, for the report view and the AI brief. */
export async function getDelivery(user: AuthUser, deliveryId: string) {
  const db = getDb();
  const [record] = await db
    .select({
      record: deliveryRecords,
      centreName: centres.name,
      centreLocation: centres.location,
      educatorName: users.name,
      versionTitle: workshopVersions.title,
      versionNumber: workshopVersions.version,
    })
    .from(deliveryRecords)
    .leftJoin(centres, eq(deliveryRecords.centreId, centres.id))
    .innerJoin(users, eq(deliveryRecords.educatorId, users.id))
    .innerJoin(workshopVersions, eq(deliveryRecords.versionId, workshopVersions.id))
    .where(eq(deliveryRecords.id, deliveryId))
    .limit(1);
  if (!record) throw new Error("DELIVERY_NOT_FOUND");

  const report = await latestReport(deliveryId);
  const visibleToEveryone = report?.status === "published" && record.record.visibility === "public";
  const isOwner = record.record.educatorId === user.id;
  const isReviewer = user.role === "pedagogue" || user.role === "manager";
  if (!visibleToEveryone && !isOwner && !isReviewer) throw new Error("FORBIDDEN");

  const stages = await db
    .select()
    .from(deliveryStages)
    .where(eq(deliveryStages.deliveryId, deliveryId));
  const materials = await db
    .select()
    .from(deliveryMaterials)
    .where(eq(deliveryMaterials.deliveryId, deliveryId));

  return { ...record, report, stages, materials };
}

/** Deliveries the signed-in user is allowed to see listed. */
export async function listDeliveries(user: AuthUser) {
  const db = getDb();
  const rows = await db
    .select({
      id: deliveryRecords.id,
      deliveredOn: deliveryRecords.deliveredOn,
      versionTitle: workshopVersions.title,
      centreName: centres.name,
      educatorId: deliveryRecords.educatorId,
      educatorName: users.name,
      visibility: deliveryRecords.visibility,
    })
    .from(deliveryRecords)
    .leftJoin(centres, eq(deliveryRecords.centreId, centres.id))
    .innerJoin(users, eq(deliveryRecords.educatorId, users.id))
    .innerJoin(workshopVersions, eq(deliveryRecords.versionId, workshopVersions.id))
    .orderBy(desc(deliveryRecords.createdAt));

  if (user.role === "pedagogue" || user.role === "manager") return rows;
  return rows.filter((row) => row.educatorId === user.id);
}

export async function recordReportTransition(input: {
  reportId: string;
  from: (typeof reportTransitions.$inferInsert)["fromStatus"];
  to: (typeof reportTransitions.$inferInsert)["toStatus"];
  actorId: string;
  note: string;
}): Promise<void> {
  await getDb().insert(reportTransitions).values({
    reportId: input.reportId,
    fromStatus: input.from,
    toStatus: input.to,
    actorId: input.actorId,
    note: input.note,
  });
}
