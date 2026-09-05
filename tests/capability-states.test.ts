import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";
import { evaluateRoute, selectRoute } from "@/server/domain/routes";
import { getOutcomeContent } from "@/server/content/curriculum";
import { resourceProfileSchema } from "@/server/domain/schemas";
import {
  CENTRE_IDS,
  SCHOOL_CLASSROOM,
  VENUE_CAPABILITY_IDS,
  confirmedCapabilities,
  facilityStatus,
  unknownCapabilities,
} from "@/server/content/venues";
import type { ResourceProfile } from "@/server/domain/types";

/**
 * The product's central claim is that it does not pretend to know things it
 * has not been told. A facility nobody has recorded is not absent, and a route
 * needing it is unsettled rather than rejected.
 */
const domeRoute = getOutcomeContent("space-age").routes.find((route) =>
  (route.eligibility.requiredCapabilities ?? []).includes("planetarium"),
)!;

function profile(overrides: Partial<ResourceProfile> = {}): ResourceProfile {
  return {
    ...DEFAULT_PROFILE,
    outcomeId: "space-age",
    hasElectricity: true,
    hasInternet: true,
    budgetTry: 100_000,
    capabilities: [],
    unavailableCapabilities: [],
    ...overrides,
  };
}

describe("a facility's three states reach the verdict", () => {
  it("offers the route when the facility is confirmed present", () => {
    const verdict = evaluateRoute(domeRoute, profile({ capabilities: ["planetarium"] }));
    expect(verdict.status).toBe("eligible");
  });

  it("rules the route out only when absence was actually verified", () => {
    const verdict = evaluateRoute(domeRoute, profile({ unavailableCapabilities: ["planetarium"] }));
    expect(verdict.status).toBe("blocked");
    expect(verdict.status === "blocked" && verdict.rejection.code).toBe("MISSING_CAPABILITY");
  });

  it("leaves the route unsettled when nobody has recorded the facility", () => {
    // The behaviour this whole model exists for: silence is not a no.
    const verdict = evaluateRoute(domeRoute, profile());
    expect(verdict.status).toBe("uncertain");
    expect(verdict.status === "uncertain" && verdict.uncertainty.unknownCapabilities).toEqual([
      "planetarium",
    ]);
  });

  it("names what to check, so the missing information is actionable", () => {
    const verdict = evaluateRoute(domeRoute, profile());
    expect(verdict.status === "uncertain" && verdict.uncertainty.reason).toContain("Planetaryum");
    expect(verdict.status === "uncertain" && verdict.uncertainty.reason).toContain("bilinmiyor");
  });

  it("reports a definite blocker ahead of an unknown", () => {
    // Asking someone to go and check a dome is useless when the route also
    // needs power the room does not have.
    const verdict = evaluateRoute(domeRoute, profile({ hasElectricity: false }));
    if (domeRoute.eligibility.requiresElectricity) {
      expect(verdict.status).toBe("blocked");
    } else {
      expect(verdict.status).toBe("uncertain");
    }
  });
});

describe("selection never assumes an unknown facility is there", () => {
  it("passes over an unconfirmed route rather than delivering on an assumption", () => {
    const selection = selectRoute("space-age", profile());
    expect(selection.route.id).not.toBe(domeRoute.id);
    expect(selection.uncertain.map((item) => item.routeId)).toContain(domeRoute.id);
    // And it is not restated as a rejection, which would assert absence.
    expect(selection.rejected.map((item) => item.routeId)).not.toContain(domeRoute.id);
  });

  it("keeps a verified absence a rejection, not an uncertainty", () => {
    const selection = selectRoute("space-age", profile({ unavailableCapabilities: ["planetarium"] }));
    expect(selection.rejected.map((item) => item.routeId)).toContain(domeRoute.id);
    expect(selection.uncertain).toEqual([]);
  });

  it("surfaces the gap on the plan as a warning a trainer can act on", () => {
    const plan = generateWorkshop(profile());
    const finding = plan.findings.find((item) => item.code === "CAPABILITY_STATUS_UNKNOWN");
    expect(finding?.severity).toBe("warning");
    expect(plan.uncertainRoutes?.length).toBeGreaterThan(0);
  });

  it("reports nothing uncertain once every facility has been settled", () => {
    const plan = generateWorkshop(profile({ capabilities: [...VENUE_CAPABILITY_IDS] }));
    expect(plan.uncertainRoutes).toEqual([]);
    expect(plan.findings.some((item) => item.code === "CAPABILITY_STATUS_UNKNOWN")).toBe(false);
  });
});

describe("where the three states come from", () => {
  it("treats a school classroom's lack of a dome as a verified fact", () => {
    // Not unknown: school classrooms do not have planetariums, and saying so
    // keeps the default demo deterministic instead of merely unsettled.
    expect(SCHOOL_CLASSROOM.unavailableCapabilities).toEqual([...VENUE_CAPABILITY_IDS]);
    const plan = generateWorkshop(DEFAULT_PROFILE);
    expect(plan.uncertainRoutes).toEqual([]);
  });

  it("leaves an unpublished centre facility unknown rather than absent", () => {
    // Bilim Çorum publishes no dome. That is silence, not a denial.
    expect(facilityStatus("corum", "planetarium")).toBe("unknown");
    expect(confirmedCapabilities("corum")).not.toContain("planetarium");
    expect(unknownCapabilities("corum")).toContain("planetarium");
  });

  it("gives a published facility to the centres that name one", () => {
    expect(facilityStatus("trabzon", "planetarium")).toBe("available");
  });

  it("never derives a verified absence from research alone", () => {
    for (const id of CENTRE_IDS) {
      for (const capability of VENUE_CAPABILITY_IDS) {
        expect(facilityStatus(id, capability)).not.toBe("unavailable");
      }
    }
  });
});

describe("the request schema", () => {
  const base = {
    durationMinutes: 60,
    classSize: 30,
    groupSize: 5,
    budgetTry: 50,
    hardBudget: true,
    hasInternet: false,
    hasElectricity: false,
    materials: ["paper"],
    accessibilityNeeds: [],
  };

  it("defaults an unstated facility to unknown rather than to absent", () => {
    const parsed = resourceProfileSchema.parse(base);
    expect(parsed.capabilities).toEqual([]);
    expect(parsed.unavailableCapabilities).toEqual([]);
  });

  it("refuses a facility asserted as both present and absent", () => {
    const result = resourceProfileSchema.safeParse({
      ...base,
      capabilities: ["planetarium"],
      unavailableCapabilities: ["planetarium"],
    });
    expect(result.success).toBe(false);
  });
});
