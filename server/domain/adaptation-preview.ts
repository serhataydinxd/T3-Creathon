import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { deliveryRecords } from "@/server/db/schema";
import { SCHOOL_CLASSROOM, VENUE_CAPABILITY_IDS } from "@/server/content/venues";
import { centreCapabilityStatuses } from "./centre-store";
import { compareForCentre, profileForCentre, type CompatibilityReport } from "./adaptation";
import type { WorkshopPlan } from "./types";

/**
 * What adapting to a centre would mean, computed without creating anything.
 *
 * Kept apart from the action so the page can show the comparison first. A
 * trainer finding out what changed by reading the draft afterwards is a worse
 * version of the same information.
 */
export async function previewAdaptation(
  deliveryId: string,
  centreSlug: string | null,
): Promise<CompatibilityReport> {
  const [delivery] = await getDb()
    .select({ planSnapshot: deliveryRecords.planSnapshot })
    .from(deliveryRecords)
    .where(eq(deliveryRecords.id, deliveryId))
    .limit(1);
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");

  const sourcePlan = delivery.planSnapshot as WorkshopPlan;
  // Statuses come from the operational record, never from the request.
  const statuses = centreSlug ? await centreCapabilityStatuses(centreSlug) : null;
  const targetProfile = profileForCentre(sourcePlan.profile, {
    capabilities: statuses
      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "available")
      : [...SCHOOL_CLASSROOM.capabilities],
    unavailableCapabilities: statuses
      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "unavailable")
      : [...SCHOOL_CLASSROOM.unavailableCapabilities],
  });
  return compareForCentre(sourcePlan, targetProfile);
}
