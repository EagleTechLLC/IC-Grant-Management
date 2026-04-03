import { chromium, FullConfig } from "@playwright/test";
import { USERS, TEST_PASSWORD } from "./fixtures";

async function loginAndSave(
  baseURL: string,
  email: string,
  password: string,
  storageStatePath: string
) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";

  await loginAndSave(baseURL, USERS.admin.email, TEST_PASSWORD, "tests/e2e/.auth/admin.json");
  await loginAndSave(baseURL, USERS.alice.email, TEST_PASSWORD, "tests/e2e/.auth/caseworker.json");
}
