import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * The content-development half of the product: a trainer picks a topic Bilim
 * Türkiye publishes but İMKÂN has never authored, and the assistant drafts a
 * session for it that enters the ordinary review workflow.
 *
 * What this guards is the honesty of that path. A proposal has to be plannable
 * and savable, and it has to be labelled as a proposal on every surface that
 * would otherwise present it as approved content.
 */
const PROPOSAL_TOPIC = "technology:12-14:yapay-zeka";

test("a published catalogue topic with no authored content can be drafted and saved", async ({
  page,
}) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  await page.getByTestId("domain-select").selectOption("technology");
  await page.getByTestId("cohort-select").selectOption("12-14");
  await page.getByTestId("outcome-select").selectOption(PROPOSAL_TOPIC);

  // Before generating, the lab must already say this is not approved content.
  await expect(page.getByTestId("proposal-notice")).toBeVisible();
  await expect(page.getByTestId("curriculum-mapping")).toHaveCount(0);

  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();

  await expect(page.locator('[data-code="UNAUTHORED_TOPIC_PROPOSAL"]')).toBeVisible();
  await expect(page.getByTestId("plan-root")).toContainText("TASLAK ÖNERİ");
  // The published topic name is the lock; the model may not rename it.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yapay Zeka");

  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  // And it stays labelled once persisted, where a reviewer will meet it.
  await expect(page.getByText("Taslak öneri", { exact: true })).toBeVisible();
  await expect(page.getByTestId("submit-for-review")).toBeVisible();
});

test("the topic picker shows the published catalogue, not just what we authored", async ({
  page,
}) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");

  // Tasarım is a theme İMKÂN has authored nothing for; its topics must still be
  // listed, because the catalogue is the programme and the corpus is not.
  await page.getByTestId("domain-select").selectOption("design");
  await page.getByTestId("cohort-select").selectOption("9-11");
  const options = page.getByTestId("outcome-select").locator("option");
  await expect(options.filter({ hasText: "Makrome" })).toHaveCount(1);
  await expect(page.getByTestId("catalogue-coverage")).toContainText("9 yayımlanmış konu");
});
