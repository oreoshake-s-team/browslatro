import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

test.describe("New-run screen — deck selection (#561, #562, #564)", () => {
  test("Yellow Deck starts the run with $14 (+$10 over the $4 baseline) and 3 baseline discards", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$14");
    await expect(statValue(page, "Discards")).toHaveText("3");
  });

  test("Red Deck (default) starts the run with $4 (no money bonus) and 4 discards (+1 over the 3 baseline)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$4");
    await expect(statValue(page, "Discards")).toHaveText("4");
  });
});

test.describe("New-run screen — Green Deck (#818)", () => {
  const HAND_CARDS = '[data-testid="hand-cards"] .card';
  const SUBMIT_BUTTON = /^Submit Hand/;
  const CONTINUE_BUTTON = /Continue/;

  async function selectGreenAndPlayWinningRound(page: Page): Promise<void> {
    await page.goto("/");
    await page.getByTestId("new-run-deck-green-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    for (let i = 0; i < 5; i += 1) {
      await page.locator(HAND_CARDS).nth(i).click();
    }
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  }

  test("Round Won modal pays hands + discards (6 × $2) with no interest row, then continuing credits $19", async ({
    page,
  }) => {
    await selectGreenAndPlayWinningRound(page);
    await expect(page.getByTestId("round-won-hands-label")).toHaveText(
      /Remaining hands \+ discards \(6 × \$2\)/,
    );
    await expect(page.getByTestId("round-won-hands")).toHaveText("+$12");
    await expect(page.getByTestId("round-won-interest")).toHaveCount(0);
    await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
    await expect(statValue(page, "Money")).toHaveText("$19");
  });
});
