import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applicabilityOf } from "@/server/domain/library";
import {
  NARRATIVE_SECTIONS,
  PUBLIC_NARRATIVE_SECTIONS,
  emptyNarrative,
} from "@/server/domain/reports";
import { offlineNarrative, type DeliveryFacts } from "@/server/ai/reporting";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";

const plan = generateWorkshop(DEFAULT_PROFILE);

function facts(overrides: Partial<DeliveryFacts> = {}): DeliveryFacts {
  return {
    plan,
    centreName: "Bilim Trabzon",
    deliveredOn: "2026-09-05",
    actualParticipants: 21,
    actualGroups: 5,
    actualMinutes: 55,
    actualCostTry: null,
    whatWorked: null,
    whatWasHard: null,
    accessibilityApplied: "Yüksek kontrastlı kart kullanıldı.",
    safetyObservation: "Bir katılımcı makasla parmağını kesti.",
    incidentOccurred: true,
    nextTime: null,
    stages: [],
    materials: [],
    ...overrides,
  };
}

/**
 * A safety observation is operational information for the centre that ran the
 * session. It belongs in the internal report and nowhere else — and it reached
 * the public library once, folded into the accessibility section, before it
 * was given a section of its own.
 */
describe("what a public entry may carry", () => {
  it("keeps safety out of the sections a library entry renders", () => {
    expect(NARRATIVE_SECTIONS).toContain("safety");
    expect(PUBLIC_NARRATIVE_SECTIONS).not.toContain("safety");
  });

  it("is an allow-list, so a new section is private until someone decides", () => {
    const source = readFileSync(new URL("../server/domain/reports.ts", import.meta.url), "utf8");
    // Written out rather than derived by removing "safety" from the full list:
    // a filter would silently publish whatever gets added next.
    expect(source).not.toMatch(/NARRATIVE_SECTIONS\.filter/);
    for (const key of PUBLIC_NARRATIVE_SECTIONS) expect(NARRATIVE_SECTIONS).toContain(key);
  });

  it("writes the incident into safety and not into accessibility", () => {
    const narrative = offlineNarrative(facts());
    expect(narrative.safety).toContain("parmağını kesti");
    expect(narrative.safety).toContain("olay bildirildi");
    expect(narrative.accessibility).not.toContain("parmağını kesti");
    expect(narrative.accessibility).toContain("Yüksek kontrastlı");
  });

  it("renders only the allow-listed sections on the library page", () => {
    const page = readFileSync(new URL("../app/library/[id]/page.tsx", import.meta.url), "utf8");
    expect(page).toContain("PUBLIC_NARRATIVE_SECTIONS.map");
    // The bare list would include safety; the allow-listed one cannot.
    expect(page).not.toMatch(/(?<!PUBLIC_)NARRATIVE_SECTIONS\.map/);
  });

  it("still shows the centre its own safety record", () => {
    const page = readFileSync(new URL("../app/deliveries/[id]/page.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/(?<!PUBLIC_)NARRATIVE_SECTIONS\.map/);
    expect(page).toContain("Güvenlik ve olay kaydı");
  });

  it("gives every section a value, so a gap reads as a gap", () => {
    const empty = emptyNarrative();
    for (const key of NARRATIVE_SECTIONS) expect(empty[key]).toBeTruthy();
  });
});

describe("what the library row itself stores", () => {
  const source = readFileSync(new URL("../server/domain/library.ts", import.meta.url), "utf8");

  it("never copies the educator's free-text notes into a public row", () => {
    expect(source).not.toContain("safetyObservation");
    expect(source).not.toContain("accessibilityApplied");
    expect(source).not.toContain("whatWorked");
  });

  it("checks all four entry conditions rather than trusting the caller", () => {
    expect(source).toContain("REPORT_NOT_APPROVED");
    expect(source).toContain("SOURCE_NOT_PUBLISHED");
    expect(source).toContain("SHARING_NOT_PERMITTED");
  });

  it("filters and paginates in the database, not after fetching", () => {
    expect(source).toContain(".limit(LIBRARY_PAGE_SIZE + 1)");
    expect(source).toContain(".offset(");
    expect(source).not.toMatch(/\.filter\(\(entry\)/);
  });
});

describe("the applicability label", () => {
  const base = { actualCostTry: 0, requiresElectricity: false, requiredCapabilities: [] };

  it("leads with a facility requirement, the hardest thing to fix", () => {
    expect(applicabilityOf({ ...base, requiredCapabilities: ["planetarium"] })).toBe("needs-facility");
  });

  it("marks a session that needs no power", () => {
    expect(applicabilityOf(base)).toBe("no-power");
  });

  it("distinguishes cheap from ordinary once power is needed", () => {
    expect(applicabilityOf({ ...base, requiresElectricity: true, actualCostTry: 20 })).toBe("low-cost");
    expect(applicabilityOf({ ...base, requiresElectricity: true, actualCostTry: 400 })).toBe("standard");
  });
});
