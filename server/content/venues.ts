/**
 * What a delivery venue can offer beyond materials.
 *
 * Bilim Türkiye runs 30 centres and they are not equipped alike: the official
 * volunteering announcement states outright that not every centre has every
 * workshop, exhibition or planetarium. That variance is the real thing this
 * product adapts to, so it belongs in the resource profile.
 *
 * Facility data below is transcribed from the per-centre pages and opening
 * announcements surveyed in content/bilim-turkiye-merkez-donanimi.md. Terms are
 * theirs: "planetaryum" and "sergi alanı" are the official words, and no centre
 * publishes a separate laboratory, so this file does not invent one.
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
    description: "Etkileşimli deney düzeneklerinin bulunduğu sergi alanı.",
  },
  deneyap: {
    label: "DENEYAP atölyesi",
    description: "Teknoloji ve üretim odaklı DENEYAP çalışma alanı.",
  },
} as const satisfies Record<string, VenueCapabilityRecord>;

export type VenueCapabilityId = keyof typeof VENUE_CAPABILITIES;

export const VENUE_CAPABILITY_IDS = Object.keys(VENUE_CAPABILITIES) as [
  VenueCapabilityId,
  ...VenueCapabilityId[],
];

/**
 * Three states, and the third one is the point.
 *
 * The centre pages either name a facility or say nothing about it, and "not
 * published" is not evidence of absence. Modelling that as a boolean forced
 * every silence to be read as a no, which is how a route ends up rejected for
 * a centre that may well have the dome.
 *
 * - `available`   — published or verified as present
 * - `unavailable` — verified as absent by someone who checked
 * - `unknown`     — nobody has established either way
 *
 * Research data may only produce `available` or `unknown`. `unavailable` is a
 * claim about the world that requires a person to have looked, so it is never
 * written by transcription.
 */
export type FacilityStatus = "available" | "unavailable" | "unknown";

export type CentreRecord = {
  name: string;
  location: string;
  /** How many of the seven themes the centre's page lists. */
  themeCount: number | null;
  planetarium: FacilityStatus;
  exhibition: FacilityStatus;
  deneyap: FacilityStatus;
  note?: string;
};

const AVAILABLE = "available" as const;
/** Nothing published either way; not a statement that the facility is absent. */
const UNKNOWN = "unknown" as const;

export const CENTRES = {
  arnavutkoy: { name: "Bilim Arnavutköy", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  baki: { name: "Bilim Bakı", location: "Bakü, Azerbaycan", themeCount: 6, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  basaksehir: { name: "Bilim Başakşehir", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  biskek: { name: "Bilim Bişkek", location: "Bişkek, Kırgızistan", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  corum: { name: "Bilim Çorum", location: "Çorum", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: UNKNOWN },
  demirci: { name: "Bilim Demirci", location: "Manisa", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  erzurum: { name: "Bilim Erzurum", location: "Erzurum", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  esenler: { name: "Bilim Esenler", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: UNKNOWN, note: "Açılış duyurusu seminer salonlarını da adlandırıyor." },
  fatih: { name: "Bilim Fatih", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  gaziantep: { name: "Bilim Gaziantep", location: "Gaziantep", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  gaziosmanpasa: { name: "Bilim Gaziosmanpaşa", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  gungoren: { name: "Bilim Güngören", location: "İstanbul", themeCount: 5, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  islahiye: { name: "Bilim İslahiye", location: "Gaziantep", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  konya: { name: "Bilim Konya", location: "Konya", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  lefkosa: { name: "Bilim Lefkoşa", location: "Lefkoşa, KKTC", themeCount: 7, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  maarif: { name: "Bilim Maarif", location: "Bakü, Azerbaycan", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: UNKNOWN, note: "Tek atölye konsepti: ayrı tematik sınıflar yerine tek alan." },
  ulgun: { name: "Bilim Ülgün", location: "Ülgün, Karadağ", themeCount: null, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: UNKNOWN, note: "Tek atölye konsepti." },
  pursaklar: { name: "Bilim Pursaklar", location: "Ankara", themeCount: 6, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  quba: { name: "Bilim Quba", location: "Quba, Azerbaycan", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  samsun: { name: "Bilim Samsun", location: "Samsun", themeCount: 7, planetarium: UNKNOWN, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "Fizik ve Uzay-Havacılık Sergisi duyuruldu." },
  sincan: { name: "Bilim Sincan", location: "Ankara", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  sultanbeyli: { name: "Bilim Sultanbeyli", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  sahinbey: { name: "Bilim Şahinbey", location: "Gaziantep", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "Bir Dünya Keşif Sergisi." },
  sehitkamil: { name: "Bilim Şehitkamil", location: "Gaziantep", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  trabzon: { name: "Bilim Trabzon", location: "Trabzon", themeCount: 5, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "80 kişilik 12 m kubbe; 42 deney düzeneği; atölye başına 20 kişi." },
  usak: { name: "Bilim Uşak", location: "Uşak", themeCount: 6, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: UNKNOWN },
  umraniye: { name: "Bilim Ümraniye", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  vezirkopru: { name: "Bilim Vezirköprü", location: "Samsun", themeCount: 7, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  yunusemre: { name: "Bilim Yunusemre", location: "Manisa", themeCount: 7, planetarium: UNKNOWN, exhibition: UNKNOWN, deneyap: AVAILABLE },
  zeytinburnu: { name: "Bilim Zeytinburnu", location: "İstanbul", themeCount: 5, planetarium: UNKNOWN, exhibition: AVAILABLE, deneyap: AVAILABLE },
} as const satisfies Record<string, CentreRecord>;

export type CentreId = keyof typeof CENTRES;

export const CENTRE_IDS = Object.keys(CENTRES) as [CentreId, ...CentreId[]];

/**
 * Status of one facility at one centre.
 *
 * Reads through the record type rather than the literal, because the static
 * research data contains no `unavailable` — by design — and narrowing to the
 * literals would make "is this verified absent?" a type error rather than a
 * question with the answer "no, not yet".
 */
export function facilityStatus(centreId: CentreId, capability: VenueCapabilityId): FacilityStatus {
  return (CENTRES[centreId] as CentreRecord)[capability];
}

/** The capabilities a centre's own page confirms. An unknown one is not assumed. */
export function confirmedCapabilities(centreId: CentreId): VenueCapabilityId[] {
  return VENUE_CAPABILITY_IDS.filter((capability) => facilityStatus(centreId, capability) === "available");
}

/** Facilities verified as absent. Empty for every centre: nobody has checked. */
export function unavailableCapabilities(centreId: CentreId): VenueCapabilityId[] {
  return VENUE_CAPABILITY_IDS.filter((capability) => facilityStatus(centreId, capability) === "unavailable");
}

/** Facilities whose presence the centre simply has not published either way. */
export function unknownCapabilities(centreId: CentreId): VenueCapabilityId[] {
  return VENUE_CAPABILITY_IDS.filter((capability) => facilityStatus(centreId, capability) === "unknown");
}

/**
 * A school classroom is the other delivery context and is not a centre, so it
 * is offered alongside the centre list rather than inside it.
 */
export const SCHOOL_CLASSROOM = {
  label: "Okul sınıfı",
  description: "Merkez dışı uygulama; sabit donanım yok.",
  capabilities: [] as readonly VenueCapabilityId[],
  /**
   * Verified absent rather than unknown. A school classroom having no
   * planetarium is a fact about school classrooms, not missing information, so
   * routes needing one are properly ruled out instead of left uncertain.
   */
  unavailableCapabilities: [...VENUE_CAPABILITY_IDS] as readonly VenueCapabilityId[],
};
