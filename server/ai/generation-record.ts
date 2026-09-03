import "server-only";

import { createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { generationRecords } from "@/server/db/schema";
import type { ResourceProfile, WorkshopPlan } from "@/server/domain/types";

/**
 * How long a generated plan stays claimable. The flow is generate, read the
 * five stages on screen, then save, so an hour is generous for a careful
 * reviewer while keeping the table short. Nothing legitimate needs longer:
 * generation itself is bounded well under a minute.
 */
export const GENERATION_RECORD_TTL_MS = 60 * 60 * 1000;

export type GenerationMode = "live" | "replay";

export type IssuedGenerationRecord = {
  id: string;
  expiresAt: Date;
};

export type LoadedGenerationRecord = {
  plan: WorkshopPlan;
  mode: GenerationMode;
  providerModel: string | null;
};

/**
 * Canonical hash of the resource profile, with keys sorted so the digest does
 * not depend on property order. The generate request and the save request are
 * parsed by different schemas, and a silent ordering difference between them
 * would reject every legitimate save.
 */
export function hashProfile(profile: ResourceProfile): string {
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(profile).sort(([a], [b]) => a.localeCompare(b))),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Deletes rows past their expiry. Called opportunistically when a record is
 * issued, which keeps the table bounded without a scheduled job: every new row
 * pays for the cleanup of the ones it outlived.
 */
export async function pruneExpiredGenerationRecords(now: Date = new Date()): Promise<number> {
  const removed = await getDb()
    .delete(generationRecords)
    .where(lt(generationRecords.expiresAt, now))
    .returning({ id: generationRecords.id });
  return removed.length;
}

export async function issueGenerationRecord(input: {
  userId: string;
  profile: ResourceProfile;
  plan: WorkshopPlan;
  providerModel: string | null;
  now?: Date;
}): Promise<IssuedGenerationRecord> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + GENERATION_RECORD_TTL_MS);
  const [row] = await getDb()
    .insert(generationRecords)
    .values({
      userId: input.userId,
      requestHash: hashProfile(input.profile),
      // The persisted mode comes from the plan the server produced, so a
      // fallback to replay is recorded as replay however the request arrived.
      mode: input.plan.mode === "LIVE" ? "live" : "replay",
      providerModel: input.plan.mode === "LIVE" ? input.providerModel : null,
      plan: input.plan,
      expiresAt,
    })
    .returning({ id: generationRecords.id, expiresAt: generationRecords.expiresAt });

  await pruneExpiredGenerationRecords(now);
  return { id: row.id, expiresAt: row.expiresAt };
}

/**
 * Resolves a record for the user who owns it. The plan is returned as stored:
 * it was produced by this server from this profile and has not been through a
 * client, which is the whole reason the record exists.
 *
 * A record is intentionally reusable until it expires rather than consumed on
 * first use, because two concurrent saves sharing an idempotency key must both
 * resolve to the same draft.
 */
export async function loadGenerationRecord(input: {
  userId: string;
  recordId: string;
  profile: ResourceProfile;
  now?: Date;
}): Promise<LoadedGenerationRecord> {
  const now = input.now ?? new Date();
  // Filtering on the owner as well as the id means a record belonging to
  // someone else is indistinguishable from one that does not exist, so the
  // endpoint cannot be used to probe for other users' record ids.
  const [row] = await getDb()
    .select({
      plan: generationRecords.plan,
      mode: generationRecords.mode,
      providerModel: generationRecords.providerModel,
      requestHash: generationRecords.requestHash,
      expiresAt: generationRecords.expiresAt,
    })
    .from(generationRecords)
    .where(
      and(eq(generationRecords.id, input.recordId), eq(generationRecords.userId, input.userId)),
    )
    .limit(1);

  if (!row) throw new Error("GENERATION_RECORD_NOT_FOUND");
  if (row.expiresAt.getTime() <= now.getTime()) throw new Error("GENERATION_RECORD_EXPIRED");
  if (row.requestHash !== hashProfile(input.profile)) {
    throw new Error("GENERATION_PROFILE_MISMATCH");
  }

  return {
    plan: row.plan as WorkshopPlan,
    mode: row.mode === "live" ? "live" : "replay",
    providerModel: row.providerModel,
  };
}
