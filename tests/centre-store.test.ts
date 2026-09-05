import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CENTRE_IDS, VENUE_CAPABILITY_IDS, facilityStatus } from "@/server/content/venues";

/**
 * The operational centre record exists so a verification outlives the browser
 * session that made it, and so a claim can be attributed. What matters is
 * where each status came from: the same three values mean very different
 * things depending on whether a page or a person produced them.
 */
describe("seeding centre facilities from research", () => {
  const source = readFileSync(new URL("../server/domain/centre-store.ts", import.meta.url), "utf8");

  it("never writes a verified absence from a published page", () => {
    // Research establishes that a page names a dome, never that a centre lacks
    // one. The seed therefore cannot produce "unavailable" for any centre.
    for (const slug of CENTRE_IDS) {
      for (const capability of VENUE_CAPABILITY_IDS) {
        expect(facilityStatus(slug, capability)).not.toBe("unavailable");
      }
    }
  });

  it("refuses to overwrite a status a person verified", () => {
    // A deploy re-runs the sync. If it re-asserted the published claim over a
    // human verification, an educator's finding would silently expire on the
    // next release — the one thing this table exists to prevent.
    expect(source).toContain("if (existing[0]?.verifiedAt) continue;");
  });

  it("records a person as the authority instead of a source page", () => {
    const verify = source.slice(source.indexOf("export async function verifyCentreCapability"));
    expect(verify).toContain("sourceUrl: null");
    expect(verify).toContain("verifiedBy: input.userId");
    expect(verify).toContain("verifiedAt: new Date()");
  });

  it("stamps a verification even when the answer is 'unknown'", () => {
    // Withdrawing a claim is a decision someone made; the record should say
    // who unmade it rather than looking like nobody ever checked.
    const verify = source.slice(source.indexOf("export async function verifyCentreCapability"));
    expect(verify).not.toMatch(/if \(input\.status === "unknown"\)/);
  });
});

describe("who may change the record", () => {
  const action = readFileSync(new URL("../app/actions/centres.ts", import.meta.url), "utf8");

  it("limits verification to the roles that are actually in the building", () => {
    expect(action).toContain('requireRole(["educator", "manager"])');
    // A content expert writing a session elsewhere cannot assert what a centre
    // does or does not have.
    expect(action).not.toMatch(/content_expert/);
  });

  it("validates the centre, facility and status against the registries", () => {
    expect(action).toContain("z.enum(CENTRE_IDS)");
    expect(action).toContain("z.enum(VENUE_CAPABILITY_IDS)");
    expect(action).toContain('z.enum(["available", "unavailable", "unknown"])');
  });

  it("refreshes the lab, which reads these statuses", () => {
    expect(action).toContain('revalidatePath("/lab")');
  });
});

describe("the centre screen stays out of the crawl", () => {
  it("is listed as a private route", async () => {
    const { PRIVATE_ROUTES } = await import("@/server/site");
    expect(PRIVATE_ROUTES).toContain("/centres");
  });

  it("asks not to be indexed", () => {
    const page = readFileSync(new URL("../app/centres/page.tsx", import.meta.url), "utf8");
    expect(page).toContain("robots: { index: false, follow: false }");
  });
});
