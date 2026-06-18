import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator('[data-testid="hand-cards"] .card')).toHaveCount(8);
}

test("playing a non-winning hand drops the Hands counter immediately", async ({
  page,
}) => {
  await startRound(page);
  await expect(page.getByTestId("hands-stat")).toHaveText(/4\s*Hands/);
  await page.locator('[data-testid="hand-cards"] .card').first().click();
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await expect(page.getByTestId("hands-stat")).toHaveText(/3\s*Hands/);
});

test("a hand that wins the round also decrements the Hands counter", async ({
  page,
}) => {
  await startRound(page);
  const handCards = page.locator('[data-testid="hand-cards"] .card');
  for (let i = 0; i < 5; i += 1) {
    await handCards.nth(i).click();
  }
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await expect(page.getByTestId("round-won-score")).toBeVisible();
  await expect(page.getByTestId("hands-stat")).toHaveText(/3\s*Hands/);
});
