import type { MaterialCategory, MaterialKind } from "@/server/domain/types";

/**
 * Turkish retail prices move, so a cost figure is only meaningful with the date
 * it was estimated on. Figures below come from the survey in
 * content/materials-research.md; update both together.
 */
export const MATERIALS_PRICED_ON = "2026-09-03";

export type MaterialRecord = {
  label: string;
  category: MaterialCategory;
  kind: MaterialKind;
  /** Price of one classroom unit, VAT included, excluding delivery. */
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
  // Kırtasiye — shared across every unit.
  paper: { label: "A4 kâğıdı", category: "kırtasiye", kind: "consumable", unitCostTry: 0.32, commonlyAvailable: true },
  pencil: { label: "Kurşun kalem", category: "kırtasiye", kind: "reusable", unitCostTry: 10.75, commonlyAvailable: true },
  scissors: { label: "Makas", category: "kırtasiye", kind: "reusable", unitCostTry: 54.9, commonlyAvailable: true },
  tape: { label: "Büro bandı", category: "kırtasiye", kind: "consumable", unitCostTry: 59.9, commonlyAvailable: true },
  "glue-stick": { label: "Stick yapıştırıcı", category: "kırtasiye", kind: "consumable", unitCostTry: 34.95, commonlyAvailable: true },
  ruler: { label: "Cetvel 30 cm", category: "kırtasiye", kind: "reusable", unitCostTry: 49.9, commonlyAvailable: true },
  "paper-clip": { label: "Metal ataş", category: "kırtasiye", kind: "reusable", unitCostTry: 0.42, commonlyAvailable: true },
  "rubber-bands": { label: "Paket lastiği", category: "kırtasiye", kind: "reusable", unitCostTry: 36.9, commonlyAvailable: true },
  "modeling-clay": { label: "Oyun hamuru", category: "kırtasiye", kind: "reusable", unitCostTry: 42.25, commonlyAvailable: true },
  "colored-pencils": { label: "Kuru boya seti", category: "kırtasiye", kind: "reusable", unitCostTry: 145.9, commonlyAvailable: true },

  // Sunum.
  "poster-board": { label: "Fon kartonu 50×70", category: "sunum", kind: "consumable", unitCostTry: 12.95, commonlyAvailable: true },
  "marker-set": { label: "Keçeli kalem seti", category: "sunum", kind: "reusable", unitCostTry: 179, commonlyAvailable: true },
  projector: { label: "Projeksiyon", category: "sunum", kind: "reusable", unitCostTry: 0, commonlyAvailable: false },

  // Laboratuvar sarfı — low-cost pool shared by matter, light and modelling.
  "plastic-cup": { label: "Şeffaf plastik bardak", category: "laboratuvar", kind: "consumable", unitCostTry: 0.43, commonlyAvailable: true },
  straw: { label: "Pipet", category: "laboratuvar", kind: "consumable", unitCostTry: 0.5, commonlyAvailable: true },
  "zip-bag": { label: "Şeffaf poşet", category: "laboratuvar", kind: "consumable", unitCostTry: 2, commonlyAvailable: true },
  tissue: { label: "Kâğıt mendil", category: "laboratuvar", kind: "consumable", unitCostTry: 0.41, commonlyAvailable: true },

  // Elektrik.
  battery: { label: "AA kalem pil", category: "elektrik", kind: "consumable", unitCostTry: 16.48, commonlyAvailable: true },
  "battery-holder": { label: "AA pil yuvası", category: "elektrik", kind: "reusable", unitCostTry: 33.44, commonlyAvailable: false },
  led: { label: "5 mm LED", category: "elektrik", kind: "reusable", unitCostTry: 1.12, commonlyAvailable: false },
  "mini-bulb": { label: "Mini ampul 2,5 V", category: "elektrik", kind: "reusable", unitCostTry: 11, commonlyAvailable: false },
  "bulb-holder": { label: "Ampul duyu", category: "elektrik", kind: "reusable", unitCostTry: 9.88, commonlyAvailable: false },
  "copper-wire": { label: "Krokodil kablo", category: "elektrik", kind: "reusable", unitCostTry: 8.59, commonlyAvailable: false },

  // Optik.
  magnifier: { label: "El büyüteci 50 mm", category: "optik", kind: "reusable", unitCostTry: 19.2, commonlyAvailable: false },
  "convex-lens": { label: "Yakınsak mercek f=+10 cm", category: "optik", kind: "reusable", unitCostTry: 182.4, commonlyAvailable: false },
  "lens-pair": { label: "İkili mercek seti", category: "optik", kind: "reusable", unitCostTry: 207.95, commonlyAvailable: false },
} as const satisfies Record<string, MaterialRecord>;

export type MaterialId = keyof typeof MATERIALS;

export const MATERIAL_IDS = Object.keys(MATERIALS) as [MaterialId, ...MaterialId[]];

export function getMaterial(id: MaterialId): MaterialRecord {
  return MATERIALS[id];
}

export const MATERIAL_OPTIONS = MATERIAL_IDS.map((id) => ({ key: id, ...MATERIALS[id] }));

export const MATERIAL_CATEGORIES = [...new Set(MATERIAL_IDS.map((id) => MATERIALS[id].category))];

/** Inventory presets offered in the lab, so a teacher can start from a shape. */
export const INVENTORY_PRESETS = {
  minimal: {
    label: "Asgari sınıf",
    description: "Yalnızca kâğıt ve kalem; elektrik, internet ve donanım yok.",
    materials: ["paper", "pencil"],
  },
  classroom: {
    label: "Standart sınıf",
    description: "Yaygın kırtasiye ve düşük maliyetli sarf malzemeleri.",
    materials: [
      "paper",
      "pencil",
      "scissors",
      "tape",
      "glue-stick",
      "ruler",
      "paper-clip",
      "colored-pencils",
      "poster-board",
      "plastic-cup",
      "straw",
      "tissue",
    ],
  },
  workshop: {
    label: "Bilim Türkiye atölyesi",
    description: "Elektrik, optik ve modelleme donanımı dâhil tam kurulum.",
    materials: [...(Object.keys(MATERIALS) as MaterialId[])],
  },
} as const satisfies Record<string, { label: string; description: string; materials: readonly MaterialId[] }>;

export type InventoryPresetId = keyof typeof INVENTORY_PRESETS;

export const INVENTORY_PRESET_IDS = Object.keys(INVENTORY_PRESETS) as [
  InventoryPresetId,
  ...InventoryPresetId[],
];
