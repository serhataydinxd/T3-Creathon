import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";
import { publishWorkshop } from "./support";

/**
 * The delivery half of the product, end to end: a published workshop is run,
 * what actually happened is recorded, a report is drafted from that record,
 * and it goes through review to publication.
 *
 * The assertions that matter are the ones about honesty — planned figures
 * survive the actual ones, an educator cannot approve their own account, and
 * an unobserved learning outcome is not claimed.
 */
test("a published workshop becomes a reviewed, published delivery report", async ({ page }) => {
  const path = await publishWorkshop(page);
  // publishWorkshop leaves the manager signed in.
  await logout(page);

  await login(page, "educator@imkan.test");
  await page.goto(path);
  await page.getByTestId("delivery-centre").selectOption("trabzon");
  await page.getByTestId("start-delivery").click();
  await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]+/);
  const deliveryPath = new URL(page.url()).pathname;

  // Planned figures come from the frozen snapshot and are shown beside actuals.
  const planned = page.getByTestId("planned-vs-actual");
  await expect(planned).toContainText("Planlanan");
  await expect(planned).toContainText("Gerçekleşen");

  await page.getByTestId("delivered-on").fill("2026-09-05");
  await page.getByTestId("input-participants").fill("21");
  await page.getByTestId("input-minutes").fill("55");
  await page.getByTestId("input-worked").fill("Gruplar modeli beklenenden hızlı kurdu.");
  await page.getByTestId("stage-outcome-evaluate").selectOption("skipped");
  await page.getByTestId("stage-note-evaluate").fill("Süre yetmedi.");
  await page.getByTestId("save-observations").click();

  await expect(page.getByTestId("actual-participants")).toContainText("21");
  await expect(page.getByTestId("actual-minutes")).toContainText("55");
  // The plan said 30; recording 21 must not have rewritten it.
  await expect(page.getByTestId("planned-vs-actual")).toContainText("30");

  await page.getByTestId("draft-report").click();
  await expect(page.getByTestId("section-summary")).toBeVisible();
  // A stage that was skipped must not be narrated as delivered.
  await expect(page.getByTestId("section-delivery")).toContainText("Süre yetmedi");
  // No observed evidence was entered, so learning must not be asserted.
  await expect(page.getByTestId("section-learning")).toContainText("kaydedilmedi");

  await page.getByTestId("submit-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "submitted");
  // The educator who ran it cannot sign it off.
  await expect(page.getByTestId("approve-report")).toHaveCount(0);
  await expect(page.getByTestId("self-review-note")).toBeVisible();
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
});

test("only a published workshop can be delivered", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  // A draft has not been through pedagogical review, so there is nothing to
  // start a delivery from.
  await expect(page.getByTestId("start-delivery")).toHaveCount(0);
});
