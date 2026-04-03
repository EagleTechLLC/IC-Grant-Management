import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // sequential — shared dev DB, parallel runs would conflict
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",

  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Auth setup runs first and saves storage state for each user role
    { name: "setup", testMatch: /global-setup\.ts/ },

    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "caseworker",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/caseworker.json",
      },
      dependencies: ["setup"],
    },
  ],
});
