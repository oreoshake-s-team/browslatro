import { test, expect } from "@playwright/test";

test("hand renders 8 cards on first load", async ({ page }) => {
  await page.goto("/");
  const handCards = page.locator('[aria-label="Your hand"] .card');
  await expect(handCards).toHaveCount(8);
});
