import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { publishWorkshop, seriousViolations, gotoStep } from "./support";

/**
 * The axe sweep previously stopped at the public pages and the dashboard, which
 * left the screens carrying the actual product — the configuration form, a
 * generated plan, an approved package and the printable pack — unchecked.
 *
 * Widening it immediately surfaced three real serious violations on the plan
 * and package views. They live in files this agent does not own, so each is
 * recorded as a documented `fixme` below rather than silently relaxed.
 */

test("the workshop lab has no serious accessibility violations", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await expect(page.getByRole("heading", { name: "Koşulları tanımla" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results.violations)).toEqual([]);
});

/**
 * KNOWN FAILURE — three serious violations on the generated plan, all fixable
 * outside this spec:
 *
 *  1. `color-contrast` (3 nodes) — the pale stage numbers, e.g.
 *     `<span class="stage-number">01</span>`, do not meet the minimum ratio
 *     against the panel background. Darken the colour in app/globals.css.
 *
 *  2. `definition-list` (1 node) — `<dl class="ledger-costs">` in
 *     components/material-ledger.tsx wraps each figure in a `<div>` that also
 *     holds a `<small>`. A `div` inside a `dl` may contain only `dt`/`dd`, so
 *     move the caption inside the `<dd>` or drop the `dl` for a plain grid.
 *
 *  3. `scrollable-region-focusable` (1 node) — `<div class="ledger-scroll">`
 *     scrolls horizontally but takes no focus, so a keyboard user cannot scroll
 *     the material table at all. Give it `tabIndex={0}` and an accessible name.
 *
 * Re-enable this test once those are addressed.
 */
test("a generated plan has no serious accessibility violations", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results.violations)).toEqual([]);
});

/**
 * KNOWN FAILURE — the saved package page renders the same material ledger and
 * stage cards, so it inherits the same three violations listed above. Fixing
 * them there fixes this too.
 */
test("the package page and print pack have no serious accessibility violations", async ({ page }) => {
  const path = await publishWorkshop(page);

  const packageResults = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(packageResults.violations), "package page").toEqual([]);

  await page.goto(path.replace("/workshops/", "/print/"));
  await expect(page.locator(".print-document")).toBeVisible();
  const printResults = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(printResults.violations), "print pack").toEqual([]);
});

/**
 * Toggle buttons must not tell a sighted user one thing and a screen reader the
 * opposite. The material buttons are the correct reference: they derive
 * aria-pressed and the "selected" class from the same state, so this passes and
 * documents the intended contract.
 */
test("material toggles agree between their visual and announced state", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "materials");

  const paper = page.getByTestId("material-paper");
  const before = await paper.getAttribute("aria-pressed");
  await expect(paper).toHaveClass(before === "true" ? /selected/ : /^((?!selected).)*$/);

  await paper.click();
  const after = await paper.getAttribute("aria-pressed");
  expect(after).not.toBe(before);
  await expect(paper).toHaveClass(after === "true" ? /selected/ : /^((?!selected).)*$/);
});

/**
 * KNOWN FAILURE — left failing deliberately, do not "fix" the test.
 *
 * The electricity and internet cards in components/workshop-lab.tsx set
 * `aria-pressed={profile.hasElectricity}` but apply the "selected" class and the
 * checkmark when that value is `false`. With the default profile (no
 * electricity, no internet) each card is therefore highlighted and ticked while
 * announcing aria-pressed="false": a sighted user reads "this constraint is
 * active", a screen reader user hears the opposite.
 *
 * axe cannot catch it because the markup is structurally valid — the defect is
 * in the meaning, not the shape. Fixing it means picking one direction for the
 * control (either it presses "we have electricity" or it presses "electricity is
 * missing") and making the class, the checkmark and aria-pressed all follow it.
 * Compare the material buttons above, which get this right.
 */
test("power and connectivity toggles agree between visual and announced state", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  for (const testId of ["toggle-electricity", "toggle-internet"]) {
    const toggle = page.getByTestId(testId);
    const pressed = await toggle.getAttribute("aria-pressed");
    const className = (await toggle.getAttribute("class")) ?? "";
    const looksSelected = className.includes("selected");

    expect(
      looksSelected,
      `${testId}: highlighted as selected but announces aria-pressed="${pressed}"`,
    ).toBe(pressed === "true");
  }
});
