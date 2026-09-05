import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";
import { buildCandidates, topCandidates } from "@/server/domain/candidates";
import { getOutcomeContent } from "@/server/content/curriculum";
import { INVENTORY_PRESETS } from "@/server/content/materials";
import { VENUE_CAPABILITY_IDS } from "@/server/content/venues";
import type { ResourceProfile } from "@/server/domain/types";

/**
 * Presenting one chosen route made the product look like it had decided on the
 * trainer's behalf. It had not — it applied rules — and the rules are the
 * useful part. Every field on a candidate is computed; there is no score and
 * no model input, because an ordering nobody can reconstruct is worse than a
 * plain list.
 */
const space = getOutcomeContent("space-age");

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

describe("candidate verdicts", () => {
  it("keeps every route on the list, including the ones that cannot run", () => {
    const candidates = buildCandidates(space, profile());
    expect(candidates).toHaveLength(space.routes.length);
  });

  it("gives each candidate at least one reason a person can act on", () => {
    for (const candidate of buildCandidates(space, profile())) {
      expect(candidate.reasons.length).toBeGreaterThan(0);
      expect(candidate.reasons[0].length).toBeGreaterThan(10);
    }
  });

  it("calls a route ready only when nothing has to be acquired", () => {
    const stocked = buildCandidates(
      space,
      profile({
        materials: [...INVENTORY_PRESETS.workshop.materials],
        capabilities: [...VENUE_CAPABILITY_IDS],
      }),
    );
    const ready = stocked.filter((candidate) => candidate.status === "ready");
    expect(ready.length).toBeGreaterThan(0);
    for (const candidate of ready) expect(candidate.acquisitionCostTry).toBe(0);
  });

  it("separates ready from adaptable by acquisition, not by tier", () => {
    // A richer route the trainer already has everything for is deliverable; a
    // plainer one needing a shopping trip is not. That is the distinction
    // someone planning next week actually cares about.
    const candidates = buildCandidates(space, profile({ materials: ["paper"] }));
    const adaptable = candidates.filter((candidate) => candidate.status === "adaptable");
    for (const candidate of adaptable) expect(candidate.acquisitionCostTry).toBeGreaterThan(0);
  });

  it("marks a route unsettled rather than blocked when a facility is unknown", () => {
    const candidates = buildCandidates(space, profile());
    const dome = candidates.find((candidate) => candidate.routeId === "space-age-planetarium");
    expect(dome?.status).toBe("uncertain");
    expect(dome?.unknownCapabilities).toContain("Planetaryum");
  });

  it("blocks the same route once absence is verified", () => {
    const candidates = buildCandidates(
      space,
      profile({ unavailableCapabilities: ["planetarium"] }),
    );
    const dome = candidates.find((candidate) => candidate.routeId === "space-age-planetarium");
    expect(dome?.status).toBe("blocked");
  });

  it("says when acquiring the difference would break a hard budget", () => {
    const candidates = buildCandidates(
      space,
      profile({ materials: ["paper"], budgetTry: 1, hardBudget: true }),
    );
    const overBudget = candidates.filter((candidate) => candidate.overBudget);
    expect(overBudget.length).toBeGreaterThan(0);
    expect(overBudget[0].reasons.join(" ")).toContain("kesin bütçeyi aşıyor");
  });

  it("prices every candidate, not only the one that was chosen", () => {
    for (const candidate of buildCandidates(space, profile())) {
      expect(Number.isFinite(candidate.totalCostTry)).toBe(true);
      expect(candidate.acquisitionCostTry).toBeLessThanOrEqual(candidate.totalCostTry);
    }
  });
});

describe("candidate ordering", () => {
  it("puts deliverable routes first and blocked ones last", () => {
    const candidates = buildCandidates(space, profile({ materials: ["paper"] }));
    const rank = { ready: 0, adaptable: 1, uncertain: 2, blocked: 3 } as const;
    const ranks = candidates.map((candidate) => rank[candidate.status]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it("caps the list, because a list long enough to scan stops explaining", () => {
    expect(topCandidates(buildCandidates(space, profile())).length).toBeLessThanOrEqual(3);
  });
});

describe("candidates on the plan", () => {
  it("travels with the plan so a reviewer sees the same reasoning", () => {
    const plan = generateWorkshop(profile());
    expect(plan.candidates?.length).toBe(space.routes.length);
  });

  it("marks the route the plan actually used", () => {
    const plan = generateWorkshop(profile());
    const chosen = plan.candidates?.find((candidate) => candidate.routeId === plan.routeId);
    // The delivered route must never be one the rules ruled out.
    expect(chosen).toBeDefined();
    expect(["ready", "adaptable"]).toContain(chosen!.status);
  });
});
