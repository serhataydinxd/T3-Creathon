import { z } from "zod";
import { MATERIAL_IDS } from "@/server/content/materials";
import { DEFAULT_OUTCOME_ID, OUTCOME_IDS } from "@/server/content/curriculum";
import { VENUE_CAPABILITY_IDS } from "@/server/content/venues";

export const resourceProfileSchema = z.object({
  durationMinutes: z.union([z.literal(40), z.literal(60), z.literal(80)]),
  classSize: z.number().int().min(6).max(50),
  groupSize: z.number().int().min(2).max(6),
  budgetTry: z.number().min(0).max(100_000),
  hardBudget: z.boolean(),
  hasInternet: z.boolean(),
  hasElectricity: z.boolean(),
  // Both enums come from the registries, so adding a material or an outcome to
  // the corpus is accepted by the API without touching this schema.
  materials: z
    .array(z.enum(MATERIAL_IDS))
    .max(MATERIAL_IDS.length)
    .refine((items) => new Set(items).size === items.length, "Malzemeler tekrarlanamaz."),
  accessibilityNeeds: z.array(z.string().trim().max(160)).max(8),
  /**
   * Defaulted rather than required so a request predating the corpus still
   * parses, and so the generate and save requests always hash identically.
   */
  outcomeId: z.enum(OUTCOME_IDS).default(DEFAULT_OUTCOME_ID),
  /** Defaulted to an empty venue so an older request still parses. */
  capabilities: z
    .array(z.enum(VENUE_CAPABILITY_IDS))
    .max(VENUE_CAPABILITY_IDS.length)
    .refine((items) => new Set(items).size === items.length, "Donanım tekrarlanamaz.")
    .default([]),
});

/**
 * A draft names the generation the server issued; it never carries prose.
 * Strict, so a request still sending an `authored` body is refused outright
 * rather than having it quietly dropped and the draft saved from the
 * deterministic plan instead.
 */
export const draftRequestSchema = resourceProfileSchema
  .extend({ generationId: z.string().uuid() })
  .strict();
