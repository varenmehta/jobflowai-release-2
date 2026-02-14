import { test, expect } from "@playwright/test";

test("dashboard loads", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Good morning")).toBeVisible();
});

test("pipeline loads", async ({ page }) => {
  await page.goto("/pipeline");
  await expect(page.getByText("Application Pipeline")).toBeVisible();
});
