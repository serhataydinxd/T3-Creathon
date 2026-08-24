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
    const call = (payload: unknown) => fetch("/api/workshops", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) }).then(async (response) => ({ status: response.status, body: await response.json() }));
    const same = await Promise.all([call(body), call(body)]);
    const changed = await call({ ...body, durationMinutes: 60 });
    return { same, changed };
  }, { body: profile, idempotencyKey: key });
  expect(result.same[0].status).toBe(201);
  expect(result.same[1].status).toBe(201);
  expect(result.same[0].body.id).toBe(result.same[1].body.id);
  expect(result.changed.status).toBe(409);
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
    const response = await fetch("/api/workshops", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) });
    return (await response.json()).id as string;
  }, profile);
  await page.getByRole("button", { name: "Çıkış" }).click();
  await login(page, "educator@imkan.test");
  const response = await page.goto(`/workshops/${draftId}`);
  expect(response?.status()).toBe(404);
});
