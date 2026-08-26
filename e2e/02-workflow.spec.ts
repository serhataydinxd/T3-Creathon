import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test("content expert to pedagogue to manager to educator completes across real sessions", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.getByRole("link", { name: "Yeni atölye tasarla" }).click();
  await expect(page.getByRole("heading", { name: "Koşulları tanımla" })).toBeVisible();
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await expect(page.getByTestId("finding").filter({ hasText: "APPROVED SUBSTITUTION APPLIED" })).toBeVisible();
  await expect(page.getByTestId("stage-detail-engage")).toBeVisible();
  await expect(page.getByTestId("material-ledger")).toBeVisible();
  // Six groups of the paper route need 24 sheets in total.
  await expect(page.getByTestId("material-line-paper")).toContainText("24");
  // A per-learner line scales to the whole class, and the offline route needs no purchase.
  await expect(page.getByTestId("material-line-pencil")).toContainText("30");
  await expect(page.getByTestId("material-ledger").locator(".supply-tag.buy")).toHaveCount(0);
  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  const workshopUrl = new URL(page.url()).pathname;
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "draft");
  await page.getByTestId("submit-for-review").click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "submitted");

  await logout(page);
  await login(page, "pedagogue@imkan.test");
  await page.goto(workshopUrl);
  await page.getByLabel("İnceleme notu").fill("Kazanım bağlantıları, süre ve öğrenme kanıtları uygundur.");
  await page.getByRole("button", { name: "Pedagojik olarak onayla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "approved");

  await logout(page);
  await login(page, "manager@imkan.test");
  await page.goto(workshopUrl);
  await page.getByRole("button", { name: "Paketi yayımla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "published");

  await logout(page);
  await login(page, "educator@imkan.test");
  await page.goto(workshopUrl);
  await expect(page.locator(".package-stages > article")).toHaveCount(5);
  await page.getByLabel("Sınıf geri bildirimi").fill("Kâğıt tabanlı model sınıfta uygulanabilir ve anlaşılırdı.");
  await page.getByRole("button", { name: "Geri bildirimi kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("başarıyla");
  await expect(page.getByTestId("feedback-average")).toHaveText("5");

  const printLink = page.getByRole("link", { name: "Yazdırma paketini aç" });
  await expect(printLink).toBeVisible();
  await page.goto(`${workshopUrl.replace("/workshops/", "/print/")}`);
  await expect(page.locator("article")).toHaveCount(5);
  await expect(page.getByText(/İ ı Ğ ğ Ş ş Ç ç Ö ö Ü ü/)).toBeVisible();
  await expect(page.locator(".print-materials")).toContainText("Malzeme listesi");
  expect((await page.pdf()).byteLength).toBeGreaterThan(10_000);

  // The loop closes only if the classroom note reaches the manager by name.
  await page.goto(workshopUrl);
  await logout(page);
  await login(page, "manager@imkan.test");
  await page.goto(workshopUrl);
  const summary = page.getByTestId("feedback-summary");
  await expect(summary).toContainText("Mert Kaya");
  await expect(summary).toContainText("Kâğıt tabanlı model");
  await expect(summary.locator(".rating-bars > div")).toHaveCount(5);

  // The reuse rollup is the manager's entry point back into a used package.
  await page.goto("/dashboard");
  const rollup = page.getByTestId("feedback-rollup");
  await expect(rollup).toContainText("Elektrik Devreleri");
  await expect(rollup).toContainText("5 / 5");
});

test("change request creates a new immutable version and supersedes the old one", async ({ page }) => {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  const originalUrl = new URL(page.url()).pathname;
  await page.getByTestId("submit-for-review").click();
  await logout(page);

  await login(page, "pedagogue@imkan.test");
  await page.goto(originalUrl);
  await page.getByLabel("İnceleme notu").fill("Değerlendirme kanıtını daha açık ve ölçülebilir hâle getirin.");
  await page.getByRole("button", { name: "Değişiklik iste" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "changes_requested");
  await logout(page);

  await login(page, "content@imkan.test");
  await page.goto(originalUrl);
  await page.getByRole("button", { name: "Yeni sürüm oluştur" }).click();
  await page.waitForURL((url) => url.pathname !== originalUrl);
  const revisionUrl = new URL(page.url()).pathname;
  expect(revisionUrl).not.toBe(originalUrl);
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "draft");
  await page.goto(originalUrl);
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "superseded");
});

test("authenticated dashboard has no serious accessibility violations", async ({ page }) => {
  await login(page, "content@imkan.test");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
