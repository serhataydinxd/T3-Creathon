import { AGE_COHORT_IDS, WORKSHOP_DOMAIN_IDS, type AgeCohortId, type WorkshopDomainId } from "./domains";

/**
 * Bilim Türkiye's published workshop catalogue: every atölye topic they list,
 * per theme and per age cohort.
 *
 * This is a different thing from the corpus in curriculum.ts, and the
 * distinction is the point. The catalogue is *what Bilim Türkiye offers* —
 * transcribed from their own site, verifiable, and not ours to invent. The
 * corpus is *what İMKÂN has authored a session for*: routes, stage content,
 * material requirements and eligibility. Every corpus topic implements a
 * catalogue entry; most catalogue entries have no corpus topic yet.
 *
 * Keeping them apart is what lets the product be honest about coverage instead
 * of presenting seven authored topics as though they were the programme, and
 * it is what gives the authoring workflow something to work towards.
 *
 * Titles are transcribed verbatim, including spellings that differ from
 * standard Turkish usage ("Magnetizma", "Makrome", "Yapay Zeka", "Aquaponic
 * Tarım"), because the trainer searching for a topic will search for the name
 * on the site. The single exception is "İnovasyon Çeşitleri", which the source
 * page renders with a lowercase initial; it is capitalised here so it does not
 * read as our own typo in a heading.
 */

export const CATALOGUE_SOURCE = {
  captureBaseUrl: "https://t3bilimturkiye.org/tr/atolyeler",
  /** When the catalogue pages were last read. Titles drift; this dates them. */
  capturedOn: "2026-09-05",
} as const;

/** Per-theme source page and the description Bilim Türkiye publishes for it. */
export const CATALOGUE_THEMES = {
  "astronomy-aviation-space": {
    url: "https://t3bilimturkiye.org/tr/atolyeler/astronomi-havacilik-ve-uzay-atolyesi/",
    summary:
      "Madde, temel kuvvetler, aerodinamik ve aviyonik sistemlerle ilgili bilimsel prensipleri deneylerle keşfettirir.",
  },
  "natural-sciences": {
    url: "https://t3bilimturkiye.org/tr/atolyeler/doga-bilimleri-atolyesi/",
    summary:
      "Fizik, kimya ve biyoloji içerikleriyle öğrenciye doğayı bilimsel bir gözle okuma yeteneği kazandırır.",
  },
  entrepreneurship: {
    url: "https://t3bilimturkiye.org/tr/atolyeler/girisim-atolyesi/",
    summary:
      "Fikir geliştirme, inisiyatif alma, risk analizi, maliyet hesabı ve pazar araştırması üzerine çalıştırır.",
  },
  mathematics: {
    url: "https://t3bilimturkiye.org/tr/atolyeler/matematik-atolyesi/",
    summary:
      "Geometrik ve cebirsel kavramları günlük hayat problemleri ve STEM projeleri üzerinden anlamlandırır.",
  },
  "agricultural-technologies": {
    url: "https://t3bilimturkiye.org/tr/atolyeler/tarim-teknolojileri-atolyesi/",
    summary:
      "Zirai bilgi birikimi kazandırır; yazılım ve otomasyonun zirai faaliyetlere entegrasyonunu çalıştırır.",
  },
  design: {
    url: "https://t3bilimturkiye.org/tr/atolyeler/tasarim-atolyesi/",
    summary:
      "Geleneksel Türk sanatları ve çağdaş tasarım çalışmalarıyla yaratıcı ifadeyi geliştirir.",
  },
  technology: {
    url: "https://t3bilimturkiye.org/tr/atolyeler/teknoloji-atolyesi/",
    summary:
      "Algoritmik düşünme, kodlama, elektronik devreler ve mekanik sistemleri proje tabanlı olarak öğretir.",
  },
} as const satisfies Record<WorkshopDomainId, { url: string; summary: string }>;

/**
 * The catalogue itself: theme → cohort → the topics listed on that tab.
 *
 * Note the shape is not uniform. Every cell lists nine topics except
 * Girişim 6-8, which lists three. That is what the site shows, so that is what
 * this records; a test asserts the count rather than a comment claiming it.
 */
