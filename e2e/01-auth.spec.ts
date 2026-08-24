import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, login, logout } from "./helpers";

test("public registration stays pending until a manager assigns a role", async ({ page }) => {
  const email = `egitimci-${randomUUID()}@imkan.test`;
  await page.goto("/register");
  await page.getByLabel("Ad soyad").fill("Yeni Eğitimci");
  await page.getByLabel("E-posta adresi").fill(email);
  await page.getByLabel("Şifre").fill("GuvenliDemo!2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL(/\/login\?registered=pending/);
  await expect(page.getByRole("status")).toContainText("yönetici");

  await page.getByLabel("E-posta adresi").fill(email);
  await page.getByLabel("Şifre").fill("GuvenliDemo!2026");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.locator(".auth-error")).toContainText("henüz yönetici");

  await login(page, "manager@imkan.test");
  const pendingForm = page.locator(".pending-users form").filter({ hasText: email });
  await pendingForm.getByLabel("Atanacak rol").selectOption("educator");
  await pendingForm.getByRole("button", { name: "Etkinleştir" }).click();
  await expect(page.getByRole("status")).toContainText("etkinleştirildi");
  await logout(page);
  await login(page, email, "GuvenliDemo!2026");
  await expect(page.getByRole("heading", { name: /Merhaba/ })).toBeVisible();
});

test("duplicate registration and invalid password are rejected without leaking a session", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Ad soyad").fill("Mert Kaya");
  await page.getByLabel("E-posta adresi").fill("educator@imkan.test");
  await page.getByLabel("Şifre").fill("I.mkanDemo!2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.locator(".auth-error")).toContainText("zaten bir hesap");

  await page.goto("/login");
  await page.getByLabel("E-posta adresi").fill("educator@imkan.test");
  await page.getByLabel("Şifre").fill("yanlis-sifre");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.locator(".auth-error")).toContainText("E-posta veya şifre hatalı");
  await expect(page).toHaveURL(/\/login/);
});

test("sign-out revokes the server session", async ({ page, context }) => {
  await login(page, "educator@imkan.test", DEMO_PASSWORD);
  const oldSession = (await context.cookies()).find((cookie) => cookie.name === "imkan_session");
  expect(oldSession?.httpOnly).toBe(true);
  expect(oldSession?.sameSite).toBe("Lax");
  expect(oldSession?.secure).toBe(true);
  await logout(page);
  if (oldSession) await context.addCookies([oldSession]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("public authentication pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/login", "/register"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  }
});
