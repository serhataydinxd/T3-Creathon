/**
 * Bilim Türkiye's four education formats, transcribed from the home page and
 * cross-checked in content/bilim-turkiye-formatlar.md.
 *
 * Only what they publish is encoded here. Group size, per-format age bands and
 * the session breakdown of a long package are not published, so this file does
 * not invent them.
 */

export type FormatRecord = {
  /** Official Turkish name, verbatim. Note "çevrim içi" is written apart. */
  label: string;
  shortLabel: string;
  description: string;
  /**
   * Published session length in minutes. Their single-session rule is one
   * hour; anything else is a local choice and the plan says so.
   */
  standardSessionMinutes: number;
  /** Whether a centre's fixed facilities can be part of the delivery. */
  allowsVenueCapabilities: boolean;
  requiresInternet: boolean;
  /**
   * False where the published format is a multi-session package. İMKÂN plans
   * one session at a time, so the plan states which package it belongs to
   * rather than pretending to cover the whole course.
   */
  plansWholeFormat: boolean;
  packageNote?: string;
};

export const FORMATS = {
  "school-group": {
    label: "Okul Gruplarına Yönelik Eğitimler",
    shortLabel: "Okul grubu programı",
    description:
      "Özel ve devlet okullarına yönelik atölye eğitimi; merkezde varsa sergi alanı ve planetaryum da kapsamda.",
    standardSessionMinutes: 60,
    allowsVenueCapabilities: true,
    requiresInternet: false,
    plansWholeFormat: true,
  },
  thematic: {
    label: "Tematik Atölye Eğitimleri",
    shortLabel: "Tematik eğitim",
    description: "Özel gün ve haftalara yönelik atölye içerikleri.",
    standardSessionMinutes: 60,
    allowsVenueCapabilities: true,
    requiresInternet: false,
    plansWholeFormat: true,
  },
  "long-term": {
    label: "Uzun Süreli Eğitimler",
    shortLabel: "Uzun süreli eğitim",
    description:
      "Beş farklı atölyede yürütülen paket program; merkezde varsa sergi alanı ve planetaryum eğitimi de kapsama girer.",
    standardSessionMinutes: 60,
    allowsVenueCapabilities: true,
    requiresInternet: false,
    plansWholeFormat: false,
    packageNote:
      "Bu format 15 veya 30 saatlik, beş atölyeye yayılan bir pakettir. Burada paketin tek oturumu planlanır; oturumlara dağılım Bilim Türkiye tarafından yayımlanmamıştır.",
  },
  online: {
    label: "Çevrim İçi Atölye Eğitimleri",
    shortLabel: "Çevrim içi atölye",
    description: "Video anlatımlı, uygulamalı canlı atölye dersleri.",
    standardSessionMinutes: 60,
    // The participant is at home, so a centre's dome or exhibition floor
    // cannot be part of the session.
    allowsVenueCapabilities: false,
    requiresInternet: true,
    plansWholeFormat: true,
  },
} as const satisfies Record<string, FormatRecord>;

export type FormatId = keyof typeof FORMATS;

export const FORMAT_IDS = Object.keys(FORMATS) as [FormatId, ...FormatId[]];

/** The published one-hour single-session format is the sensible starting point. */
export const DEFAULT_FORMAT_ID: FormatId = "school-group";

export function getFormat(id: string | undefined): FormatRecord & { id: FormatId } {
  const resolved = (id && isFormatId(id) ? id : DEFAULT_FORMAT_ID) as FormatId;
  return { id: resolved, ...FORMATS[resolved] };
}

export function isFormatId(value: string): value is FormatId {
  return Object.prototype.hasOwnProperty.call(FORMATS, value);
}
