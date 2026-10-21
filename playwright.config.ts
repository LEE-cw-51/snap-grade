import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 3000);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: `npx next dev --turbopack -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATA_PROVIDER: "memory",
      VISION_PROVIDER: "mock",
      ALLOW_E2E_RESET: "1",
      DAILY_GRADE_LIMIT: "2",
      MAX_PAGES_PER_SUBMISSION: "2",
      PORT: String(port),
    },
  },
});
