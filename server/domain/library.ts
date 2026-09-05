import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  adaptationRecords,
  centres,
  deliveryRecords,
  deliveryReports,
  libraryEntries,
  topics,
  workshopVersions,
} from "@/server/db/schema";
import { MATERIALS } from "@/server/content/materials";
import { getFormat } from "@/server/content/formats";
import type { WorkshopPlan } from "./types";

/**
 * The Etkinlik Kütüphanesi: delivery reports a manager has published so other
 * centres can find and reuse them.
 *
 * Four conditions gate entry, and all four are checked here rather than
 * assumed by the caller: the source workshop is published, the report is
 * approved, the educator granted permission to share, and the public row
 * carries nothing personal or sensitive.
 */

export const LIBRARY_PAGE_SIZE = 12;

/** What an entry says about whether a reader could run it themselves. */
export type Applicability = "low-cost" | "no-power" | "needs-facility" | "standard";

export type LibraryFilters = {
  q?: string;
  domainId?: string;
  cohort?: string;
  formatId?: string;
  location?: string;
  minMinutes?: number;
  maxMinutes?: number;
  maxCostTry?: number;
  minParticipants?: number;
  requiresInternet?: boolean;
  requiresElectricity?: boolean;
  accessibility?: string;
  sort?: "newest" | "rating" | "cost" | "adapted";
  page?: number;
};

/**
 * Publishes an approved report into the library.
 *
 * Throws rather than silently skipping when a condition is unmet: a manager
 * pressing publish and getting nothing would reasonably conclude it worked.
 */
export async function publishToLibrary(deliveryId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({
      delivery: deliveryRecords,
      report: deliveryReports,
      versionStatus: workshopVersions.status,
      versionTitle: workshopVersions.title,
      centreName: centres.name,
      centreLocation: centres.location,
    })
    .from(deliveryRecords)
    .innerJoin(deliveryReports, eq(deliveryReports.deliveryId, deliveryRecords.id))
    .innerJoin(workshopVersions, eq(deliveryRecords.versionId, workshopVersions.id))
    .leftJoin(centres, eq(deliveryRecords.centreId, centres.id))
    .where(and(eq(deliveryRecords.id, deliveryId), eq(deliveryReports.status, "approved")))
    .limit(1);

  if (!row) throw new Error("REPORT_NOT_APPROVED");
  if (row.versionStatus !== "published") throw new Error("SOURCE_NOT_PUBLISHED");
  // Sharing is the educator's decision, not the manager's. A manager may
  // publish, but only what its author agreed could leave the centre.
  if (row.delivery.visibility !== "public") throw new Error("SHARING_NOT_PERMITTED");

  const plan = row.delivery.planSnapshot as WorkshopPlan;
  const route = plan.candidates?.find((candidate) => candidate.routeId === plan.routeId);
  const [topicRow] = plan.catalogueEntryId
    ? await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, plan.catalogueEntryId)).limit(1)
    : [];

  const entry = {
    deliveryId,
    reportId: row.report.id,
    topicId: topicRow?.id ?? null,
    title: row.versionTitle,
    domainId: plan.domainId ?? "unknown",
    cohort: plan.cohort ?? "unknown",
    formatId: plan.formatId ?? getFormat(undefined).id,
    centreName: row.centreName,
    centreLocation: row.centreLocation,
    deliveredOn: row.delivery.deliveredOn,
    actualMinutes: row.delivery.actualMinutes,
    actualParticipants: row.delivery.actualParticipants,
    actualCostTry: row.delivery.actualCostTry,
    requiresInternet: plan.profile.hasInternet,
    requiresElectricity: plan.profile.hasElectricity,
    requiredCapabilities: (route?.unknownCapabilities ?? []).length > 0 ? [] : (plan.profile.capabilities ?? []),
    // The plan's categorical provisions, never the educator's free-text note:
    // that can describe an individual child, and this row is public.
    accessibilityFeatures: plan.profile.accessibilityNeeds ?? [],
    keyMaterials: (plan.materialPlan ?? [])
      .slice(0, 6)
      .map((line) => MATERIALS[line.key as keyof typeof MATERIALS]?.label ?? line.key),
    rating: null as number | null,
  };

  const [created] = await db
    .insert(libraryEntries)
    .values(entry)
    .onConflictDoUpdate({ target: libraryEntries.deliveryId, set: entry })
    .returning({ id: libraryEntries.id });
  return created.id;
}

