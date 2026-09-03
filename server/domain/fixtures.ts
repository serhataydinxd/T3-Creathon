import type { MaterialCategory, MaterialKey, MaterialKind } from "./types";

export const DEMO_OBJECTIVE = {
  id: "objective-electric-circuit-01",
  code: "F.7.7.1.1",
  canonicalText:
    "Seri ve paralel bağlı ampullerden oluşan bir devre şeması çizer.",
  source: "MEB Fen Bilimleri Dersi Öğretim Programı (demo kaydı)",
} as const;

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

export const MATERIALS: Record<MaterialKey, MaterialRecord> = {
  paper: { label: "A4 kâğıdı", category: "kırtasiye", kind: "consumable", unitCostTry: 0.5, commonlyAvailable: true },
  pencil: { label: "Kurşun kalem", category: "kırtasiye", kind: "reusable", unitCostTry: 0, commonlyAvailable: true },
  scissors: { label: "Makas", category: "kırtasiye", kind: "reusable", unitCostTry: 0, commonlyAvailable: true },
  tape: { label: "Bant", category: "kırtasiye", kind: "consumable", unitCostTry: 1, commonlyAvailable: true },
  battery: { label: "Pil", category: "elektrik", kind: "consumable", unitCostTry: 12, commonlyAvailable: false },
  led: { label: "LED", category: "elektrik", kind: "reusable", unitCostTry: 5, commonlyAvailable: false },
  "copper-wire": { label: "Bakır tel", category: "elektrik", kind: "reusable", unitCostTry: 8, commonlyAvailable: false },
  projector: { label: "Projeksiyon", category: "sunum", kind: "reusable", unitCostTry: 0, commonlyAvailable: false },
};

export const MATERIAL_OPTIONS = Object.entries(MATERIALS).map(([key, value]) => ({
  key: key as MaterialKey,
  ...value,
}));
