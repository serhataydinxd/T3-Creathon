import { MATERIALS, MATERIALS_PRICED_ON } from "@/server/content/materials";
import type { RouteDefinition } from "@/server/content/curriculum";
import type { MaterialLine, PlanCosts, ResourceProfile } from "./types";

/**
 * Material quantities and cost for one route under one profile.
 *
 * Extracted so every candidate route can be priced, not only the one selected.
 * A trainer comparing options needs the cost of each, and computing it in the
 * generator meant the alternatives were presented without the number that
 * usually decides between them.
 */
export function costRoute(
  route: RouteDefinition,
  profile: ResourceProfile,
): { materialPlan: MaterialLine[]; costs: PlanCosts; groupCount: number } {
  const groupCount = Math.ceil(profile.classSize / profile.groupSize);
  const round = (value: number) => Math.round(value * 100) / 100;
  const inventory = new Set(profile.materials);
  const materialPlan: MaterialLine[] = route.materials.map(({ materialId, basis, quantity }) => {
    const material = MATERIALS[materialId];
    const perGroup = basis === "student" ? quantity * profile.groupSize : quantity;
    // What the teacher told us they have, not what a typical classroom stocks.
    const inInventory = inventory.has(materialId);
    const totalCostTry = round(material.unitCostTry * perGroup * groupCount);
    return {
      key: materialId,
      label: material.label,
      category: material.category,
      kind: material.kind,
      basis,
      quantityPerUnit: quantity,
      quantityPerGroup: round(perGroup),
      // Shared consumables such as tape are fractional per group, so the class
      // total is rounded rather than truncated away to nothing.
      totalQuantity: round(perGroup * groupCount),
      unitCostTry: material.unitCostTry,
      totalCostTry,
      inInventory,
      // Two different questions, so the figures deliberately overlap: a
      // consumable the teacher does not own is both bought and used up.
      acquisitionCostTry: inInventory ? 0 : totalCostTry,
      lessonCostTry: material.kind === "consumable" ? totalCostTry : 0,
    };
  });

  const estimatedCostTry = Math.ceil(
    materialPlan.reduce((sum, line) => sum + line.totalCostTry, 0),
  );
  const costs = {
    totalTry: estimatedCostTry,
    acquisitionTry: Math.ceil(materialPlan.reduce((sum, line) => sum + line.acquisitionCostTry, 0)),
    lessonTry: Math.ceil(materialPlan.reduce((sum, line) => sum + line.lessonCostTry, 0)),
    pricedOn: MATERIALS_PRICED_ON,
  };


  return { materialPlan, costs, groupCount };
}
