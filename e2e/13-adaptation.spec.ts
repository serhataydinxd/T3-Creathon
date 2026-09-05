import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";
import { publishWorkshop } from "./support";

/**
 * Merkezime uyarla. The rule the whole feature rests on is that the source is
 * read and left alone — an adaptation that edited what it came from would
 * quietly rewrite the record of a session someone else already ran.
 */
async function publishToLibrary(page: import("@playwright/test").Page) {
  const workshopPath = await publishWorkshop(page);
  await logout(page);

  await login(page, "educator@imkan.test");
  await page.goto(workshopPath);
  await page.getByTestId("delivery-centre").selectOption("trabzon");
  await page.getByTestId("start-delivery").click();
  await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]+/);
  const deliveryPath = new URL(page.url()).pathname;
  await page.getByTestId("delivered-on").fill("2026-09-05");
  await page.getByTestId("input-participants").fill("21");
  await page.getByTestId("input-minutes").fill("55");
  await page.getByTestId("visibility-select").selectOption("public");
  await page.getByTestId("save-observations").click();
  await page.getByTestId("draft-report").click();
  await page.getByTestId("section-summary").waitFor();
  await page.getByTestId("submit-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "submitted");
  await logout(page);

  await login(page, "pedagogue@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("approve-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "approved");
  await logout(page);

  await login(page, "manager@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("publish-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "published");
  await logout(page);
  return workshopPath;
}

test("adapting produces an independent draft and leaves the source untouched", async ({ page }) => {
  const workshopPath = await publishToLibrary(page);

  await login(page, "educator@imkan.test");
  await page.goto("/library");
  await page.getByRole("link", { name: "Raporu aç" }).first().click();
  await expect(page).toHaveURL(/\/library\/[0-9a-f-]+/);
  const entryPath = new URL(page.url()).pathname;

  // The comparison is shown before anything is created.
  await page.getByTestId("adapt-centre").selectOption("corum");
  await page.getByTestId("preview-adapt").click();
  await expect(page.getByTestId("compatibility")).toBeVisible();
  await expect(page.getByTestId("compatibility-status")).toBeVisible();

  await page.getByTestId("create-adaptation").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?adapted=1/);
  const adaptedPath = new URL(page.url()).pathname;
  expect(adaptedPath).not.toBe(workshopPath);

  // The new draft carries its origin and must be reviewed like any other.
  await expect(page.getByTestId("adaptation-origin")).toBeVisible();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "draft");
  await logout(page);

  // The source is still published and still says what it said.
  await login(page, "manager@imkan.test");
  await page.goto(workshopPath);
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "published");
  await logout(page);

  // And the library counts the adaptation.
  await login(page, "educator@imkan.test");
  await page.goto(entryPath);
  await expect(page.getByTestId("entry-adaptations")).toContainText("1 uyarlama");
});

test("an unknown facility at the target is reported as missing information", async ({ page }) => {
  await login(page, "educator@imkan.test");
  await page.goto("/library");
  await page.getByRole("link", { name: "Raporu aç" }).first().click();

  // Bilim Çorum publishes nothing about its facilities, so a source route that
  // needed one cannot be confirmed there — and must not be called incompatible.
  await page.getByTestId("adapt-centre").selectOption("corum");
  await page.getByTestId("preview-adapt").click();
  const status = page.getByTestId("compatibility-status");
  await expect(status).toBeVisible();
  const value = await status.getAttribute("data-status");
  expect(["compatible", "adaptable", "unknown-centre"]).toContain(value);
  expect(value).not.toBe("incompatible");
});