export const CATALOGUE = {
  "astronomy-aviation-space": {
    "6-8": [
      "Ay",
      "Dünyamız ve Evren",
      "Gezegenler",
      "Güneş",
      "Güneş Sistemi",
      "Hava Taşıtları",
      "Havanın Özellikleri",
      "Uzay Teknolojileri",
      "Uzay Çalışanları",
    ],
    "9-11": [
      "Aerodinamik",
      "Ay",
      "Bulutsular",
      "Evren ve Biz",
      "Gezegenler",
      "Güneş",
      "Güneş Sistemi",
      "Uzay Teknolojileri",
      "Uçma Prensipleri",
    ],
    "12-14": [
      "Dünya'nın Yapısı",
      "GPS",
      "Gizemli Evren",
      "Güneş Sistemi",
      "Uydular",
      "Uzay Teknolojileri",
      "Uçakların Çalışma Prensipleri",
      "Uçma Prensipleri",
      "Öte Gezegenler",
    ],
  },
  "natural-sciences": {
    "6-8": [
      "Basınç",
      "Canlıların Birbirleriyle İlişkileri",
      "Doğa Gözlemleri",
      "Doğadaki İşleyiş",
      "Evimizdeki Kimya",
      "Kaldırma Kuvveti",
      "Kuvvet - Enerji İlişkisi",
      "Mikroorganizmalar",
      "Vücudumuzu Tanıyalım",
    ],
    "9-11": [
      "Atomlar ve Moleküller",
      "Basınç",
      "Doğadaki Sistemler",
      "Evimizdeki Kimya",
      "Hücre",
      "Işık ve Optik",
      "Kaldırma Kuvveti",
      "Kuvvet - Enerji İlişkisi",
      "Paleontoloji Bilimi",
    ],
    "12-14": [
      "Atomlar ve Moleküller",
      "Elektrik ve Magnetizma",
      "Evimizdeki Kimya",
      "Kalıtım",
      "Kuvvet - Enerji İlişkisi",
      "Optik",
      "Permakültür",
      "Taşlar ve Kayaçlar",
      "Vücudumuzdaki Sistemler",
    ],
  },
  entrepreneurship: {
    // Three, not nine. The site lists only these for the youngest cohort.
    "6-8": ["Beyin Fırtınası", "Fikir Geliştirme", "Takım Çalışması"],
    "9-11": [
      "Beyin Fırtınası",
      "Eleştirel Düşünme",
      "Fikir Geliştirme",
      "Logo Tasarımı",
      "Münazara",
      "Pazar Analizi",
      "Pazarlama",
      "Takım Çalışması",
      "İnovasyon Çeşitleri",
    ],
    "12-14": [
      "Beyin Fırtınası",
      "Fikir Geliştirme",
      "Müşteri Analizi",
      "Satış",
      "Sunum Becerileri",
      "Takım Çalışması",
      "Temel Finansal Düşünme",
      "Yatırım",
      "Üretken Olma",
    ],
  },
  mathematics: {
    "6-8": [
      "Geometrik Şekiller",
      "Grafik Oluşturma",
      "Kesirlere Giriş",
      "Kümeler",
      "Matematik Oyunları",
      "Sayılar",
      "Uzunluk Ölçme",
      "Zaman",
      "Örüntüler",
    ],
    "9-11": [
      "3 Boyutlu Düşünme",
      "Alan",
      "Açılar",
      "Ağırlık Ölçümü",
      "Denklemler",
      "Geoboard",
      "Kesirler",
      "Kriptoloji",
      "Matematik Oyunları",
    ],
    "12-14": [
      "Alan",
      "Açılar",
      "Geometrik Şekiller",
      "Hacim",
      "Kesirler",
      "Olasılık",
      "Oran - Orantı",
      "Simetri",
      "Örüntüler",
    ],
  },
  "agricultural-technologies": {
    "6-8": [
      "Bitki Besleme Teknolojileri",
      "Bitki Böcekleri",
      "Bitki Sulama ve Sulama Teknolojileri",
      "Bitki İlaçlama",
      "Bitkisel Üretim",
      "Fidancılık, Tohumculuk, Mantarcılık",
      "Gübreleme",
      "Sera Sistemleri",
      "Tarım Araçları",
    ],
    "9-11": [
      "Akıllı Seralar",
      "Akıllı Sulama Sistemleri",
      "Bitki Besleme Teknolojileri",
      "Bitki Sulama ve Sulama Teknolojileri",
      "Bitkisel Üretim",
      "Fidancılık, Tohumculuk, Mantarcılık",
      "Gübreleme",
      "Hidroponik Tarım",
      "Sera Sistemleri",
    ],
    "12-14": [
      "Akıllı Seralar",
      "Akıllı Sulama Sistemleri",
      "Aquaponic Tarım",
      "Bitki Besleme Teknolojileri",
      "Bitki Sulama ve Sulama Teknolojileri",
      "Bitkisel Üretim",
      "Fidancılık, Tohumculuk, Mantarcılık",
      "Gübreleme",
      "Sera Sistemleri",
    ],
  },
  design: {
    "6-8": [
      "Boya-Baskı",
      "Damlatmalı Sanat",
      "Dokuma",
      "Portre Çalışmaları",
      "Sanat Akımları",
      "Seramik Boyama",
      "Soyut Sanat",
      "Sulu Boya",
      "Taş Boyama",
    ],
    "9-11": [
      "Doodle",
      "Geleneksel Türk Sanatları",
      "Keçeden Ürün Tasarımı",
      "Kumaş Boyama",
      "Kuru Çiçek Tasarımı",
      "Makrome",
      "Portre Çalışmaları",
      "Sanat Akımları",
      "Seramik Boyama",
    ],
    "12-14": [
      "Boya Baskı",
      "Dokuma",
      "Filografi",
      "Kaligrafi",
      "Kat'ı Sanatı",
      "Keçeden Ürün Tasarımı",
      "Mandala",
      "Origami",
      "Takı Yapımı",
    ],
  },
  technology: {
    "6-8": [
      "3B Modelleme",
      "3B Yazıcı",
      "Artırılmış Gerçeklik",
      "Bilgisayar Kodlama",
      "Elektronik Programlama",
      "Kodlama ve Algoritma",
      "Robotik Projeler",
      "Temel Elektrik Devreleri",
      "İkili Kod Sistemi",
    ],
    "9-11": [
      "3B Modelleme ve Üretim",
      "Animasyon Yapımı",
      "Artırılmış Gerçeklik",
      "Elektronik Programlama",
      "Enerji Teknolojileri",
      "Oyun Tasarımı",
      "Robotik Projeler",
      "Robotik ve Kodlama",
      "Temel Elektrik Devreleri",
    ],
    "12-14": [
      "Animasyon Yapımı",
      "Bilgisayar Dilleri",
      "Deneyap Kart Eğitimi",
      "Elektronik Programlama",
      "Enerji Teknolojileri",
      "Mobil Uygulama Geliştirme",
      "Oyun Tasarımı",
      "Robotik Projeler",
      "Yapay Zeka",
    ],
  },
} as const satisfies Record<WorkshopDomainId, Record<AgeCohortId, readonly string[]>>;

