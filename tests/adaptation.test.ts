import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPATIBILITY_LABEL,
  compareForCentre,
  profileForCentre,
} from "@/server/domain/adaptation";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";
import { VENUE_CAPABILITY_IDS } from "@/server/content/venues";
import { INVENTORY_PRESETS } from "@/server/content/materials";
import type { ResourceProfile } from "@/server/domain/types";

/**
 * Adapting a delivered session to another centre. Every verdict here is
 * computed: an adaptation is a claim that a session can or cannot run
 * somewhere else, and the reasons are what a trainer acts on.
 */
function sourceProfile(overrides: Partial<ResourceProfile> = {}): ResourceProfile {
  return {
    ...DEFAULT_PROFILE,
    outcomeId: "space-age",
    hasElectricity: true,
    hasInternet: true,
    budgetTry: 100_000,
    materials: [...INVENTORY_PRESETS.workshop.materials],
    capabilities: [...VENUE_CAPABILITY_IDS],
    unavailableCapabilities: [],
    ...overrides,
  };
}

describe("what an adaptation may change", () => {
  it("carries the pedagogical decisions across untouched", () => {
    const source = sourceProfile();
    const target = profileForCentre(source, { capabilities: [], unavailableCapabilities: [] });
    // Topic, duration, group size and format describe the session, not the
    // venue, so adapting must not silently alter them.
    expect(target.outcomeId).toBe(source.outcomeId);
    expect(target.durationMinutes).toBe(source.durationMinutes);
    expect(target.groupSize).toBe(source.groupSize);
    expect(target.formatId).toBe(source.formatId);
  });

  it("replaces only what belongs to the venue", () => {
    const target = profileForCentre(sourceProfile(), {
      capabilities: ["exhibition"],
      unavailableCapabilities: ["planetarium"],
    });
    expect(target.capabilities).toEqual(["exhibition"]);
    expect(target.unavailableCapabilities).toEqual(["planetarium"]);
  });

  it("drops stock counts, which describe the source venue's cupboard", () => {
    const source = sourceProfile({ materialStock: { paper: 500 } });
    const target = profileForCentre(source, { capabilities: [], unavailableCapabilities: [] });
    expect(target.materialStock).toEqual({});
  });
});

describe("the compatibility verdict", () => {
  const source = generateWorkshop(sourceProfile());

  it("is fully compatible at an identically equipped centre", () => {
    const report = compareForCentre(source, sourceProfile());
    expect(report.status).toBe("compatible");
    expect(report.findings.some((finding) => finding.code === "REQUIREMENTS_MET")).toBe(true);
  });

  it("reports missing information rather than incompatibility for an unknown facility", () => {
    // The distinction the three-state model exists for, carried through to
    // adaptation: nobody has recorded this centre's dome either way.
    const report = compareForCentre(
      source,
      profileForCentre(sourceProfile(), { capabilities: [], unavailableCapabilities: [] }),
    );
    expect(report.status).toBe("unknown-centre");
    expect(report.status).not.toBe("incompatible");
    expect(report.findings.some((finding) => finding.code === "CAPABILITY_UNKNOWN")).toBe(true);
  });

  it("names the route swap when a verified absence forces one", () => {
    const report = compareForCentre(
      source,
      profileForCentre(sourceProfile(), {
        capabilities: [],
        unavailableCapabilities: [...VENUE_CAPABILITY_IDS],
      }),
    );
    expect(report.findings.some((finding) => finding.code === "ROUTE_CHANGED")).toBe(true);
    expect(report.targetRouteId).not.toBe(report.sourceRouteId);
  });

  it("recomputes groups, cost and what must be acquired", () => {
    const report = compareForCentre(
      source,
      profileForCentre(sourceProfile(), {
        capabilities: [],
        unavailableCapabilities: [...VENUE_CAPABILITY_IDS],
        materials: ["paper"],
        classSize: 12,
      }),
    );
    expect(report.targetGroupCount).not.toBe(report.sourceGroupCount);
    expect(report.findings.some((finding) => finding.code === "GROUP_COUNT_CHANGED")).toBe(true);
    expect(report.acquisitionCostTry).toBeGreaterThanOrEqual(0);
  });

  it("calls it incompatible only when something actually blocks it", () => {
    const report = compareForCentre(
      source,
      profileForCentre(sourceProfile(), {
        capabilities: [],
        unavailableCapabilities: [...VENUE_CAPABILITY_IDS],
        materials: ["paper"],
        budgetTry: 0,
      }),
    );
    expect(report.status).toBe("incompatible");
    expect(report.findings.some((finding) => finding.severity === "blocker")).toBe(true);
  });

  it("offers the other approved routes for the same topic", () => {
    const report = compareForCentre(source, sourceProfile());
    expect(report.approvedAlternatives.length).toBeGreaterThan(0);
    for (const alternative of report.approvedAlternatives) {
      expect(alternative.routeId).not.toBe(report.targetRouteId);
    }
  });

  it("has a Turkish label for every verdict", () => {
    for (const status of ["compatible", "adaptable", "incompatible", "unknown-centre"] as const) {
      expect(COMPATIBILITY_LABEL[status]).toBeTruthy();
    }
  });
});

describe("what adapting must never do", () => {
  const source = readFileSync(new URL("../server/domain/adaptation.ts", import.meta.url), "utf8");

  it("creates a new version instead of updating the source", () => {
    expect(source).toContain("insert(workshopVersions)");
    // No update to the source version, its run or its report anywhere here.
    expect(source).not.toMatch(/update\(workshopVersions\)/);
    expect(source).not.toMatch(/update\(deliveryRecords\)/);
    expect(source).not.toMatch(/update\(deliveryReports\)/);
  });

  it("takes the topic from the source rather than from the request", () => {
    expect(source).toContain("outcomeId: sourcePlan.profile.outcomeId");
    expect(source).toContain("proposalEntryId: sourcePlan.profile.proposalEntryId");
  });

  it("records who adapted what, from where", () => {
    expect(source).toContain("sourceVersionId: delivery.sourceVersionId");
    expect(source).toContain("adaptedBy: user.id");
    expect(source).toContain("compatibility,");
  });

  it("never lets the caller assert a target centre's facilities", () => {
    const action = readFileSync(new URL("../app/actions/adaptation.ts", import.meta.url), "utf8");
    expect(action).toContain("centreCapabilityStatuses(parsed.centreSlug)");
    expect(action).not.toMatch(/formData\.get\("capabilities"\)/);
  });
});
