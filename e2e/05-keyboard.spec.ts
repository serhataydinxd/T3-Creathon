import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { focusIsVisible, gotoStep, tabUntil } from "./support";

/**
 * A teacher must be able to configure and generate a workshop without a mouse.
 * These tests drive the lab entirely from the keyboard and assert behaviour and
 * announced state rather than control counts, so they survive the form gaining
 * venue capabilities and a domain or cohort display.
 */

test("the outcome selector is reachable and changeable by keyboard", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  const select = page.getByTestId("outcome-select");
  const optionValues = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLOptionElement).value),
  );
  test.skip(optionValues.length < 2, "needs at least two outcomes to change selection");

  const reached = await tabUntil(page, (info) => info.testId === "outcome-select");
  expect(reached, "outcome selector was not reachable by tabbing").toBe(true);
  expect(await focusIsVisible(page), "focused selector draws no visible ring").toBe(true);

  const before = await select.inputValue();
  const next = optionValues.find((value) => value !== before)!;
  // Keyboard users change a native select with the arrow keys; selectOption
  // would bypass exactly the path under test.
  await select.press("ArrowDown");
  const after = await select.inputValue();
  expect(after).not.toBe(before);
  expect(optionValues).toContain(after);
  expect(next).toBeTruthy();
});

test("an inventory preset can be applied from the keyboard", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "materials");

  const presets = page.locator('[data-testid^="preset-"]');
  await expect(presets.first()).toBeVisible();

  // Find a preset that is not already applied, so activating it must change state.
  const count = await presets.count();
  let target = -1;
  for (let index = 0; index < count; index += 1) {
    if ((await presets.nth(index).getAttribute("aria-pressed")) !== "true") {
      target = index;
      break;
    }
  }
  test.skip(target === -1, "every preset already matches the current inventory");

  const preset = presets.nth(target);
  const testId = await preset.getAttribute("data-testid");
  const reached = await tabUntil(page, (info) => info.testId === testId);
  expect(reached, `${testId} was not reachable by tabbing`).toBe(true);
  expect(await focusIsVisible(page)).toBe(true);

  await page.keyboard.press("Enter");
  await expect(preset).toHaveAttribute("aria-pressed", "true");
});

test("a material toggles with the keyboard and announces its new state", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "materials");

  const material = page.getByTestId("material-paper");
  const before = await material.getAttribute("aria-pressed");

  const reached = await tabUntil(page, (info) => info.testId === "material-paper");
  expect(reached, "material button was not reachable by tabbing").toBe(true);
  expect(await focusIsVisible(page)).toBe(true);

  await page.keyboard.press("Space");
  await expect(material).not.toHaveAttribute("aria-pressed", before ?? "");

  // Space must toggle rather than latch, so a second press restores the state.
  await page.keyboard.press("Space");
  await expect(material).toHaveAttribute("aria-pressed", before ?? "");
});

test("a workshop can be generated without using the mouse", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  const reached = await tabUntil(page, (info) => info.testId === "generate-submit");
  expect(reached, "generate button was not reachable by tabbing").toBe(true);
  expect(await focusIsVisible(page)).toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("plan-root")).toBeVisible();
});

test("the plan view keeps its stage tabs keyboard operable", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  // Exactly one tab is selected at a time, whichever stage the corpus produced.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);

  // locator.press dispatches a real key event to the focused control. Note that
  // :focus-visible is deliberately not asserted here: Chromium does not apply it
  // after programmatic focus, so checking it would test the harness, not the app.
  const lastTab = tabs.last();
  await lastTab.press("Enter");
  await expect(lastTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
});
