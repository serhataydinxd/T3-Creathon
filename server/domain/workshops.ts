import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  educatorFeedback,
  generationRuns,
  objectives,
  reviews,
  users,
  versionTransitions,
  workshopVersions,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/session";
import type { ResourceProfile, WorkshopPlan } from "./types";
import { DEMO_OBJECTIVE } from "./fixtures";
import { generateWorkshop } from "./generator";
import { mergeAuthoredWorkshop, type AuthoredWorkshop } from "@/server/ai/authoring";

export type WorkshopRecord = {
  id: string;
  status: "draft" | "submitted" | "changes_requested" | "approved" | "published" | "superseded";
  title: string;
  content: WorkshopPlan;
  version: number;
  createdBy: string;
  authorName: string;
  approvedBy: string | null;
  createdAt: Date;
};

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function createDraft(
  user: AuthUser,
  profile: ResourceProfile,
  idempotencyKey: string,
  authored?: AuthoredWorkshop,
) {
  if (!(["content_expert", "pedagogue"] as AuthUser["role"][]).includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  const db = getDb();
  const requestHash = hashJson(profile);
  // The skeleton is always recomputed here, so authored prose can change how a
  // draft reads but never its stages, minutes, materials, cost or findings.
  const skeleton = generateWorkshop(profile);
  const plan = authored ? mergeAuthoredWorkshop(skeleton, authored) : skeleton;
  if (plan.findings.some((finding) => finding.severity === "blocker")) throw new Error("PLAN_BLOCKED");

  return db.transaction(async (tx) => {
    const [objective] = await tx
      .select({ id: objectives.id })
      .from(objectives)
      .where(eq(objectives.code, DEMO_OBJECTIVE.code))
      .limit(1);
    if (!objective) throw new Error("OBJECTIVE_NOT_SEEDED");

    const [insertedRun] = await tx
      .insert(generationRuns)
      .values({ objectiveId: objective.id, requestedBy: user.id, idempotencyKey, requestHash, mode: plan.mode === "LIVE" ? "live" : "replay", status: "ready_for_review", request: profile, objectiveSnapshot: plan.objective })
      .onConflictDoNothing({ target: [generationRuns.requestedBy, generationRuns.idempotencyKey] })
      .returning({ id: generationRuns.id });
    if (!insertedRun) {
      const [existingRun] = await tx
        .select({ id: generationRuns.id, requestHash: generationRuns.requestHash })
        .from(generationRuns)
        .where(and(eq(generationRuns.requestedBy, user.id), eq(generationRuns.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (!existingRun) throw new Error("IDEMPOTENCY_RACE");
      if (existingRun.requestHash !== requestHash) throw new Error("IDEMPOTENCY_KEY_REUSED");
      const [existingVersion] = await tx
        .select({ id: workshopVersions.id })
        .from(workshopVersions)
        .where(eq(workshopVersions.runId, existingRun.id))
        .limit(1);
      if (existingVersion) return existingVersion.id;
      throw new Error("IDEMPOTENCY_RACE");
    }
    const [version] = await tx
      .insert(workshopVersions)
      .values({
        runId: insertedRun.id,
        title: plan.title,
        content: plan,
        contentHash: hashJson(plan),
        createdBy: user.id,
      })
      .returning({ id: workshopVersions.id });
    return version.id;
  });
}

export async function listWorkshops(user: AuthUser) {
  const db = getDb();
  const condition =
    user.role === "educator"
      ? eq(workshopVersions.status, "published")
      : user.role === "content_expert"
        ? or(eq(workshopVersions.createdBy, user.id), eq(workshopVersions.status, "published"))
        : user.role === "pedagogue"
          ? inArray(workshopVersions.status, ["submitted", "published", "changes_requested"])
          : undefined;
  let query = db
    .select({
      id: workshopVersions.id,
      title: workshopVersions.title,
      status: workshopVersions.status,
      version: workshopVersions.version,
      authorName: users.name,
      createdAt: workshopVersions.createdAt,
    })
    .from(workshopVersions)
    .innerJoin(users, eq(workshopVersions.createdBy, users.id))
    .orderBy(desc(workshopVersions.updatedAt));
  if (condition) query = query.where(condition) as typeof query;
  return query;
}

export async function getWorkshop(user: AuthUser, id: string): Promise<WorkshopRecord | null> {
  const [row] = await getDb()
    .select({
      id: workshopVersions.id,
      status: workshopVersions.status,
      title: workshopVersions.title,
      content: workshopVersions.content,
      version: workshopVersions.version,
      createdBy: workshopVersions.createdBy,
      authorName: users.name,
      approvedBy: workshopVersions.approvedBy,
      createdAt: workshopVersions.createdAt,
    })
    .from(workshopVersions)
    .innerJoin(users, eq(workshopVersions.createdBy, users.id))
    .where(eq(workshopVersions.id, id))
    .limit(1);
  if (!row) return null;
  const allowed =
    user.role === "manager" ||
    (user.role === "pedagogue" && row.status !== "draft") ||
    row.createdBy === user.id ||
    (user.role === "educator" && row.status === "published");
  return allowed ? ({ ...row, content: row.content as WorkshopPlan } as WorkshopRecord) : null;
}

export async function submitForReview(user: AuthUser, id: string) {
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .update(workshopVersions)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(and(eq(workshopVersions.id, id), eq(workshopVersions.createdBy, user.id), eq(workshopVersions.status, "draft")))
      .returning({ id: workshopVersions.id });
    if (rows.length === 0) throw new Error("INVALID_TRANSITION");
    await tx.insert(versionTransitions).values({ versionId: id, fromStatus: "draft", toStatus: "submitted", actorId: user.id, note: "Pedagojik incelemeye gönderildi." });
  });
}

export async function reviewWorkshop(
  user: AuthUser,
  id: string,
  decision: "changes_requested" | "approved",
  comment: string,
) {
  if (user.role !== "pedagogue") throw new Error("FORBIDDEN");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [workshop] = await tx
      .select({ createdBy: workshopVersions.createdBy, status: workshopVersions.status })
      .from(workshopVersions)
      .where(eq(workshopVersions.id, id))
      .limit(1);
    if (!workshop || workshop.status !== "submitted") throw new Error("INVALID_TRANSITION");
    if (workshop.createdBy === user.id) throw new Error("SELF_APPROVAL_FORBIDDEN");

    const [contentRow] = await tx.select({ content: workshopVersions.content }).from(workshopVersions).where(eq(workshopVersions.id, id)).limit(1);
    const plan = contentRow?.content as WorkshopPlan | undefined;
    if (!plan || plan.findings.some((finding) => finding.severity === "blocker")) throw new Error("BLOCKER_PRESENT");
    const nextStatus = decision === "approved" ? "approved" : "changes_requested";
    const updated = await tx
      .update(workshopVersions)
      .set({
        status: nextStatus,
        approvedBy: decision === "approved" ? user.id : null,
        approvedAt: decision === "approved" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(workshopVersions.id, id), eq(workshopVersions.status, "submitted")))
      .returning({ id: workshopVersions.id });
    if (updated.length === 0) throw new Error("CONCURRENT_REVIEW");
    await tx.insert(reviews).values({ versionId: id, reviewerId: user.id, decision, comment });
    await tx.insert(versionTransitions).values({ versionId: id, fromStatus: "submitted", toStatus: nextStatus, actorId: user.id, note: comment });
  });
}