const TURKISH_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", I: "i", Ö: "o", Ş: "s", Ü: "u",
};

/**
 * Turkish-aware slug. Written out rather than using toLowerCase() because the
 * dotted capital İ lowercases to "i̇" (i + combining dot) in JavaScript, which
 * would put an invisible character in an id used as a URL segment.
 */
export function catalogueSlug(title: string): string {
  return [...title]
    .map((char) => TURKISH_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CatalogueEntry = {
  /** `${domainId}:${cohort}:${slug}` — stable as long as the title is. */
  id: string;
  domainId: WorkshopDomainId;
  cohort: AgeCohortId;
  /** Verbatim, as published. */
  title: string;
};

export const CATALOGUE_ENTRIES: readonly CatalogueEntry[] = WORKSHOP_DOMAIN_IDS.flatMap((domainId) =>
  AGE_COHORT_IDS.flatMap((cohort) =>
    CATALOGUE[domainId][cohort].map((title) => ({
      id: `${domainId}:${cohort}:${catalogueSlug(title)}`,
      domainId,
      cohort,
      title,
    })),
  ),
);

const BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.id, entry]));

export const CATALOGUE_ENTRY_IDS = CATALOGUE_ENTRIES.map((entry) => entry.id) as [
  string,
  ...string[],
];

export function isCatalogueEntryId(value: string): boolean {
  return BY_ID.has(value);
}

export function getCatalogueEntry(id: string): CatalogueEntry {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`UNKNOWN_CATALOGUE_ENTRY:${id}`);
  return entry;
}

export function catalogueEntriesFor(domainId: WorkshopDomainId, cohort: AgeCohortId) {
  return CATALOGUE_ENTRIES.filter(
    (entry) => entry.domainId === domainId && entry.cohort === cohort,
  );
}

/**
 * Coverage of the published catalogue by authored İMKÂN content.
 *
 * Computed from the corpus rather than written down, so it cannot drift into a
 * flattering number. Every figure here is a denominator the product is honest
 * about on screen: authoring one topic moves it, and nothing else does.
 */
export type CatalogueCoverage = {
  entriesTotal: number;
  entriesAuthored: number;
  themesTotal: number;
  themesAuthored: number;
  cohortsTotal: number;
  cohortsAuthored: number;
  /** Authored topics with no counterpart on the published catalogue. */
  unlistedTopics: number;
};

export function catalogueCoverage(
  topics: readonly { domainId: WorkshopDomainId; cohort: AgeCohortId; catalogueEntryId: string | null }[],
): CatalogueCoverage {
  const authored = topics.filter((topic) => topic.catalogueEntryId !== null);
  return {
    entriesTotal: CATALOGUE_ENTRIES.length,
    entriesAuthored: new Set(authored.map((topic) => topic.catalogueEntryId)).size,
    themesTotal: WORKSHOP_DOMAIN_IDS.length,
    themesAuthored: new Set(authored.map((topic) => topic.domainId)).size,
    cohortsTotal: AGE_COHORT_IDS.length,
    cohortsAuthored: new Set(authored.map((topic) => topic.cohort)).size,
    unlistedTopics: topics.length - authored.length,
  };
}
