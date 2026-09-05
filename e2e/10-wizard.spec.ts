import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { gotoStep } from "./support";

/**
 * The lab as a staged wizard. The steps group by the question a trainer is
 * answering — what am I teaching, where, with what, under what constraints —
 * and deliberately guide rather than gate: every field has a safe default, so
 * generation stays available from any step.
 */
test("each step shows its own questions and only its own", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  await expect(page.getByTestId("step-topic")).toBeVisible();
  await expect(page.getByTestId("step-materials")).toBeHidden();

  await page.getByTestId("step-next").click();
  await expect(page.getByTestId("step-conditions")).toBeVisible();
  await expect(page.getByTestId("step-topic")).toBeHidden();

  await page.getByTestId("step-back").click();
  await expect(page.getByTestId("step-topic")).toBeVisible();
});

test("generation stays available without walking every step", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  // Straight from the first step: the defaults are a real, valid profile.
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
});

test("declared stock below what the session needs is reported, not ignored", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "materials");

  // Thirty learners in six groups need more paper than this.
  await page.getByTestId("stock-paper").fill("3");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await expect(page.locator('[data-code="INSUFFICIENT_STOCK"]')).toBeVisible();
});

test("an empty stock box means uncounted, not zero", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "materials");

  await page.getByTestId("stock-paper").fill("3");
  await page.getByTestId("stock-paper").fill("");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  // Zero would fail every check; uncounted means no quantity claim was made.
  await expect(page.locator('[data-code="INSUFFICIENT_STOCK"]')).toHaveCount(0);
});

test("preparation time and expected evidence are collected before generating", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "delivery");

  await page.getByTestId("prep-select").selectOption("30");
  await page.getByTestId("accessibility-select").selectOption("Sessiz çalışma alanı");
  await page.getByTestId("evidence-input").fill("Katılımcı kendi modelini etiketleyerek anlatır.");

  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await expect(page.locator('[data-code="ACCESSIBILITY_ADAPTATION_APPLIED"]')).toBeVisible();
});
