import { test, expect } from "@playwright/test";

test("job board apply flow", async ({ page }) => {
  await page.request.post("/api/dev/seed");
  await page.goto("/jobs");
  const apply = page.getByText("Apply").first();
  await apply.click();
  await expect(page.getByText("Applied and tracked.")).toBeVisible();
});

test("partner create + post job", async ({ page }) => {
  await page.goto("/partners");
  await page.fill("input[name=\"name\"]", "Dev Company");
  await page.fill("input[name=\"website\"]", "https://example.com");
  await page.getByText("Submit").click();
  await expect(page.getByText("Partner profile created.")).toBeVisible();

  await page.fill("input[name=\"title\"]", "Dev Role");
  await page.fill("input[name=\"company\"]", "Dev Company");
  await page.fill("input[name=\"url\"]", "https://example.com/job");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText("Job posted.")).toBeVisible();
});
