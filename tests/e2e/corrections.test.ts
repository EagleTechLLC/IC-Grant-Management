import { test, expect } from "@playwright/test";

test.describe("Corrections queue (admin)", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  test("pending corrections badge shows in admin nav", async ({ page }) => {
    await page.goto("/admin");
    // Seed has 1 pending correction — badge should show "1"
    await expect(page.getByRole("link", { name: /corrections/i })).toBeVisible();
    await expect(page.locator("nav").getByText("1")).toBeVisible();
  });

  test("corrections page shows pending request from seed", async ({ page }) => {
    await page.goto("/admin/corrections");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText(/Wrong activity type/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  test("original vs proposed values are shown", async ({ page }) => {
    await page.goto("/admin/corrections");
    await expect(page.getByText("Original")).toBeVisible();
    await expect(page.getByText("Proposed")).toBeVisible();
    // Original has ADV, proposed has DS
    await expect(page.getByText("ADV")).toBeVisible();
    await expect(page.getByText("DS")).toBeVisible();
  });

  test("rejecting a correction moves it to the rejected tab", async ({ page }) => {
    await page.goto("/admin/corrections");

    // Add an optional note and reject
    await page.getByPlaceholder(/optional note/i).fill("Insufficient justification.");
    await page.getByRole("button", { name: "Reject" }).click();

    // Should no longer show in pending
    await page.waitForURL(/status=pending|\/corrections/);
    await expect(page.getByText(/Alice Smith/)).not.toBeVisible();

    // Should appear in rejected tab
    await page.getByRole("link", { name: /rejected/i }).click();
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Insufficient justification")).toBeVisible();
  });
});

test.describe("Corrections queue (caseworker)", () => {
  test.use({ storageState: "tests/e2e/.auth/caseworker.json" });

  test("caseworker cannot access admin corrections page", async ({ page }) => {
    await page.goto("/admin/corrections");
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
