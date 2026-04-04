import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("Admin overview", () => {
  test("admin can access /admin and sees all nav items", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin Overview" })).toBeVisible();
    for (const label of ["Team View", "Corrections", "Audit Log", "Grants", "Activity Types", "Export", "Settings"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("back to dashboard link works", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: /my dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Activity types", () => {
  test("activity types page shows seeded types with codes", async ({ page }) => {
    await page.goto("/admin/activity-types");
    await expect(page.getByText("CM")).toBeVisible();
    await expect(page.getByText("Case Management")).toBeVisible();
    await expect(page.getByText("DS")).toBeVisible();
    await expect(page.getByText("ADV")).toBeVisible();
    await expect(page.getByText("TRANS")).toBeVisible();
  });

  test("archived type shows archived badge", async ({ page }) => {
    await page.goto("/admin/activity-types");
    // "Outreach" is archived in seed
    const row = page.getByRole("row").filter({ hasText: /outreach/i });
    await expect(row.getByText("Archived")).toBeVisible();
  });

  test("admin can create a new activity type", async ({ page }) => {
    await page.goto("/admin/activity-types");
    await page.getByRole("button", { name: "New Activity Type" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("CM").fill("INT");
    await dialog.getByPlaceholder(/case management/i).fill("Interpretation");
    await dialog.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Interpretation")).toBeVisible();
    await expect(page.getByText("INT")).toBeVisible();
  });

  test("admin can archive an activity type", async ({ page }) => {
    await page.goto("/admin/activity-types");
    const row = page.getByRole("row").filter({ hasText: "Transportation" });
    await row.getByRole("button", { name: "Archive" }).click();
    await expect(row.getByText("Archived")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Grants", () => {
  test("grants page shows seeded grants", async ({ page }) => {
    await page.goto("/admin/grants");
    await expect(page.getByText("RCA-2026")).toBeVisible();
    await expect(page.getByText("Refugee Cash Assistance")).toBeVisible();
    await expect(page.getByText("EMP-2026")).toBeVisible();
  });

  test("admin can create a new grant", async ({ page }) => {
    await page.goto("/admin/grants");
    await page.getByRole("button", { name: "New Grant" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Name").fill("Housing Assistance");
    await dialog.getByLabel("Grant Code").fill("HSG-2026");
    await dialog.getByRole("button", { name: "Create Grant" }).click();

    await expect(page.getByText("HSG-2026")).toBeVisible();
    await expect(page.getByText("Housing Assistance")).toBeVisible();
  });

  test("grant edit dialog shows pre-checked activity types", async ({ page }) => {
    await page.goto("/admin/grants");
    const row = page.getByRole("row").filter({ hasText: "RCA-2026" });
    await row.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");

    // RCA has all 4 types assigned — all checkboxes should be checked
    const checkboxes = dialog.getByRole("checkbox");
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });
});

test.describe("Audit log", () => {
  test("audit log page loads with two tabs", async ({ page }) => {
    await page.goto("/admin/audit-log");
    await expect(page.getByRole("link", { name: "Time Entries" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configuration" })).toBeVisible();
  });

  test("config tab shows grant creation from seed", async ({ page }) => {
    await page.goto("/admin/audit-log?tab=config");
    // Seed inserted grants which triggers admin_audit — should have insert rows
    await expect(page.getByText("Grant")).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("settings page shows all three sections", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByText("Work Day Hours")).toBeVisible();
    await expect(page.getByText("Time Tracking")).toBeVisible();
    await expect(page.getByText("Audit Retention")).toBeVisible();
  });

  test("audit retention defaults to 7 years", async ({ page }) => {
    await page.goto("/admin/settings");
    const select = page.locator("select#audit_retention_years");
    await expect(select).toHaveValue("7");
  });
});
