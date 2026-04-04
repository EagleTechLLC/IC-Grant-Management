import { test, expect } from "@playwright/test";
import { USERS, TEST_PASSWORD } from "./fixtures";

// These tests run without any stored auth state — they test the login flow itself.
// Playwright config assigns storageState per project; auth tests use a fresh context.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("email login succeeds and redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(USERS.alice.email);
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in with email" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong password shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(USERS.alice.email);
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in with email" }).click();
    await expect(page.getByText(/failed to sign in/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated visit to /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Role-based access control", () => {
  // Use caseworker session for RBAC tests
  test.use({ storageState: "tests/e2e/.auth/caseworker.json" });

  test("caseworker is redirected away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("caseworker can access /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Time Log")).toBeVisible();
  });
});
