import type { MaterialCategory, MaterialKind } from "@/server/domain/types";

/**
 * Turkish retail prices move, so a cost figure is only meaningful with the date
 * it was estimated on. Update this whenever a unit cost below changes.
 */
export const MATERIALS_PRICED_ON = "2026-08-24";

export type MaterialRecord = {
  label: string;
  category: MaterialCategory;
  kind: MaterialKind;
  unitCostTry: number;
  /**
   * Whether a typical Turkish classroom already stocks this. It seeds the
   * default inventory in the lab form and nothing else — it must never be read
   * as a claim that a particular classroom has the material, which is what the
   * submitted resource profile is for.
   */
  commonlyAvailable: boolean;
};

/**
 * The material catalogue. Declared `as const satisfies` so the registry stays
 * plain data while `MaterialId` is derived from its keys: adding a material
 * here widens the type everywhere, and a typo in a route's requirement list
 * fails to compile rather than at run time.
 */
export const MATERIALS = {
  paper: { label: "A4 kâğıdı", category: "kırtasiye", kind: "consumable", unitCostTry: 0.5, commonlyAvailable: true },
  pencil: { label: "Kurşun kalem", category: "kırtasiye", kind: "reusable", unitCostTry: 0, commonlyAvailable: true },
  scissors: { label: "Makas", category: "kırtasiye", kind: "reusable", unitCostTry: 0, commonlyAvailable: true },
  tape: { label: "Bant", category: "kırtasiye", kind: "consumable", unitCostTry: 1, commonlyAvailable: true },
  battery: { label: "Pil", category: "elektrik", kind: "consumable", unitCostTry: 12, commonlyAvailable: false },
  led: { label: "LED", category: "elektrik", kind: "reusable", unitCostTry: 5, commonlyAvailable: false },
  "copper-wire": { label: "Bakır tel", category: "elektrik", kind: "reusable", unitCostTry: 8, commonlyAvailable: false },
  projector: { label: "Projeksiyon", category: "sunum", kind: "reusable", unitCostTry: 0, commonlyAvailable: false },
} as const satisfies Record<string, MaterialRecord>;

export type MaterialId = keyof typeof MATERIALS;

export const MATERIAL_IDS = Object.keys(MATERIALS) as [MaterialId, ...MaterialId[]];

export function getMaterial(id: MaterialId): MaterialRecord {
  return MATERIALS[id];
}

export const MATERIAL_OPTIONS = MATERIAL_IDS.map((id) => ({ key: id, ...MATERIALS[id] }));

/** Inventory presets offered in the lab, so a teacher can start from a shape. */
export const INVENTORY_PRESETS = {
  minimal: {
    label: "Asgari sınıf",
    description: "Yalnızca temel kırtasiye; elektrik ve internet yok.",
    materials: ["paper", "pencil"],
  },
  classroom: {
    label: "Standart sınıf",
    description: "Yaygın kırtasiye malzemeleri.",
    materials: ["paper", "pencil", "scissors", "tape"],
  },
  workshop: {
    label: "Bilim Türkiye atölyesi",
    description: "Devre seti ve sunum donanımı dâhil.",
    materials: ["paper", "pencil", "scissors", "tape", "battery", "led", "copper-wire", "projector"],
  },
} as const satisfies Record<string, { label: string; description: string; materials: readonly MaterialId[] }>;

export type InventoryPresetId = keyof typeof INVENTORY_PRESETS;

export const INVENTORY_PRESET_IDS = Object.keys(INVENTORY_PRESETS) as [
  InventoryPresetId,
  ...InventoryPresetId[],
];
