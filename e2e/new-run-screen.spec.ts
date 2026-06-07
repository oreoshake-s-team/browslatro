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
  test("the picker shows the Red Deck (#562) and Yellow Deck (#564) tiles", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("new-run-deck-red-deck")).toBeVisible();
    await expect(page.getByTestId("new-run-deck-yellow-deck")).toBeVisible();
  });

  test("Yellow Deck starts the run with $14 (+$10 over the $4 baseline)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$14");
  });

  test("Red Deck (default) starts the run with $4 (no money bonus, negative)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$4");
  });

  test("Red Deck starts the round with 4 discards (+1 over the 3 baseline)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Discards")).toHaveText("4");
  });

  test("Yellow Deck does not bump starting discards (negative)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Discards")).toHaveText("3");
  });
});

test.describe("New-run screen — Green Deck (#818)", () => {
  const HAND_CARDS = '[aria-label="Your hand"] .card';
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

  test("Round Won modal labels the bonus row as hands + discards (6 × $2)", async ({
    page,
  }) => {
    await selectGreenAndPlayWinningRound(page);
    await expect(page.getByTestId("round-won-hands-label")).toHaveText(
      /Remaining hands \+ discards \(6 × \$2\)/,
    );
    await expect(page.getByTestId("round-won-hands")).toHaveText("+$12");
  });

  test("Round Won modal omits the interest row entirely on Green Deck", async ({
    page,
  }) => {
    await selectGreenAndPlayWinningRound(page);
    await expect(page.getByTestId("round-won-interest")).toHaveCount(0);
  });

  test("Continuing past the Round Won modal credits $3 base + $12 bonus over the $4 start = $19 wallet", async ({
    page,
  }) => {
    await selectGreenAndPlayWinningRound(page);
    await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
    await expect(statValue(page, "Money")).toHaveText("$19");
  });
});
