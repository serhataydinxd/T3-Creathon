"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { verifyCentreCapability } from "@/server/domain/centre-store";
import { CENTRE_IDS, VENUE_CAPABILITY_IDS } from "@/server/content/venues";

/**
 * Recording that someone checked a facility.
 *
 * Restricted to educators and managers because they are the roles that are
 * actually in the building: a content expert writing a session in another city
 * is not in a position to assert that a centre has no dome, and the whole
 * value of `unavailable` is that a person with standing produced it.
 *
 * Enforced on the server rather than by hiding the control, so the guarantee
 * does not depend on which page rendered the form.
 */
const verifySchema = z.object({
  centreSlug: z.enum(CENTRE_IDS),
  capability: z.enum(VENUE_CAPABILITY_IDS),
  status: z.enum(["available", "unavailable", "unknown"]),
  note: z.string().trim().max(400).optional(),
});

export async function verifyCapabilityAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const parsed = verifySchema.parse({
    centreSlug: formData.get("centreSlug"),
    capability: formData.get("capability"),
    status: formData.get("status"),
    note: formData.get("note") ?? undefined,
  });
  await verifyCentreCapability({ userId: actor.id, ...parsed });
  // The lab reads these statuses, so both surfaces must reflect the change.
  revalidatePath("/centres");
  revalidatePath("/lab");
}
