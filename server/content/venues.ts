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
 * Deliberately two states, not three. The centre pages either name a facility
 * or say nothing about it, and "not published" is not evidence of absence — so
 * an unknown is never silently recorded as a missing facility.
 */
export type FacilityStatus = "available" | "unpublished";

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
const UNPUBLISHED = "unpublished" as const;

export const CENTRES = {
  arnavutkoy: { name: "Bilim Arnavutköy", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  baki: { name: "Bilim Bakı", location: "Bakü, Azerbaycan", themeCount: 6, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  basaksehir: { name: "Bilim Başakşehir", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  biskek: { name: "Bilim Bişkek", location: "Bişkek, Kırgızistan", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  corum: { name: "Bilim Çorum", location: "Çorum", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: UNPUBLISHED },
  demirci: { name: "Bilim Demirci", location: "Manisa", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  erzurum: { name: "Bilim Erzurum", location: "Erzurum", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  esenler: { name: "Bilim Esenler", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: UNPUBLISHED, note: "Açılış duyurusu seminer salonlarını da adlandırıyor." },
  fatih: { name: "Bilim Fatih", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  gaziantep: { name: "Bilim Gaziantep", location: "Gaziantep", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  gaziosmanpasa: { name: "Bilim Gaziosmanpaşa", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  gungoren: { name: "Bilim Güngören", location: "İstanbul", themeCount: 5, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE },
  islahiye: { name: "Bilim İslahiye", location: "Gaziantep", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  konya: { name: "Bilim Konya", location: "Konya", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  lefkosa: { name: "Bilim Lefkoşa", location: "Lefkoşa, KKTC", themeCount: 7, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  maarif: { name: "Bilim Maarif", location: "Bakü, Azerbaycan", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: UNPUBLISHED, note: "Tek atölye konsepti: ayrı tematik sınıflar yerine tek alan." },
  ulgun: { name: "Bilim Ülgün", location: "Ülgün, Karadağ", themeCount: null, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: UNPUBLISHED, note: "Tek atölye konsepti." },
  pursaklar: { name: "Bilim Pursaklar", location: "Ankara", themeCount: 6, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  quba: { name: "Bilim Quba", location: "Quba, Azerbaycan", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  samsun: { name: "Bilim Samsun", location: "Samsun", themeCount: 7, planetarium: UNPUBLISHED, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "Fizik ve Uzay-Havacılık Sergisi duyuruldu." },
  sincan: { name: "Bilim Sincan", location: "Ankara", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  sultanbeyli: { name: "Bilim Sultanbeyli", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  sahinbey: { name: "Bilim Şahinbey", location: "Gaziantep", themeCount: 7, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "Bir Dünya Keşif Sergisi." },
  sehitkamil: { name: "Bilim Şehitkamil", location: "Gaziantep", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  trabzon: { name: "Bilim Trabzon", location: "Trabzon", themeCount: 5, planetarium: AVAILABLE, exhibition: AVAILABLE, deneyap: AVAILABLE, note: "80 kişilik 12 m kubbe; 42 deney düzeneği; atölye başına 20 kişi." },
  usak: { name: "Bilim Uşak", location: "Uşak", themeCount: 6, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: UNPUBLISHED },
  umraniye: { name: "Bilim Ümraniye", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  vezirkopru: { name: "Bilim Vezirköprü", location: "Samsun", themeCount: 7, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  yunusemre: { name: "Bilim Yunusemre", location: "Manisa", themeCount: 7, planetarium: UNPUBLISHED, exhibition: UNPUBLISHED, deneyap: AVAILABLE },
  zeytinburnu: { name: "Bilim Zeytinburnu", location: "İstanbul", themeCount: 5, planetarium: UNPUBLISHED, exhibition: AVAILABLE, deneyap: AVAILABLE },
} as const satisfies Record<string, CentreRecord>;

export type CentreId = keyof typeof CENTRES;

export const CENTRE_IDS = Object.keys(CENTRES) as [CentreId, ...CentreId[]];

/** The capabilities a centre's own page confirms. An unpublished one is not assumed. */
export function confirmedCapabilities(centreId: CentreId): VenueCapabilityId[] {
  const centre = CENTRES[centreId];
  return VENUE_CAPABILITY_IDS.filter((capability) => centre[capability] === "available");
}

/** Facilities whose presence the centre simply has not published either way. */
export function unpublishedCapabilities(centreId: CentreId): VenueCapabilityId[] {
  const centre = CENTRES[centreId];
  return VENUE_CAPABILITY_IDS.filter((capability) => centre[capability] === "unpublished");
}

/**
 * A school classroom is the other delivery context and is not a centre, so it
 * is offered alongside the centre list rather than inside it.
 */
export const SCHOOL_CLASSROOM = {
  label: "Okul sınıfı",
  description: "Merkez dışı uygulama; sabit donanım yok.",
  capabilities: [] as readonly VenueCapabilityId[],
};
