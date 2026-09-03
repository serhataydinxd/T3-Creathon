import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const profile = {
  durationMinutes: 40,
  classSize: 30,
  groupSize: 5,
  budgetTry: 50,
  hardBudget: true,
  hasInternet: false,
  hasElectricity: false,
  materials: ["paper", "pencil", "scissors", "tape"],
  accessibilityNeeds: [],
};


test("anonymous and forbidden generation calls are rejected", async ({ request, page }) => {
  const anonymous = await request.post("/api/demo/generate", { data: profile, headers: { Origin: "http://127.0.0.1:3000" } });
  expect(anonymous.status()).toBe(401);
  await login(page, "educator@imkan.test");
  const forbidden = await page.evaluate(async (body) => fetch("/api/demo/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((response) => response.status), profile);
  expect(forbidden).toBe(403);
});

test("idempotency returns one draft and rejects key reuse with another body", async ({ page }) => {
  await login(page, "content@imkan.test");
  const key = crypto.randomUUID();
  const result = await page.evaluate(async ({ body, idempotencyKey }) => {
    const generateThenSaveInline = async (payload: unknown) => {
      const generated = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => response.json());
      return generated.generationId as string;
    };
    const save = (payload: unknown) =>
      fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      }).then(async (response) => ({ status: response.status, body: await response.json() }));

    const generationId = await generateThenSaveInline(body);
    const request = { ...(body as object), generationId };
    const same = await Promise.all([save(request), save(request)]);

    // Different conditions need their own generation; reusing the first key
    // with it must still be refused.
    const otherBody = { ...(body as object), durationMinutes: 60 };
    const otherId = await generateThenSaveInline(otherBody);
    const changed = await save({ ...otherBody, generationId: otherId });
    return { same, changed };
  }, { body: profile, idempotencyKey: key });
  expect(result.same[0].status).toBe(201);
  expect(result.same[1].status).toBe(201);
  expect(result.same[0].body.id).toBe(result.same[1].body.id);
  expect(result.changed.status).toBe(409);
});

test("a draft cannot be saved with client-supplied prose or a foreign generation", async ({ page }) => {
  await login(page, "content@imkan.test");
  const ownGeneration = await page.evaluate(async (body) => {
    const issue = async (payload: unknown) => {
      const generated = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => response.json());
      return generated.generationId as string;
    };
    return issue(body);
  }, profile);
  expect(ownGeneration).toBeTruthy();

  const outcomes = await page.evaluate(async ({ body, generationId }) => {
    const post = (payload: unknown) =>
      fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      }).then((response) => response.status);
    return {
      // Prose is no longer part of the contract at all.
      withProse: await post({
        ...(body as object),
        generationId,
        authored: { title: "Elle yazıldı", adaptationSummary: "x", stages: [] },
      }),
      // A record exists, but it was generated for other conditions.
      changedConditions: await post({ ...(body as object), budgetTry: 500, generationId }),
      // No such record.
      unknownRecord: await post({
        ...(body as object),
        generationId: "00000000-0000-4000-8000-000000000000",
      }),
      missingRecord: await post(body),
    };
  }, { body: profile, generationId: ownGeneration });

  expect(outcomes.withProse).toBe(400);
  expect(outcomes.changedConditions).toBe(409);
  expect(outcomes.unknownRecord).toBe(409);
  expect(outcomes.missingRecord).toBe(400);
});

test("a generation issued to one expert cannot be saved by another", async ({ page }) => {
  await login(page, "content@imkan.test");
  const stolen = await page.evaluate(async (body) => {
    const issue = async (payload: unknown) => {
      const generated = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => response.json());
      return generated.generationId as string;
    };
    return issue(body);
  }, profile);

  await page.getByRole("button", { name: "Çıkış" }).click();
  await login(page, "pedagogue@imkan.test");
  const status = await page.evaluate(async ({ body, generationId }) =>
    fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ ...(body as object), generationId }),
    }).then((response) => response.status),
  { body: profile, generationId: stolen });
  // Indistinguishable from an unknown record, so ownership cannot be probed.
  expect(status).toBe(409);
});

test("cross-origin, malformed, oversized, and security-header checks hold", async ({ page, context }) => {
  await login(page, "content@imkan.test");
  const results = await page.evaluate(async (body) => {
    const malformed = await fetch("/api/workshops", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{" });
    const oversized = await fetch("/api/workshops", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ ...body, padding: "x".repeat(20_000) }) });
    return { malformed: malformed.status, oversized: oversized.status };
  }, profile);
  expect(results.malformed).toBe(400);
  expect(results.oversized).toBe(413);

  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === "imkan_session");
  const crossOrigin = await page.request.post("/api/workshops", { data: profile, headers: { Origin: "https://attacker.example", Cookie: `imkan_session=${sessionCookie?.value ?? ""}`, "Idempotency-Key": crypto.randomUUID() } });
  expect(crossOrigin.status()).toBe(403);
  const response = await page.request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("educator cannot open another user's draft by direct URL", async ({ page }) => {
  await login(page, "content@imkan.test");
  const draftId = await page.evaluate(async (body) => {
    const issue = async (payload: unknown) => {
      const generated = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => response.json());
      return generated.generationId as string;
    };
    const generationId = await issue(body);
    const created = await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ ...(body as object), generationId }),
    }).then((response) => response.json());
    return created.id as string;
  }, profile);
  await page.getByRole("button", { name: "Çıkış" }).click();
  await login(page, "educator@imkan.test");
  const response = await page.goto(`/workshops/${draftId}`);
  expect(response?.status()).toBe(404);
});
