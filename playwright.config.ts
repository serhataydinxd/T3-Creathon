import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "pglite:./.data/imkan-test";

/**
 * The port is configurable so two checkouts — a git worktree and the main
 * working copy — can run the suite at the same time without fighting over a
 * listener. baseURL and the health probe are both derived from this single
 * value so they cannot drift apart.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: origin,
    locale: "tr-TR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run db:test:reset && npm run db:seed && npm run build && npm run start -- --port ${port}`,
    url: `${origin}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: databaseUrl,
      DATABASE_SSL: "false",
      APP_MODE: "replay",
      DEMO_PASSWORD: "I.mkanDemo!2026",
      PORT: String(port),
    },
  },
});
