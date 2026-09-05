import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * Steps 8 and 9 of the target demo: a centre that publishes nothing about its
 * dome must not have the dome treated as absent, and an educator verifying
 * that it really is absent must change the outcome.
 *
 * Bilim Çorum is the case in the corpus — its page names no planetarium — and
 * the space-age topic is the one with a dome route to be uncertain about.
 */
const DOME_TOPIC = "astronomy-aviation-space:12-14:uzay-teknolojileri";

test("an unpublished facility leaves a route uncertain rather than rejected", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  await page.getByTestId("domain-select").selectOption("astronomy-aviation-space");
  await page.getByTestId("cohort-select").selectOption("12-14");
  await page.getByTestId("outcome-select").selectOption(DOME_TOPIC);
  await page.getByTestId("venue-select").selectOption("corum");

  // The centre publishes nothing about the dome, so the profile says unknown.
  await expect(page.getByTestId("capability-planetarium-unknown")).toBeChecked();
  await expect(page.getByTestId("unpublished-note")).toContainText("bilinmiyor");

  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  // Missing information reported as missing information, not as absence.
  await expect(page.locator('[data-code="CAPABILITY_STATUS_UNKNOWN"]')).toBeVisible();
  // Unsettled, not ruled out: the distinction the three-state model exists for.
  await expect(page.getByTestId("candidate-space-age-planetarium")).toHaveAttribute(
    "data-status",
    "uncertain",
  );
});

test("verifying the facility is absent turns uncertainty into a rejection", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  await page.getByTestId("domain-select").selectOption("astronomy-aviation-space");
  await page.getByTestId("cohort-select").selectOption("12-14");
  await page.getByTestId("outcome-select").selectOption(DOME_TOPIC);
  await page.getByTestId("venue-select").selectOption("corum");

  // The educator checks, and records that the centre has no dome.
  await page.getByTestId("capability-planetarium-unavailable").click();
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  // The dome route is now ruled out rather than merely unsettled, and the
  // candidate list says which of the two it is.
  await expect(page.getByTestId("candidate-space-age-planetarium")).toHaveAttribute(
    "data-status",
    "blocked",
  );
  await expect(page.locator('[data-code="CAPABILITY_STATUS_UNKNOWN"]')).toHaveCount(0);
});

test("an unverified curriculum mapping is never shown as verified", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  // Every corpus mapping was transcribed, not checked by a person.
  await expect(page.getByTestId("lock-badge")).toHaveAttribute("data-state", "unverified");
  await expect(page.getByTestId("lock-badge")).toContainText("bekliyor");
});
