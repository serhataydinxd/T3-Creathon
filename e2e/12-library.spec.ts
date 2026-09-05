import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";
import { publishWorkshop } from "./support";

/**
 * The Etkinlik Kütüphanesi. Four conditions gate entry — published source,
 * approved report, the educator's permission to share, and a public row
 * stripped of anything personal — and the ones worth testing are the two that
 * are easy to get wrong: permission, and what the public row carries.
 */
async function deliverAndApprove(
  page: import("@playwright/test").Page,
  options: { visibility: "private" | "public"; safety?: string },
): Promise<string> {
  const path = await publishWorkshop(page);
  await logout(page);

  await login(page, "educator@imkan.test");
  await page.goto(path);
  await page.getByTestId("start-delivery").click();
  // The action redirects; reading the URL before it lands captures the
  // workshop page instead of the delivery.
  await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]+/);
  const deliveryPath = new URL(page.url()).pathname;
  await page.getByTestId("delivered-on").fill("2026-09-05");
  await page.getByTestId("input-participants").fill("21");
  await page.getByTestId("input-minutes").fill("55");
  if (options.safety) await page.getByTestId("input-safety").fill(options.safety);
  await page.getByTestId("visibility-select").selectOption(options.visibility);
  await page.getByTestId("save-observations").click();
  await page.getByTestId("draft-report").click();
  await page.getByTestId("section-summary").waitFor();
  await page.getByTestId("submit-report").click();
  // Wait for the transition to land before dropping the session, or the
  // reviewer arrives at a report still in draft.
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "submitted");
  await logout(page);

  await login(page, "pedagogue@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("approve-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "approved");
  await logout(page);
  return deliveryPath;
}

test("a shared, approved report reaches the library without its sensitive notes", async ({ page }) => {
  const deliveryPath = await deliverAndApprove(page, {
    visibility: "public",
    safety: "Bir katılımcı makasla parmağını kesti.",
  });

  await login(page, "manager@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("publish-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "published");

  await page.goto("/library");
  await expect(page.getByTestId("library-grid")).toBeVisible();

  // The safety note is operational information for the centre that ran the
  // session. It must not travel to a public listing.
  await expect(page.locator("body")).not.toContainText("parmağını kesti");
  await page.getByRole("link", { name: "Raporu aç" }).first().click();
  await expect(page.getByTestId("entry-report")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("parmağını kesti");
});

test("a report the educator kept private cannot be published to the library", async ({ page }) => {
  const deliveryPath = await deliverAndApprove(page, { visibility: "private" });

  await login(page, "manager@imkan.test");
  await page.goto(deliveryPath);

  // Sharing is the educator's decision and approval does not override it, so
  // the manager is told why rather than offered a button that will fail.
  await expect(page.getByTestId("sharing-blocked")).toBeVisible();
  await expect(page.getByTestId("publish-report")).toHaveCount(0);
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "approved");
});

test("filters narrow the listing in the database and survive as a link", async ({ page }) => {
  await login(page, "educator@imkan.test");
  // Nothing in the corpus is a Tarım Teknolojileri delivery, so the filter has
  // to actually exclude rather than merely reorder.
  await page.goto("/library?domain=agricultural-technologies");
  await expect(page.getByTestId("library-empty")).toBeVisible();

  await page.goto("/library");
  await page.getByTestId("filter-cost").fill("1");
  await page.getByTestId("apply-filters").click();
  // The filter is in the query string, so the result set is shareable.
  await expect(page).toHaveURL(/maxCost=1/);
});