export async function createRevision(user: AuthUser, id: string) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(workshopVersions).where(and(eq(workshopVersions.id, id), eq(workshopVersions.createdBy, user.id), eq(workshopVersions.status, "changes_requested"))).limit(1);
    if (!current) throw new Error("INVALID_TRANSITION");
    const superseded = await tx.update(workshopVersions).set({ status: "superseded", updatedAt: new Date() }).where(and(eq(workshopVersions.id, id), eq(workshopVersions.status, "changes_requested"))).returning({ id: workshopVersions.id });
    if (superseded.length === 0) throw new Error("CONCURRENT_REVISION");
    const [revision] = await tx.insert(workshopVersions).values({ runId: current.runId, title: current.title, content: current.content, contentHash: current.contentHash, version: current.version + 1, createdBy: user.id, supersedesId: current.id, status: "draft" }).returning({ id: workshopVersions.id });
    await tx.insert(versionTransitions).values({ versionId: id, fromStatus: "changes_requested", toStatus: "superseded", actorId: user.id, note: `Sürüm ${current.version + 1} oluşturuldu.` });
    return revision.id;
  });
}

export async function publishWorkshop(user: AuthUser, id: string) {
  if (user.role !== "manager") throw new Error("FORBIDDEN");
  await getDb().transaction(async (tx) => {
    const updated = await tx.update(workshopVersions).set({ status: "published", publishedBy: user.id, publishedAt: new Date(), updatedAt: new Date() }).where(and(eq(workshopVersions.id, id), eq(workshopVersions.status, "approved"))).returning({ id: workshopVersions.id });
    if (updated.length === 0) throw new Error("INVALID_TRANSITION");
    await tx.insert(versionTransitions).values({ versionId: id, fromStatus: "approved", toStatus: "published", actorId: user.id, note: "Yönetici tarafından yayımlandı." });
  });
}

