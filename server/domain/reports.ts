import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { deliveryRecords, deliveryReports } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/session";
import { latestReport, recordReportTransition } from "./deliveries";
import { publishToLibrary } from "./library";

/**
 * The delivery report's lifecycle.
 *
 * Taslak → İncelemeye gönderildi → Değişiklik istendi → Onaylandı → Yayımlandı,
 * deliberately the same shape as the workshop lifecycle so the two read alike
 * and a reviewer learns one set of rules.
 *
 * Approved reports are never edited. A correction supersedes the approved
 * version with a new one, so what a pedagogue signed off stays readable
 * exactly as they signed it.
 */

export type ReportStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published"
  | "superseded";

export type ReportNarrative = {
  summary: string;
  delivery: string;
  learning: string;
  materials: string;
  accessibility: string;
  /**
   * Safety observations and incidents. A section of its own, and the reason is
   * the whole point: it must appear in the internal report a centre reads and
   * must never reach the public library.
   *
   * It was briefly folded into `accessibility`, which meant "a participant cut
   * their finger with scissors" was published to the library the moment a
   * manager shared the report — the exact disclosure §10 forbids.
   */
  safety: string;
  nextTime: string;
};

/** Every section, so a missing one is visible as missing. */
export const NARRATIVE_SECTIONS: (keyof ReportNarrative)[] = [
  "summary",
  "delivery",
  "learning",
  "materials",
  "accessibility",
  "safety",
  "nextTime",
];

/**
 * The sections a public library entry may show.
 *
 * Defined as an allow-list rather than by removing `safety` from the full set,
 * so a section added later is private until someone decides otherwise.
 */
export const PUBLIC_NARRATIVE_SECTIONS: (keyof ReportNarrative)[] = [
  "summary",
  "delivery",
  "learning",
  "materials",
  "accessibility",
  "nextTime",
];

/** What an unanswered section says. Never left blank, never invented. */
export const NOT_STATED = "Belirtilmedi.";

export function emptyNarrative(): ReportNarrative {
  return {
    summary: NOT_STATED,
    delivery: NOT_STATED,
    learning: NOT_STATED,
    materials: NOT_STATED,
    accessibility: NOT_STATED,
    safety: NOT_STATED,
    nextTime: NOT_STATED,
  };
}

async function requireDelivery(deliveryId: string) {
  const [record] = await getDb()
    .select()
    .from(deliveryRecords)
    .where(eq(deliveryRecords.id, deliveryId))
    .limit(1);
  if (!record) throw new Error("DELIVERY_NOT_FOUND");
  return record;
}

/**
 * Creates or replaces the working draft.
 *
 * A draft may be rewritten in place; anything past it may not. When the latest
 * report is approved or published, this supersedes it with a new version
 * rather than overwriting, which is what keeps the approval meaningful.
 */
export async function saveReportDraft(
  user: AuthUser,
  deliveryId: string,
  narrative: ReportNarrative,
  provenance: { mode: "live" | "replay"; providerModel: string | null },
): Promise<string> {
  const record = await requireDelivery(deliveryId);
  if (user.role !== "manager" && record.educatorId !== user.id) throw new Error("FORBIDDEN");

  const db = getDb();
  const current = await latestReport(deliveryId);

  if (current && ["draft", "changes_requested"].includes(current.status)) {
    await db
      .update(deliveryReports)
      .set({ narrative, status: "draft", mode: provenance.mode, providerModel: provenance.providerModel })
      .where(eq(deliveryReports.id, current.id));
    return current.id;
  }

  if (current) {
    await db
      .update(deliveryReports)
      .set({ status: "superseded" })
      .where(eq(deliveryReports.id, current.id));
    await recordReportTransition({
      reportId: current.id,
      from: current.status,
      to: "superseded",
      actorId: user.id,
      note: "Yeni sürüm oluşturuldu.",
    });
  }

  const [created] = await db
    .insert(deliveryReports)
    .values({
      deliveryId,
      version: (current?.version ?? 0) + 1,
      status: "draft",
      narrative,
      mode: provenance.mode,
      providerModel: provenance.providerModel,
      createdBy: user.id,
    })
    .returning({ id: deliveryReports.id });
  return created.id;
}

export async function submitReport(user: AuthUser, deliveryId: string): Promise<void> {
  const record = await requireDelivery(deliveryId);
  if (user.role !== "manager" && record.educatorId !== user.id) throw new Error("FORBIDDEN");
  const current = await latestReport(deliveryId);
  if (!current) throw new Error("REPORT_NOT_FOUND");
  if (!["draft", "changes_requested"].includes(current.status)) throw new Error("INVALID_TRANSITION");

  await getDb()
    .update(deliveryReports)
    .set({ status: "submitted" })
    .where(eq(deliveryReports.id, current.id));
  await recordReportTransition({
    reportId: current.id,
    from: current.status,
    to: "submitted",
    actorId: user.id,
    note: "İncelemeye gönderildi.",
  });
}

/**
 * A pedagogue's decision on a submitted report.
 *
 * Nobody approves their own account of their own session — the same bar the
 * workshop workflow applies, and for the same reason: a review that the
 * reviewed person can perform is not a review.
 */
export async function reviewReport(
  user: AuthUser,
  deliveryId: string,
  decision: "approved" | "changes_requested",
  note: string,
): Promise<void> {
  if (!(["pedagogue", "manager"] as AuthUser["role"][]).includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  const record = await requireDelivery(deliveryId);
  const current = await latestReport(deliveryId);
  if (!current) throw new Error("REPORT_NOT_FOUND");
  if (current.status !== "submitted") throw new Error("INVALID_TRANSITION");
  if (record.educatorId === user.id || current.createdBy === user.id) {
    throw new Error("SELF_REVIEW_FORBIDDEN");
  }

  await getDb()
    .update(deliveryReports)
    .set({
      status: decision,
      approvedBy: decision === "approved" ? user.id : null,
      approvedAt: decision === "approved" ? new Date() : null,
    })
    .where(eq(deliveryReports.id, current.id));
  await recordReportTransition({
    reportId: current.id,
    from: "submitted",
    to: decision,
    actorId: user.id,
    note: note.trim() || (decision === "approved" ? "Onaylandı." : "Değişiklik istendi."),
  });
}

/**
 * Publishing to the Etkinlik Kütüphanesi.
 *
 * Separate from approval and held by the manager, because the two say
 * different things: approval is "this account is accurate", publication is
 * "this may be shared outside the centre".
 */
export async function publishReport(user: AuthUser, deliveryId: string): Promise<void> {
  if (user.role !== "manager") throw new Error("FORBIDDEN");
  const current = await latestReport(deliveryId);
  if (!current) throw new Error("REPORT_NOT_FOUND");
  if (current.status !== "approved") throw new Error("INVALID_TRANSITION");

  // Written before the status changes, so a row that cannot be published — an
  // educator who did not agree to share, say — leaves the report approved
  // rather than marked published with nothing behind it.
  await publishToLibrary(deliveryId);

  await getDb()
    .update(deliveryReports)
    .set({ status: "published" })
    .where(eq(deliveryReports.id, current.id));
  await recordReportTransition({
    reportId: current.id,
    from: "approved",
    to: "published",
    actorId: user.id,
    note: "Kütüphanede yayımlandı.",
  });
}

/** Every version of a delivery's report, newest first, for the audit trail. */
export async function reportHistory(deliveryId: string) {
  return getDb()
    .select()
    .from(deliveryReports)
    .where(eq(deliveryReports.deliveryId, deliveryId))
    .orderBy(desc(deliveryReports.version));
}
