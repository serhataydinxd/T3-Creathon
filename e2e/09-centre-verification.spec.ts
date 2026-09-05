import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";
import { gotoStep } from "./support";

/**
 * Step 9 of the target demo, and the reason the operational record exists: an
 * educator who checks a centre in person changes what the lab offers, and the
 * finding survives the browser session that made it.
 */
test("an educator's verification persists and reaches the lab", async ({ page }) => {
  await login(page, "educator@imkan.test");
  await page.goto("/centres");

  // Bilim Çorum publishes nothing about a dome, so the record says unknown.
  // Targeted by facility rather than by position: the row order is the
  // registry's, but naming it keeps the test readable when that list grows.
  const row = page
    .locator('[data-testid="centre-corum"] li')
    .filter({ hasText: "Planetaryum" });
  await expect(row).toHaveAttribute("data-status", "unknown");
  await expect(row).toContainText("Kaynakta bilgi yok");

  await page.getByTestId("status-corum-planetarium").selectOption("unavailable");
  await page.getByTestId("verify-corum-planetarium").click();

  // Recorded against the person who checked, not the page.
  await expect(row).toHaveAttribute("data-status", "unavailable");
  await expect(row).toContainText("Kişi tarafından doğrulandı");

  // Survives a reload, because it is in the database and not in the form.
  await page.reload();
  await expect(
    page.locator('[data-testid="centre-corum"] li').filter({ hasText: "Planetaryum" }),
  ).toHaveAttribute("data-status", "unavailable");
  await logout(page);

  // And the lab now treats the dome as verified absent rather than unknown.
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await gotoStep(page, "conditions");
  await page.getByTestId("venue-select").selectOption("corum");
  await expect(page.getByTestId("capability-planetarium-unavailable")).toBeChecked();
});

test("a content expert cannot assert what a centre has", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/centres");
  // The record is readable by everyone; changing it is not offered.
  await expect(page.getByTestId("centre-list")).toBeVisible();
  await expect(page.getByTestId("verify-corum-planetarium")).toHaveCount(0);
  await expect(page.getByText("yalnızca eğitmen ve yöneticiler")).toBeVisible();
});

test("the record can be narrowed to what still needs checking", async ({ page }) => {
  await login(page, "educator@imkan.test");
  await page.goto("/centres");
  await expect(page.getByTestId("centre-count")).toContainText("30 / 30");

  await page.getByTestId("centre-search").fill("gaziantep");
  // Three centres are in Gaziantep province; the search reads city as well as name.
  await expect(page.getByTestId("centre-corum")).toHaveCount(0);
  await expect(page.getByTestId("centre-gaziantep")).toBeVisible();

  // Turkish casing: "İstanbul" must match a lowercase query.
  await page.getByTestId("centre-search").fill("istanbul");
  await expect(page.getByTestId("centre-arnavutkoy")).toBeVisible();

  await page.getByTestId("centre-search").fill("");
  await page.getByTestId("filter-unknown").click();
  // Five centres publish all three facilities, so they have nothing left to
  // check and drop out of the queue. The rest are the actual work.
  await expect(page.getByTestId("centre-count")).toContainText("25 / 30");
  await expect(page.getByTestId("centre-trabzon")).toHaveCount(0);
  await expect(page.getByTestId("centre-corum")).toBeVisible();

  await page.getByTestId("centre-search").fill("bulunmayan merkez");
  await expect(page.getByTestId("centre-empty")).toBeVisible();
});