export async function addFeedback(user: AuthUser, id: string, rating: number, comment: string) {
  if (user.role !== "educator") throw new Error("FORBIDDEN");
  const [workshop] = await getDb()
    .select({ status: workshopVersions.status })
    .from(workshopVersions)
    .where(eq(workshopVersions.id, id))
    .limit(1);
  if (!workshop || workshop.status !== "published") throw new Error("NOT_PUBLISHED");
  await getDb()
    .insert(educatorFeedback)
    .values({ versionId: id, educatorId: user.id, rating, comment })
    .onConflictDoUpdate({
      target: [educatorFeedback.versionId, educatorFeedback.educatorId],
      set: { rating, comment, createdAt: new Date() },
    });
}

export type FeedbackSummary = {
  count: number;
  averageRating: number;
  // Highest rating first, so the panel can render the bars top down.
  distribution: Array<{ rating: number; count: number; share: number }>;
  entries: Array<{
    rating: number;
    comment: string;
    educatorName: string;
    createdAt: Date;
    own: boolean;
  }>;
};

// Educators only ever see their own note; every other role that already passed
// the getWorkshop access check sees the whole classroom response.
export async function getFeedbackSummary(
  user: AuthUser,
  id: string,
): Promise<FeedbackSummary> {
  const rows = await getDb()
    .select({
      rating: educatorFeedback.rating,
      comment: educatorFeedback.comment,
      educatorName: users.name,
      educatorId: educatorFeedback.educatorId,
      createdAt: educatorFeedback.createdAt,
    })
    .from(educatorFeedback)
    .innerJoin(users, eq(educatorFeedback.educatorId, users.id))
    .where(eq(educatorFeedback.versionId, id))
    .orderBy(desc(educatorFeedback.createdAt));

  const visible = user.role === "educator" ? rows.filter((row) => row.educatorId === user.id) : rows;
  const total = rows.reduce((sum, row) => sum + row.rating, 0);
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = rows.filter((row) => row.rating === rating).length;
    return {
      rating,
      count,
      share: rows.length === 0 ? 0 : Math.round((count / rows.length) * 100),
    };
  });
  return {
    count: rows.length,
    averageRating: rows.length === 0 ? 0 : Math.round((total / rows.length) * 10) / 10,
    distribution,
    entries: visible.map(({ educatorId, ...row }) => ({ ...row, own: educatorId === user.id })),
  };
}

// Reuse rollup for the manager dashboard: one row per package that has been
// used in a classroom, newest rating first.
export async function listFeedbackRollup(actor: AuthUser) {
  if (actor.role !== "manager") throw new Error("FORBIDDEN");
  const rows = await getDb()
    .select({
      versionId: educatorFeedback.versionId,
      title: workshopVersions.title,
      version: workshopVersions.version,
      rating: educatorFeedback.rating,
    })
    .from(educatorFeedback)
    .innerJoin(workshopVersions, eq(educatorFeedback.versionId, workshopVersions.id));

  const byVersion = new Map<string, { versionId: string; title: string; version: number; ratings: number[] }>();
  for (const row of rows) {
    const existing = byVersion.get(row.versionId);
    if (existing) existing.ratings.push(row.rating);
    else byVersion.set(row.versionId, { versionId: row.versionId, title: row.title, version: row.version, ratings: [row.rating] });
  }
  return [...byVersion.values()]
    .map((entry) => ({
      versionId: entry.versionId,
      title: entry.title,
      version: entry.version,
      count: entry.ratings.length,
      averageRating:
        Math.round((entry.ratings.reduce((sum, value) => sum + value, 0) / entry.ratings.length) * 10) / 10,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.count - a.count);
}

export async function getReviews(id: string) {
  return getDb()
    .select({ decision: reviews.decision, comment: reviews.comment, reviewerName: users.name, createdAt: reviews.createdAt })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.versionId, id))
    .orderBy(desc(reviews.createdAt));
}
