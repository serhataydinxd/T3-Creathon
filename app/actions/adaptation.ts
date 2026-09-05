"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { CENTRE_IDS, SCHOOL_CLASSROOM, VENUE_CAPABILITY_IDS } from "@/server/content/venues";
import { adaptForCentre, profileForCentre } from "@/server/domain/adaptation";
import { centreCapabilityStatuses } from "@/server/domain/centre-store";
import { getLibraryEntry } from "@/server/domain/library";
import { getDb } from "@/server/db/client";
import { deliveryRecords } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { WorkshopPlan } from "@/server/domain/types";

/**
 * Starting an adaptation.
 *
 * The target venue's facility statuses are read from the operational record on
 * the server, never taken from the request: an adaptation that let the caller
 * assert "this centre has a planetarium" would be worth nothing.
 */
export async function adaptAction(formData: FormData) {
  const actor = await requireRole(["educator", "content_expert", "manager"]);
  const parsed = z
    .object({
      libraryEntryId: z.string().uuid(),
      centreSlug: z.union([z.enum(CENTRE_IDS), z.literal("")]),
    })
    .parse(Object.fromEntries(formData));

  const { entry } = await getLibraryEntry(parsed.libraryEntryId);
  const [delivery] = await getDb()
    .select({ planSnapshot: deliveryRecords.planSnapshot })
    .from(deliveryRecords)
    .where(eq(deliveryRecords.id, entry.deliveryId))
    .limit(1);
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");

  const sourcePlan = delivery.planSnapshot as WorkshopPlan;
  const statuses = parsed.centreSlug ? await centreCapabilityStatuses(parsed.centreSlug) : null;
  const targetProfile = profileForCentre(sourcePlan.profile, {
    capabilities: statuses
      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "available")
      : [...SCHOOL_CLASSROOM.capabilities],
    unavailableCapabilities: statuses
      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "unavailable")
      : [...SCHOOL_CLASSROOM.unavailableCapabilities],
  });

  const { versionId } = await adaptForCentre(actor, {
    libraryEntryId: parsed.libraryEntryId,
    targetCentreSlug: parsed.centreSlug || null,
    targetProfile,
  });
  redirect(`/workshops/${versionId}?adapted=1`);
}
