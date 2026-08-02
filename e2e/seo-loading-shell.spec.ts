import { test, expect } from "@playwright/test";

test("served HTML ships the crawlable loading shell", async ({ page }) => {
  const response = await page.request.get("/");
  const html = await response.text();
  expect(html).toContain("data-seo-shell");
  expect(html).toContain(
    "Browslatro is a free, browser-based take on the poker roguelike",
  );
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('role="status"');
  expect(html).toContain("Loading…");
});

test("loading shell fades out and is removed once the app mounts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("new-run-confirm")).toBeVisible();
  await expect(page.locator("[data-seo-shell]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});
