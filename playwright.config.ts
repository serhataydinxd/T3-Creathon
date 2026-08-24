import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "pglite:./.data/imkan-test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "tr-TR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run db:test:reset && npm run db:seed && npm run build && npm run start",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: databaseUrl,
      DATABASE_SSL: "false",
      APP_MODE: "replay",
      DEMO_PASSWORD: "I.mkanDemo!2026",
    },
  },
});
