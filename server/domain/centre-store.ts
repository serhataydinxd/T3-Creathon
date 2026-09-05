import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { centreCapabilities, centres } from "@/server/db/schema";
import {
  CENTRES,
  CENTRE_IDS,
  VENUE_CAPABILITY_IDS,
  facilityStatus,
  type CentreId,
  type FacilityStatus,
  type VenueCapabilityId,
} from "@/server/content/venues";

/**
 * Operational centre data: what people have established about a centre, as
 * opposed to what Bilim Türkiye has published about it.
 *
 * The static registry in content/venues.ts stays the seed and the fallback. It
 * is research, and research can only ever establish two things — a page names
 * a facility (`available`) or it does not mention one (`unknown`). Only a
 * person standing in the building can produce `unavailable`, so that value is
 * never written by the sync and always carries a verifier and a date.
 */

/** Where the published facility claims come from, for the seeded rows. */
const RESEARCH_SOURCE = "https://t3bilimturkiye.org/tr/merkezlerimiz/";

export type CentreCapabilityState = {
  capability: VenueCapabilityId;
  status: FacilityStatus;
  sourceUrl: string | null;
  verifiedByName: string | null;
  verifiedAt: Date | null;
  note: string | null;
};

export type CentreState = {
  slug: CentreId;
  name: string;
  location: string;
  note: string | null;
  capabilities: CentreCapabilityState[];
};

/**
 * Upserts the published centre list and its facility claims.
 *
 * A row a person has verified is left alone: the sync re-asserts what the
 * research says, and research must never overwrite someone who actually
 * checked. That is the difference between a seed and a source of truth.
 */
export async function syncCentres(): Promise<number> {
  const db = getDb();
  for (const slug of CENTRE_IDS) {
    const record = CENTRES[slug];
    const row = {
      slug,
      name: record.name,
      location: record.location,
      note: "note" in record ? (record.note as string) : null,
    };
    const [centre] = await db
      .insert(centres)
      .values(row)
      .onConflictDoUpdate({ target: centres.slug, set: row })
      .returning({ id: centres.id });

    for (const capability of VENUE_CAPABILITY_IDS) {
      const status = facilityStatus(slug, capability);
      const existing = await db
        .select({ id: centreCapabilities.id, verifiedAt: centreCapabilities.verifiedAt })
        .from(centreCapabilities)
        .where(
          and(
            eq(centreCapabilities.centreId, centre.id),
            eq(centreCapabilities.capability, capability),
          ),
        )
        .limit(1);
      // Someone checked in person; the published page does not get to overrule
      // them on the next deploy.
      if (existing[0]?.verifiedAt) continue;
      const capabilityRow = {
        centreId: centre.id,
        capability,
        status,
        sourceUrl: status === "available" ? RESEARCH_SOURCE : null,
      };
      await db
        .insert(centreCapabilities)
        .values(capabilityRow)
        .onConflictDoUpdate({
          target: [centreCapabilities.centreId, centreCapabilities.capability],
          set: capabilityRow,
        });
    }
  }
  return CENTRE_IDS.length;
}

/** Every centre with its current facility status and where that status came from. */
export async function listCentreStates(): Promise<CentreState[]> {
  const db = getDb();
  const rows = await db
    .select({
      slug: centres.slug,
      name: centres.name,
      location: centres.location,
      note: centres.note,
      capability: centreCapabilities.capability,
      status: centreCapabilities.status,
      sourceUrl: centreCapabilities.sourceUrl,
      verifiedAt: centreCapabilities.verifiedAt,
      capabilityNote: centreCapabilities.note,
    })
    .from(centres)
    .leftJoin(centreCapabilities, eq(centreCapabilities.centreId, centres.id))
    .orderBy(centres.name);

  const byCentre = new Map<string, CentreState>();
  for (const row of rows) {
    const existing = byCentre.get(row.slug) ?? {
      slug: row.slug as CentreId,
      name: row.name,
      location: row.location,
      note: row.note,
      capabilities: [],
    };
    if (row.capability) {
      existing.capabilities.push({
        capability: row.capability as VenueCapabilityId,
        status: row.status ?? "unknown",
        sourceUrl: row.sourceUrl,
        verifiedByName: null,
        verifiedAt: row.verifiedAt,
        note: row.capabilityNote,
      });
    }
    byCentre.set(row.slug, existing);
  }
  // Sorted by the registry's own order rather than by whatever the join
  // returned, so the rows do not shuffle between renders and a reader can
  // compare two centres by position.
  const order = new Map(VENUE_CAPABILITY_IDS.map((id, index) => [id, index]));
  for (const centre of byCentre.values()) {
    centre.capabilities.sort(
      (a, b) => (order.get(a.capability) ?? 0) - (order.get(b.capability) ?? 0),
    );
  }
  return [...byCentre.values()];
}

/**
 * Records a person's verification of one facility.
 *
 * Always stamps the verifier and the time, including when the answer is
 * "unknown" — withdrawing a claim is itself a decision someone made, and the
 * record should say who unmade it.
 */
export async function verifyCentreCapability(input: {
  userId: string;
  centreSlug: string;
  capability: string;
  status: FacilityStatus;
  note?: string | null;
}): Promise<void> {
  const db = getDb();
  const [centre] = await db
    .select({ id: centres.id })
    .from(centres)
    .where(eq(centres.slug, input.centreSlug))
    .limit(1);
  if (!centre) throw new Error("CENTRE_NOT_FOUND");

  const row = {
    centreId: centre.id,
    capability: input.capability,
    status: input.status,
    // A person's word replaces the page as the authority for this row.
    sourceUrl: null,
    verifiedBy: input.userId,
    verifiedAt: new Date(),
    note: input.note?.trim() ? input.note.trim().slice(0, 400) : null,
    updatedAt: new Date(),
  };
  await db
    .insert(centreCapabilities)
    .values(row)
    .onConflictDoUpdate({
      target: [centreCapabilities.centreId, centreCapabilities.capability],
      set: row,
    });
}

/**
 * The facility statuses a resource profile should start from for a centre.
 *
 * Reads the operational record, so a verification made last week is what the
 * lab offers today rather than whatever the research file still says.
 */
export async function centreCapabilityStatuses(
  centreSlug: string,
): Promise<Record<string, FacilityStatus>> {
  const db = getDb();
  const rows = await db
    .select({ capability: centreCapabilities.capability, status: centreCapabilities.status })
    .from(centreCapabilities)
    .innerJoin(centres, eq(centreCapabilities.centreId, centres.id))
    .where(eq(centres.slug, centreSlug));
  const statuses: Record<string, FacilityStatus> = {};
  for (const capability of VENUE_CAPABILITY_IDS) statuses[capability] = "unknown";
  for (const row of rows) statuses[row.capability] = row.status;
  return statuses;
}
