import { z } from "zod";
import { MATERIAL_IDS } from "@/server/content/materials";
import { DEFAULT_OUTCOME_ID, OUTCOME_IDS } from "@/server/content/curriculum";
import { VENUE_CAPABILITY_IDS } from "@/server/content/venues";
import { isCatalogueEntryId } from "@/server/content/catalogue";
import { DEFAULT_FORMAT_ID, FORMAT_IDS } from "@/server/content/formats";

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
  /**
   * Facilities verified as absent. Defaulted to empty rather than required, so
   * an older profile still parses — and so a facility nobody has ruled on stays
   * unknown instead of being read as missing.
   */
  unavailableCapabilities: z
    .array(z.enum(VENUE_CAPABILITY_IDS))
    .max(VENUE_CAPABILITY_IDS.length)
    .refine((items) => new Set(items).size === items.length, "Donanım tekrarlanamaz.")
    .default([]),
  formatId: z.enum(FORMAT_IDS).default(DEFAULT_FORMAT_ID),
  /**
   * A published catalogue topic with no authored session, to be drafted.
   * Validated against the registry rather than as a free string: the id names
   * the topic the plan locks, so an unknown one must be refused at the edge
   * rather than resolved to a default deeper in.
   *
   * Optional, and omitted rather than defaulted, so a request that does not
   * ask for a proposal hashes exactly as it did before proposals existed.
   */
  proposalEntryId: z
    .string()
    .refine(isCatalogueEntryId, "Bilinmeyen katalog konusu.")
    .optional(),
})
  /**
   * A facility cannot be both verified present and verified absent. Rejected
   * at the edge rather than resolved by precedence, because either resolution
   * would silently discard something a person actually asserted.
   */
  .refine(
    (profile) =>
      !profile.capabilities.some((capability) =>
        profile.unavailableCapabilities.includes(capability),
      ),
    "Bir donanım hem var hem yok olarak işaretlenemez.",
  );

/**
 * A draft names the generation the server issued; it never carries prose.
 * Strict, so a request still sending an `authored` body is refused outright
 * rather than having it quietly dropped and the draft saved from the
 * deterministic plan instead.
 */
export const draftRequestSchema = resourceProfileSchema
  .extend({ generationId: z.string().uuid() })
  .strict();
