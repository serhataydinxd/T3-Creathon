import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "I.mkanDemo!2026";

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("E-posta adresi").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Çıkış" }).click();
  await expect(page).toHaveURL(/\/login/);
}
