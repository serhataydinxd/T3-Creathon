"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { activateUser } from "@/server/domain/users";
import { publishWorkshop } from "@/server/domain/workshops";

export async function activateUserAction(formData: FormData) {
  const actor = await requireRole(["manager"]);
  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(["content_expert", "pedagogue", "educator"]),
    })
    .parse(Object.fromEntries(formData));
  await activateUser(actor, parsed.userId, parsed.role);
  redirect("/dashboard?activated=1");
}

export async function publishWorkshopAction(formData: FormData) {
  const actor = await requireRole(["manager"]);
  const id = z.string().uuid().parse(formData.get("id"));
  await publishWorkshop(actor, id);
  redirect(`/workshops/${id}?published=1`);
}
