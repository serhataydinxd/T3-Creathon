"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth/session";
import { addFeedback, createRevision, reviewWorkshop, submitForReview } from "@/server/domain/workshops";

const idSchema = z.string().uuid();

export async function submitWorkshopAction(formData: FormData) {
  const user = await requireRole(["content_expert", "pedagogue"]);
  const id = idSchema.parse(formData.get("id"));
  await submitForReview(user, id);
  redirect(`/workshops/${id}?submitted=1`);
}

export async function reviewWorkshopAction(formData: FormData) {
  const user = await requireRole(["pedagogue"]);
  const parsed = z
    .object({
      id: idSchema,
      decision: z.enum(["changes_requested", "approved"]),
      comment: z.string().trim().min(3).max(1000),
    })
    .parse(Object.fromEntries(formData));
  await reviewWorkshop(user, parsed.id, parsed.decision, parsed.comment);
  redirect(`/workshops/${parsed.id}?reviewed=${parsed.decision}`);
}

export async function createRevisionAction(formData: FormData) {
  const user = await requireRole(["content_expert", "pedagogue"]);
  const id = idSchema.parse(formData.get("id"));
  const revisionId = await createRevision(user, id);
  redirect(`/workshops/${revisionId}?revision=1`);
}

export async function feedbackAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ id: idSchema, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(3).max(1000) })
    .parse(Object.fromEntries(formData));
  await addFeedback(user, parsed.id, parsed.rating, parsed.comment);
  redirect(`/workshops/${parsed.id}?feedback=1`);
}
