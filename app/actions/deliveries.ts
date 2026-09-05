"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth/session";
import { CENTRE_IDS } from "@/server/content/venues";
import { MATERIAL_IDS } from "@/server/content/materials";
import {
  getDelivery,
  saveDeliveryObservations,
  startDelivery,
} from "@/server/domain/deliveries";
import {
  publishReport,
  reviewReport,
  saveReportDraft,
  submitReport,
  type ReportNarrative,
} from "@/server/domain/reports";
import { generateReportNarrative } from "@/server/ai/generate";

/**
 * Delivery and report actions.
 *
 * Every one re-checks the role on the server. The forms are hidden from users
 * who cannot act, but hiding a control is a courtesy, not a guarantee.
 */

const optionalText = z.string().trim().max(1200).optional();

/**
 * An empty box means "not recorded", never zero.
 *
 * `z.coerce.number()` turns "" into 0, which quietly reported an unfilled cost
 * as a session that cost nothing. Blank input is mapped to undefined first, so
 * the difference survives all the way to the report.
 */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalCount = z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(500).optional());
const optionalMinutes = z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(600).optional());
const optionalCost = z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(1_000_000).optional());
const optionalDate = z.preprocess(blankToUndefined, z.string().trim().max(20).optional());

export async function startDeliveryAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const parsed = z
    .object({
      versionId: z.string().uuid(),
      // "" means a school delivery rather than a centre one.
      centreSlug: z.union([z.enum(CENTRE_IDS), z.literal("")]),
    })
    .parse(Object.fromEntries(formData));
  const id = await startDelivery(actor, parsed.versionId, parsed.centreSlug || null);
  redirect(`/deliveries/${id}`);
}

const observationSchema = z.object({
  deliveryId: z.string().uuid(),
  deliveredOn: optionalDate,
  actualParticipants: optionalCount,
  actualGroups: optionalCount,
  actualMinutes: optionalMinutes,
  actualCostTry: optionalCost,
  whatWorked: optionalText,
  whatWasHard: optionalText,
  accessibilityApplied: optionalText,
  safetyObservation: optionalText,
  incidentOccurred: z.coerce.boolean().optional(),
  nextTime: optionalText,
  visibility: z.enum(["private", "centre", "public"]).optional(),
});

export async function saveObservationsAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const raw = Object.fromEntries(formData);
  const parsed = observationSchema.parse({ ...raw, incidentOccurred: raw.incidentOccurred === "on" });

  // Stage and material rows arrive as repeated fields keyed by their id.
  const stages = formData.getAll("stageKey").map((key, index) => ({
    stageKey: String(key),
    outcome: z
      .enum(["applied", "modified", "skipped"])
      .parse(formData.getAll("stageOutcome")[index]),
    note: String(formData.getAll("stageNote")[index] ?? "").slice(0, 600),
    evidenceObserved: String(formData.getAll("stageEvidence")[index] ?? "").slice(0, 600),
  }));
  const materials = formData.getAll("materialId").map((id, index) => {
    const actual = String(formData.getAll("materialActual")[index] ?? "").trim();
    const substitute = String(formData.getAll("materialSubstitute")[index] ?? "").trim();
    return {
      materialId: z.enum(MATERIAL_IDS).parse(String(id)),
      actualQuantity: actual === "" ? null : Number(actual),
      substituteMaterialId: substitute === "" ? null : z.enum(MATERIAL_IDS).parse(substitute),
      note: null,
    };
  });

  const { deliveryId, ...observations } = parsed;
  await saveDeliveryObservations(actor, deliveryId, { ...observations, stages, materials });
  revalidatePath(`/deliveries/${deliveryId}`);
}

/**
 * Drafts the narrative from the record.
 *
 * Generation happens server-side from the stored delivery, never from anything
 * the browser sends: the whole guarantee is that the report describes what was
 * written down, and accepting client-supplied facts would dissolve it.
 */
export async function draftReportAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const deliveryId = z.string().uuid().parse(formData.get("deliveryId"));
  const delivery = await getDelivery(actor, deliveryId);

  const { narrative, mode, model } = await generateReportNarrative({
    plan: delivery.record.planSnapshot as never,
    centreName: delivery.centreName,
    deliveredOn: delivery.record.deliveredOn,
    actualParticipants: delivery.record.actualParticipants,
    actualGroups: delivery.record.actualGroups,
    actualMinutes: delivery.record.actualMinutes,
    actualCostTry: delivery.record.actualCostTry,
    whatWorked: delivery.record.whatWorked,
    whatWasHard: delivery.record.whatWasHard,
    accessibilityApplied: delivery.record.accessibilityApplied,
    safetyObservation: delivery.record.safetyObservation,
    incidentOccurred: delivery.record.incidentOccurred,
    nextTime: delivery.record.nextTime,
    stages: delivery.stages.map((stage) => ({
      stageKey: stage.stageKey,
      outcome: stage.outcome,
      note: stage.note,
      evidenceObserved: stage.evidenceObserved,
    })),
    materials: delivery.materials.map((line) => ({
      materialId: line.materialId,
      plannedQuantity: line.plannedQuantity,
      actualQuantity: line.actualQuantity,
      substituteMaterialId: line.substituteMaterialId,
      note: line.note,
    })),
  });

  await saveReportDraft(actor, deliveryId, narrative, { mode, providerModel: model });
  revalidatePath(`/deliveries/${deliveryId}`);
}

export async function editReportAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const deliveryId = z.string().uuid().parse(formData.get("deliveryId"));
  const narrative = z
    .object({
      summary: z.string().trim().min(1).max(900),
      delivery: z.string().trim().min(1).max(900),
      learning: z.string().trim().min(1).max(900),
      materials: z.string().trim().min(1).max(900),
      accessibility: z.string().trim().min(1).max(900),
      nextTime: z.string().trim().min(1).max(900),
    })
    .parse({
      summary: formData.get("summary"),
      delivery: formData.get("delivery"),
      learning: formData.get("learning"),
      materials: formData.get("materials"),
      accessibility: formData.get("accessibility"),
      nextTime: formData.get("nextTime"),
    }) satisfies ReportNarrative;
  // An edited report is the educator's text, so its provenance is no longer
  // the model's even if a model wrote the first draft.
  await saveReportDraft(actor, deliveryId, narrative, { mode: "replay", providerModel: null });
  revalidatePath(`/deliveries/${deliveryId}`);
}

export async function submitReportAction(formData: FormData) {
  const actor = await requireRole(["educator", "manager"]);
  const deliveryId = z.string().uuid().parse(formData.get("deliveryId"));
  await submitReport(actor, deliveryId);
  revalidatePath(`/deliveries/${deliveryId}`);
}

export async function reviewReportAction(formData: FormData) {
  const actor = await requireRole(["pedagogue", "manager"]);
  const parsed = z
    .object({
      deliveryId: z.string().uuid(),
      decision: z.enum(["approved", "changes_requested"]),
      note: z.string().trim().max(600).default(""),
    })
    .parse(Object.fromEntries(formData));
  await reviewReport(actor, parsed.deliveryId, parsed.decision, parsed.note);
  revalidatePath(`/deliveries/${parsed.deliveryId}`);
}

export async function publishReportAction(formData: FormData) {
  const actor = await requireRole(["manager"]);
  const deliveryId = z.string().uuid().parse(formData.get("deliveryId"));
  await publishReport(actor, deliveryId);
  revalidatePath(`/deliveries/${deliveryId}`);
}

/** Used by the list page to decide what to show; kept beside the actions. */
export async function currentUser() {
  return requireUser();
}
