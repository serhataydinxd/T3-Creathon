import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";
import { gotoStep } from "./support";

/**
 * The demo script in docs/06, rehearsed.
 *
 * Its purpose is not coverage — the individual behaviours are tested
 * elsewhere — but to prove the nine steps hold together in the order someone
 * will actually perform them, in front of people, once.
 *
 * Runs on authored content throughout, as the script requires: leading with an
 * unauthored catalogue topic would show a draft proposal where a jury expects
 * approved content.
 */
const DOME_TOPIC = "astronomy-aviation-space:12-14:uzay-teknolojileri";

test("the nine-step demo holds together end to end", async ({ page }) => {
  test.slow();

  // 0 · The script depends on Bilim Çorum's dome being unrecorded, and an
  // earlier test in the suite may have verified it. Withdrawing a verification
  // is a real action an educator can take, so the rehearsal establishes its
  // own starting state rather than depending on the order tests happen to run.
  await login(page, "educator@imkan.test");
  await page.goto("/centres");
  await page.getByTestId("status-corum-planetarium").selectOption("unknown");
  await page.getByTestId("verify-corum-planetarium").click();
  await expect(
    page.locator('[data-testid="centre-corum"] li').filter({ hasText: "Planetaryum" }),
  ).toHaveAttribute("data-status", "unknown");
  await logout(page);

  // 1 · Konu — an authored topic, with an honest badge about its mapping.
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("domain-select").selectOption("astronomy-aviation-space");
  await page.getByTestId("cohort-select").selectOption("12-14");
  await page.getByTestId("outcome-select").selectOption(DOME_TOPIC);
  await expect(page.getByTestId("proposal-notice")).toHaveCount(0);

  // 2 · Mekân — Trabzon publishes a dome, so the route is deliverable.
  await gotoStep(page, "conditions");
  await page.getByTestId("venue-select").selectOption("trabzon");
  await expect(page.getByTestId("capability-planetarium-available")).toBeChecked();
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await expect(page.getByTestId("candidate-space-age-planetarium")).toHaveAttribute(
    "data-status",
    "ready",
  );
  await expect(page.getByTestId("lock-badge")).toHaveAttribute("data-state", "unverified");

  // 3 · Aynı konu, başka merkez — Çorum publishes nothing, so it is uncertain.
  await page.getByRole("button", { name: "Koşulları düzenle" }).click();
  await gotoStep(page, "conditions");
  await page.getByTestId("venue-select").selectOption("corum");
  await expect(page.getByTestId("capability-planetarium-unknown")).toBeChecked();
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("candidate-space-age-planetarium")).toHaveAttribute(
    "data-status",
    "uncertain",
  );
  await logout(page);

  // 4 · Doğrulama — an educator checks, and the verdict changes.
  await login(page, "educator@imkan.test");
  await page.goto("/centres");
  await page.getByTestId("status-corum-planetarium").selectOption("unavailable");
  await page.getByTestId("verify-corum-planetarium").click();
  await expect(
    page.locator('[data-testid="centre-corum"] li').filter({ hasText: "Planetaryum" }),
  ).toHaveAttribute("data-status", "unavailable");
  await logout(page);

  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("domain-select").selectOption("astronomy-aviation-space");
  await page.getByTestId("cohort-select").selectOption("12-14");
  await page.getByTestId("outcome-select").selectOption(DOME_TOPIC);
  await gotoStep(page, "conditions");
  await page.getByTestId("venue-select").selectOption("corum");
  await expect(page.getByTestId("capability-planetarium-unavailable")).toBeChecked();
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("candidate-space-age-planetarium")).toHaveAttribute(
    "data-status",
    "blocked",
  );

  // 5 · Üret ve yayımla.
  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  const workshopPath = new URL(page.url()).pathname;
  await page.getByTestId("submit-for-review").click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "submitted");
  await logout(page);

  await login(page, "pedagogue@imkan.test");
  await page.goto(workshopPath);
  await page.getByRole("button", { name: "Pedagojik olarak onayla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "approved");
  await logout(page);

  await login(page, "manager@imkan.test");
  await page.goto(workshopPath);
  await page.getByRole("button", { name: "Paketi yayımla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "published");
  await logout(page);

  // 6 · Uygula — 21 present against 24 planned, one stage skipped.
  await login(page, "educator@imkan.test");
  await page.goto(workshopPath);
  await page.getByTestId("delivery-centre").selectOption("corum");
  await page.getByTestId("start-delivery").click();
  await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]+/);
  const deliveryPath = new URL(page.url()).pathname;
  await page.getByTestId("delivered-on").fill("2026-09-05");
  await page.getByTestId("input-participants").fill("21");
  await page.getByTestId("input-minutes").fill("55");
  await page.getByTestId("stage-outcome-evaluate").selectOption("skipped");
  await page.getByTestId("stage-note-evaluate").fill("Süre yetmedi.");
  await page.getByTestId("input-safety").fill("Makas kullanımı yakın gözetimle yapıldı.");
  await page.getByTestId("visibility-select").selectOption("public");
  await page.getByTestId("save-observations").click();
  await expect(page.getByTestId("actual-participants")).toContainText("21");
  await expect(page.getByTestId("planned-vs-actual")).toContainText("30");

  // 7 · Raporla — both figures, the skipped stage, no unearned learning claim.
  await page.getByTestId("draft-report").click();
  await expect(page.getByTestId("section-summary")).toContainText("21");
  await expect(page.getByTestId("section-delivery")).toContainText("Süre yetmedi");
  await expect(page.getByTestId("section-learning")).toContainText("kaydedilmedi");
  await page.getByTestId("submit-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "submitted");
  await expect(page.getByTestId("approve-report")).toHaveCount(0);

  // The printable report is the centre's own document and keeps the safety note.
  await page.goto(`${deliveryPath}/print`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toContainText("yakın gözetimle");
  await expect(page.locator("body")).toContainText("Planlanan");
  // The sheet has no app chrome, so the way out is its own back link.
  await page.getByRole("link", { name: "← Rapora dön" }).click();
  await expect(page).toHaveURL(new RegExp(`${deliveryPath}$`));
  await logout(page);

  // 8 · Onayla ve paylaş.
  await login(page, "pedagogue@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("approve-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "approved");
  await logout(page);

  await login(page, "manager@imkan.test");
  await page.goto(deliveryPath);
  await page.getByTestId("publish-report").click();
  await expect(page.getByTestId("report-status")).toHaveAttribute("data-status", "published");

  await page.goto("/library?q=Uzay");
  await expect(page.getByTestId("library-grid")).toBeVisible();
  // The safety note stays with the centre.
  await expect(page.locator("body")).not.toContainText("yakın gözetimle");
  await logout(page);

  // 9 · Uyarla — an independent draft; the source stays published.
  await login(page, "educator@imkan.test");
  await page.goto("/library?q=Uzay");
  await page.getByRole("link", { name: "Raporu aç" }).first().click();
  await expect(page).toHaveURL(/\/library\/[0-9a-f-]+/);
  await expect(page.locator("body")).not.toContainText("yakın gözetimle");
  await page.getByTestId("adapt-centre").selectOption("trabzon");
  await page.getByTestId("preview-adapt").click();
  await expect(page.getByTestId("compatibility")).toBeVisible();
  await page.getByTestId("create-adaptation").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?adapted=1/);
  await expect(page.getByTestId("adaptation-origin")).toBeVisible();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "draft");
  expect(new URL(page.url()).pathname).not.toBe(workshopPath);
  await logout(page);

  await login(page, "manager@imkan.test");
  await page.goto(workshopPath);
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "published");
});
