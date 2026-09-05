import { expect, type Page } from "@playwright/test";
import { login, logout } from "./helpers";

/**
 * Runs a workshop from generation through to publication and returns its path.
 * Deliberately free of corpus specifics — no outcome name, material quantity or
 * cost — so it keeps working as the content registry grows.
 */
export async function publishWorkshop(page: Page): Promise<string> {
  await login(page, "content@imkan.test");
  await page.goto("/lab");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("plan-root")).toBeVisible();
  await page.getByTestId("save-draft").click();
  await expect(page).toHaveURL(/\/workshops\/[0-9a-f-]+\?created=1/);
  const path = new URL(page.url()).pathname;

  await page.getByTestId("submit-for-review").click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "submitted");
  await logout(page);

  await login(page, "pedagogue@imkan.test");
  await page.goto(path);
  await page.getByRole("button", { name: "Pedagojik olarak onayla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "approved");
  await logout(page);

  await login(page, "manager@imkan.test");
  await page.goto(path);
  await page.getByRole("button", { name: "Paketi yayımla" }).click();
  await expect(page.getByTestId("workflow-status")).toHaveAttribute("data-status", "published");
  return path;
}

/** Serious and critical violations only, matching the existing axe assertions. */
export function seriousViolations<T extends { impact?: string | null }>(violations: T[]): T[] {
  return violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
}

/** Whether the currently focused element would draw a visible focus ring. */
export function focusIsVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement && active.matches(":focus-visible");
  });
}

/** Tabs forward until the predicate matches the active element, or gives up. */
export async function tabUntil(
  page: Page,
  matches: (info: { testId: string | null; tag: string }) => boolean,
  limit = 60,
): Promise<boolean> {
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return {
        testId: active?.getAttribute("data-testid") ?? null,
        tag: active?.tagName.toLowerCase() ?? "",
      };
    });
    if (matches(info)) return true;
  }
  return false;
}

/**
 * Moves the lab wizard to a named step.
 *
 * The steps guide rather than gate — every field has a safe default and
 * generation stays available throughout — so a test may jump straight to the
 * step holding the control it is about, exactly as a returning trainer would.
 */
export async function gotoStep(
  page: Page,
  id: "topic" | "conditions" | "materials" | "delivery",
): Promise<void> {
  await page.getByTestId(`step-button-${id}`).click();
  await expect(page.getByTestId(`step-${id}`)).toBeVisible();
}
