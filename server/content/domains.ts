/**
 * Bilim Türkiye's own organising axes.
 *
 * The corpus is keyed on these rather than on curriculum units because Bilim
 * Türkiye structures its programme by workshop domain and age cohort, not by
 * MEB kazanım. A curriculum mapping is valuable — it lets a visiting school
 * group see which learning outcome a session supports — but it is a property
 * of a topic, not its identity.
 *
 * Names are transcribed from https://t3bilimturkiye.org/tr/atolyeler.
 */

export type WorkshopDomainRecord = {
  /** Official Turkish name, verbatim. */
  label: string;
  /** Short label for chips and filters where the full name will not fit. */
  shortLabel: string;
  description: string;
};

export const WORKSHOP_DOMAINS = {
  technology: {
    label: "Teknoloji Atölyesi",
    shortLabel: "Teknoloji",
    description: "Robotik, programlama, mobil uygulama ve enerji teknolojileri.",
  },
  mathematics: {
    label: "Matematik Atölyesi",
    shortLabel: "Matematik",
    description: "Sayılar, geometri ve matematiksel düşünme etkinlikleri.",
  },
  entrepreneurship: {
    label: "Girişim Atölyesi",
    shortLabel: "Girişim",
    description: "Fikir geliştirme, inovasyon ve iş planlama.",
  },
  design: {
    label: "Tasarım Atölyesi",
    shortLabel: "Tasarım",
    description: "Sanat, yaratıcı ifade ve tasarım süreçleri.",
  },
  "natural-sciences": {
    label: "Doğa Bilimleri Atölyesi",
    shortLabel: "Doğa Bilimleri",
    description: "Biyoloji, ekoloji ve uygulamalı deney etkinlikleri.",
  },
  "astronomy-aviation-space": {
    label: "Astronomi, Havacılık ve Uzay Atölyesi",
    shortLabel: "Astronomi ve Uzay",
    description: "Gök bilimi, havacılık ve uzay keşfi.",
  },
  "agricultural-technologies": {
    label: "Tarım Teknolojileri Atölyesi",
    shortLabel: "Tarım Teknolojileri",
    description: "Sürdürülebilir tarım uygulamaları ve teknolojileri.",
  },
} as const satisfies Record<string, WorkshopDomainRecord>;

export type WorkshopDomainId = keyof typeof WORKSHOP_DOMAINS;

export const WORKSHOP_DOMAIN_IDS = Object.keys(WORKSHOP_DOMAINS) as [
  WorkshopDomainId,
  ...WorkshopDomainId[],
];

export function getWorkshopDomain(id: WorkshopDomainId): WorkshopDomainRecord {
  return WORKSHOP_DOMAINS[id];
}

/**
 * Bilim Türkiye groups participants into three cohorts rather than by school
 * grade, so the corpus does the same. A topic declares the cohort its content
 * is actually written for.
 */
export const AGE_COHORTS = {
  "6-8": { label: "6-8 yaş", minAge: 6, maxAge: 8 },
  "9-11": { label: "9-11 yaş", minAge: 9, maxAge: 11 },
  "12-14": { label: "12-14 yaş", minAge: 12, maxAge: 14 },
} as const satisfies Record<string, { label: string; minAge: number; maxAge: number }>;

export type AgeCohortId = keyof typeof AGE_COHORTS;

export const AGE_COHORT_IDS = Object.keys(AGE_COHORTS) as [AgeCohortId, ...AgeCohortId[]];
