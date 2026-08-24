import type { MaterialKey } from "./types";

export const DEMO_OBJECTIVE = {
  id: "objective-electric-circuit-01",
  code: "F.7.7.1.1",
  canonicalText:
    "Seri ve paralel bağlı ampullerden oluşan bir devre şeması çizer.",
  source: "MEB Fen Bilimleri Dersi Öğretim Programı (demo kaydı)",
} as const;

export const MATERIALS: Record<
  MaterialKey,
  { label: string; unitCostTry: number; availableByDefault: boolean }
> = {
  paper: { label: "A4 kâğıdı", unitCostTry: 0.5, availableByDefault: true },
  pencil: { label: "Kurşun kalem", unitCostTry: 0, availableByDefault: true },
  scissors: { label: "Makas", unitCostTry: 0, availableByDefault: true },
  tape: { label: "Bant", unitCostTry: 1, availableByDefault: true },
  battery: { label: "Pil", unitCostTry: 12, availableByDefault: false },
  led: { label: "LED", unitCostTry: 5, availableByDefault: false },
  "copper-wire": { label: "Bakır tel", unitCostTry: 8, availableByDefault: false },
  projector: { label: "Projeksiyon", unitCostTry: 0, availableByDefault: false },
};

export const MATERIAL_OPTIONS = Object.entries(MATERIALS).map(([key, value]) => ({
  key: key as MaterialKey,
  ...value,
}));