/** A crude but honest label: what would make this hard for someone else to run. */
export function applicabilityOf(entry: {
  actualCostTry: number | null;
  requiresElectricity: boolean;
  requiredCapabilities: unknown;
}): Applicability {
  const capabilities = Array.isArray(entry.requiredCapabilities) ? entry.requiredCapabilities : [];
  if (capabilities.length > 0) return "needs-facility";
  if (!entry.requiresElectricity) return "no-power";
  if ((entry.actualCostTry ?? 0) <= 50) return "low-cost";
  return "standard";
}

/**
 * Filtered, paginated library listing.
 *
 * Every clause runs in the database. Fetching the whole table and filtering in
 * the page would put unpublished rows on the wire and stop scaling at the
 * first busy month; neither is acceptable for a public listing.
 */
export async function listLibrary(filters: LibraryFilters) {
  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const needle = `%${filters.q.trim()}%`;
    const match = or(
      ilike(libraryEntries.title, needle),
      ilike(libraryEntries.centreName, needle),
      ilike(libraryEntries.centreLocation, needle),
    );
    if (match) conditions.push(match);
  }
  if (filters.domainId) conditions.push(eq(libraryEntries.domainId, filters.domainId));
  if (filters.cohort) conditions.push(eq(libraryEntries.cohort, filters.cohort));
  if (filters.formatId) conditions.push(eq(libraryEntries.formatId, filters.formatId));
  if (filters.location?.trim()) {
    conditions.push(ilike(libraryEntries.centreLocation, `%${filters.location.trim()}%`));
  }
  if (typeof filters.minMinutes === "number") {
    conditions.push(gte(libraryEntries.actualMinutes, filters.minMinutes));
  }
  if (typeof filters.maxMinutes === "number") {
    conditions.push(lte(libraryEntries.actualMinutes, filters.maxMinutes));
  }
  if (typeof filters.maxCostTry === "number") {
    conditions.push(lte(libraryEntries.actualCostTry, filters.maxCostTry));
  }
  if (typeof filters.minParticipants === "number") {
    conditions.push(gte(libraryEntries.actualParticipants, filters.minParticipants));
  }
  if (filters.requiresInternet === false) {
    conditions.push(eq(libraryEntries.requiresInternet, false));
  }
  if (filters.requiresElectricity === false) {
    conditions.push(eq(libraryEntries.requiresElectricity, false));
  }
  if (filters.accessibility?.trim()) {
    conditions.push(
      sql`${libraryEntries.accessibilityFeatures}::text ILIKE ${`%${filters.accessibility.trim()}%`}`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const order =
    filters.sort === "rating"
      ? desc(libraryEntries.rating)
      : filters.sort === "cost"
        ? asc(libraryEntries.actualCostTry)
        : filters.sort === "adapted"
          ? desc(libraryEntries.adaptationCount)
          : desc(libraryEntries.publishedAt);

  const rows = await db
    .select()
    .from(libraryEntries)
    .where(where)
    .orderBy(order)
    .limit(LIBRARY_PAGE_SIZE + 1)
    .offset((page - 1) * LIBRARY_PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(libraryEntries)
    .where(where);

  return {
    entries: rows.slice(0, LIBRARY_PAGE_SIZE),
    hasMore: rows.length > LIBRARY_PAGE_SIZE,
    total,
    page,
  };
}

export async function getLibraryEntry(id: string) {
  const db = getDb();
  const [entry] = await db.select().from(libraryEntries).where(eq(libraryEntries.id, id)).limit(1);
  if (!entry) throw new Error("ENTRY_NOT_FOUND");
  const [report] = await db
    .select()
    .from(deliveryReports)
    .where(eq(deliveryReports.id, entry.reportId))
    .limit(1);
  const adaptations = await db
    .select({ id: adaptationRecords.id })
    .from(adaptationRecords)
    .where(eq(adaptationRecords.libraryEntryId, id));
  return { entry, report, adaptationCount: adaptations.length };
}
