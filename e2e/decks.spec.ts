import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] [data-suit]';
const EMPTY_JOKER_SLOT = '[data-testid="joker-tile-empty"]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRunWithDeck(page: Page, deckId: string): Promise<void> {
  await page.goto("/");
  await page.getByTestId(`new-run-deck-${deckId}`).click();
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
}

test.describe("Painted Deck", () => {
  test("deals a 10-card hand and shows only 4 joker slots", async ({
    page,
  }) => {
    await startRunWithDeck(page, "painted-deck");
    await expect(page.locator(HAND_CARDS)).toHaveCount(10);
    await expect(page.locator(EMPTY_JOKER_SLOT)).toHaveCount(4);
  });

  test("negative: the Red Deck keeps the 8-card hand and 5 joker slots", async ({
    page,
  }) => {
    await startRunWithDeck(page, "red-deck");
    await expect(page.locator(HAND_CARDS)).toHaveCount(8);
    await expect(page.locator(EMPTY_JOKER_SLOT)).toHaveCount(5);
  });
});

test.describe("Magic Deck", () => {
  test("starts with two Fool tarots and a third consumable slot from Crystal Ball", async ({
    page,
  }) => {
    await startRunWithDeck(page, "magic-deck");
    await expect(page.locator('[data-consumable-kind="tarot"]')).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Empty consumable slot" }),
    ).toHaveCount(1);
  });
});
