import { authoredWorkshopSchema } from "@/server/ai/authoring";
import { z } from "zod";

export const resourceProfileSchema = z.object({
  durationMinutes: z.union([z.literal(40), z.literal(60), z.literal(80)]),
  classSize: z.number().int().min(6).max(50),
  groupSize: z.number().int().min(2).max(6),
  budgetTry: z.number().min(0).max(100_000),
  hardBudget: z.boolean(),
  hasInternet: z.boolean(),
  hasElectricity: z.boolean(),
  materials: z
    .array(
      z.enum(["paper", "pencil", "scissors", "tape", "battery", "led", "copper-wire", "projector"]),
    )
    .max(8)
    .refine((items) => new Set(items).size === items.length, "Malzemeler tekrarlanamaz."),
  accessibilityNeeds: z.array(z.string().trim().max(160)).max(8),
});

// A draft may carry the prose the content expert actually reviewed. Everything
// that carries a guarantee is still re-derived server-side from the profile.
export const draftRequestSchema = resourceProfileSchema.extend({
  authored: authoredWorkshopSchema.optional(),
});
