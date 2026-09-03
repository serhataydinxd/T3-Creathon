import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The store talks to Postgres, so point the client at an in-memory PGlite
// instance before anything imports it and caches a connection.
process.env.DATABASE_URL = "pglite:memory://";
process.env.DATABASE_SSL = "false";

const { closeDatabase, getDb, migrateDatabase } = await import("@/server/db/client");
const { users } = await import("@/server/db/schema");
const {
  GENERATION_RECORD_TTL_MS,
  hashProfile,
  issueGenerationRecord,
  loadGenerationRecord,
  pruneExpiredGenerationRecords,
} = await import("@/server/ai/generation-record");
const { DEFAULT_PROFILE, generateWorkshop } = await import("@/server/domain/generator");
const { draftRequestSchema } = await import("@/server/domain/schemas");

const plan = generateWorkshop(DEFAULT_PROFILE);
let owner = "";
let other = "";

beforeAll(async () => {
  await migrateDatabase();
  const inserted = await getDb()
    .insert(users)
    .values([
      { email: "owner@imkan.test", name: "Sahip", passwordHash: "x", status: "active" },
      { email: "other@imkan.test", name: "Diğer", passwordHash: "x", status: "active" },
    ])
    .returning({ id: users.id, email: users.email });
  owner = inserted.find((row) => row.email === "owner@imkan.test")!.id;
  other = inserted.find((row) => row.email === "other@imkan.test")!.id;
});

afterAll(async () => {
  await closeDatabase();
});

describe("profile hashing", () => {
  it("does not depend on property order", () => {
    const reordered = Object.fromEntries(
      Object.entries(DEFAULT_PROFILE).reverse(),
    ) as typeof DEFAULT_PROFILE;
    expect(hashProfile(reordered)).toBe(hashProfile(DEFAULT_PROFILE));
  });

  it("changes when a condition changes", () => {
    expect(hashProfile({ ...DEFAULT_PROFILE, budgetTry: 500 })).not.toBe(
      hashProfile(DEFAULT_PROFILE),
    );
  });
});

describe("issuing and resolving a generation record", () => {
  it("returns the stored plan, mode and attributed model", async () => {
    const live = { ...plan, mode: "LIVE" as const, title: "Model yazdı" };
    const { id, expiresAt } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan: live,
      providerModel: "test-model",
    });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const loaded = await loadGenerationRecord({
      userId: owner,
      recordId: id,
      profile: DEFAULT_PROFILE,
    });
    expect(loaded.plan.title).toBe("Model yazdı");
    expect(loaded.mode).toBe("live");
    expect(loaded.providerModel).toBe("test-model");
  });

  it("records no provider for a deterministic plan, even if one is offered", async () => {
    const { id } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      // A fallback still knows which model it tried; the record must not
      // attribute replay prose to it.
      providerModel: "test-model",
    });
    const loaded = await loadGenerationRecord({
      userId: owner,
      recordId: id,
      profile: DEFAULT_PROFILE,
    });
    expect(loaded.mode).toBe("replay");
    expect(loaded.providerModel).toBeNull();
  });

  it("stays claimable so two concurrent saves resolve to one draft", async () => {
    const { id } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
    });
    const [first, second] = await Promise.all([
      loadGenerationRecord({ userId: owner, recordId: id, profile: DEFAULT_PROFILE }),
      loadGenerationRecord({ userId: owner, recordId: id, profile: DEFAULT_PROFILE }),
    ]);
    expect(first.plan.title).toBe(second.plan.title);
  });
});

describe("rejection paths", () => {
  it("refuses an id that was never issued", async () => {
    await expect(
      loadGenerationRecord({
        userId: owner,
        recordId: "00000000-0000-4000-8000-000000000000",
        profile: DEFAULT_PROFILE,
      }),
    ).rejects.toThrow("GENERATION_RECORD_NOT_FOUND");
  });

  it("refuses another user's record, indistinguishably from a missing one", async () => {
    const { id } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
    });
    // Same error as an unknown id, so the endpoint cannot confirm that someone
    // else's record exists.
    await expect(
      loadGenerationRecord({ userId: other, recordId: id, profile: DEFAULT_PROFILE }),
    ).rejects.toThrow("GENERATION_RECORD_NOT_FOUND");
  });

  it("refuses an expired record", async () => {
    const { id } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
    });
    await expect(
      loadGenerationRecord({
        userId: owner,
        recordId: id,
        profile: DEFAULT_PROFILE,
        now: new Date(Date.now() + GENERATION_RECORD_TTL_MS + 1_000),
      }),
    ).rejects.toThrow("GENERATION_RECORD_EXPIRED");
  });

  it("refuses a record generated for different classroom conditions", async () => {
    const { id } = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
    });
    await expect(
      loadGenerationRecord({
        userId: owner,
        recordId: id,
        // The expert changed the budget after generating.
        profile: { ...DEFAULT_PROFILE, budgetTry: 500 },
      }),
    ).rejects.toThrow("GENERATION_PROFILE_MISMATCH");
  });
});

describe("expiry cleanup", () => {
  it("removes only rows past their expiry", async () => {
    const fresh = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
    });
    const stale = await issueGenerationRecord({
      userId: owner,
      profile: DEFAULT_PROFILE,
      plan,
      providerModel: null,
      now: new Date(Date.now() - GENERATION_RECORD_TTL_MS - 60_000),
    });

    const removed = await pruneExpiredGenerationRecords();
    expect(removed).toBeGreaterThanOrEqual(1);

    await expect(
      loadGenerationRecord({ userId: owner, recordId: stale.id, profile: DEFAULT_PROFILE }),
    ).rejects.toThrow("GENERATION_RECORD_NOT_FOUND");
    // The live one survived the sweep.
    await expect(
      loadGenerationRecord({ userId: owner, recordId: fresh.id, profile: DEFAULT_PROFILE }),
    ).resolves.toBeDefined();
  });
});

describe("draft request contract", () => {
  const body = { ...DEFAULT_PROFILE, generationId: "00000000-0000-4000-8000-000000000000" };

  it("accepts a profile naming a generation", () => {
    expect(draftRequestSchema.safeParse(body).success).toBe(true);
  });

  it("rejects a request that supplies prose instead of trusting the record", () => {
    const withProse = {
      ...body,
      authored: { title: "Elle yazıldı", adaptationSummary: "x", stages: [] },
    };
    expect(draftRequestSchema.safeParse(withProse).success).toBe(false);
  });

  it("requires a generation id, and requires it to look like one", () => {
    expect(draftRequestSchema.safeParse(DEFAULT_PROFILE).success).toBe(false);
    expect(draftRequestSchema.safeParse({ ...body, generationId: "abc" }).success).toBe(false);
  });
});
