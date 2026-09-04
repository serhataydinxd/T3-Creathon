/**
 * What a delivery venue can offer beyond materials.
 *
 * Bilim Türkiye runs 30 centres across 15 provinces, and they are not equipped
 * alike: some have a planetarium, some an exhibition hall, some a laboratory.
 * That variance is the real thing this product adapts to, so it belongs in the
 * resource profile alongside electricity and internet rather than being
 * approximated by a material list.
 */

export type VenueCapabilityRecord = {
  label: string;
  description: string;
};

export const VENUE_CAPABILITIES = {
  planetarium: {
    label: "Planetaryum",
    description: "Kubbe altında gök gösterimi yapılabilen salon.",
  },
  exhibition: {
    label: "Sergi alanı",
    description: "Dokunmalı deney düzenekleri bulunan sergi alanı.",
  },
  laboratory: {
    label: "Laboratuvar",
    description: "Deney tezgâhı, lavabo ve güvenlik donanımı bulunan çalışma alanı.",
  },
} as const satisfies Record<string, VenueCapabilityRecord>;

export type VenueCapabilityId = keyof typeof VENUE_CAPABILITIES;

export const VENUE_CAPABILITY_IDS = Object.keys(VENUE_CAPABILITIES) as [
  VenueCapabilityId,
  ...VenueCapabilityId[],
];

/**
 * Venue presets are deliberately separate from inventory presets: a centre's
 * fixed facilities and its consumable stock vary independently, and a trainer
 * knows both without having to reason about the combination.
 */
export const VENUE_PRESETS = {
  classroom: {
    label: "Okul sınıfı",
    description: "Sabit donanım yok; yalnızca sınıf ortamı.",
    capabilities: [],
  },
  centre: {
    label: "Bilim merkezi",
    description: "Sergi alanı ve laboratuvar var, planetaryum yok.",
    capabilities: ["exhibition", "laboratory"],
  },
  "centre-planetarium": {
    label: "Bilim merkezi + planetaryum",
    description: "Planetaryum dâhil tam donanımlı merkez.",
    capabilities: ["planetarium", "exhibition", "laboratory"],
  },
} as const satisfies Record<
  string,
  { label: string; description: string; capabilities: readonly VenueCapabilityId[] }
>;

export type VenuePresetId = keyof typeof VENUE_PRESETS;

export const VENUE_PRESET_IDS = Object.keys(VENUE_PRESETS) as [VenuePresetId, ...VenuePresetId[]];
