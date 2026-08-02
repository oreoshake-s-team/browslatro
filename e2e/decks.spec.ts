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

test.describe("Nebula Deck", () => {
  test("starts with a single consumable slot", async ({ page }) => {
    await startRunWithDeck(page, "nebula-deck");
    await expect(page.locator('[data-testid="hand-cards"] [data-suit]')).toHaveCount(8);
    await expect(
      page.getByRole("button", { name: "Empty consumable slot" }),
    ).toHaveCount(1);
  });
});

test.describe("Zodiac Deck", () => {
  test("Overstock adds a third shop offer slot from the first shop", async ({
    page,
  }) => {
    await startRunWithDeck(page, "zodiac-deck");
    await expect(page.locator(HAND_CARDS)).toHaveCount(8);
    for (let i = 0; i < 5; i += 1) {
      await page.locator(HAND_CARDS).nth(i).click();
    }
    await page.getByRole("button", { name: /^Submit Hand/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
    await expect(
      page.locator('[data-shop-offer]:not([data-offer-kind="pack"])'),
    ).toHaveCount(3);
  });
});

test.describe("Anaglyph Deck", () => {
  test("defeating the ante-1 boss shows a Double Tag on the next blind select", async ({
    page,
  }) => {
    await startRunWithDeck(page, "anaglyph-deck");
    for (const blind of ["Small Blind", "Big Blind", "The Manacle"]) {
      await expect(page.getByRole("heading", { name: blind })).toBeVisible();
      const cards = page.locator(HAND_CARDS);
      await expect(cards.first()).toBeVisible();
      for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
      await page.getByRole("button", { name: /^Submit Hand/ }).click();
      await page.getByRole("button", { name: /Continue/ }).click();
      await page.getByRole("button", { name: /Next Round/ }).click();
      if (blind !== "The Manacle") {
        await page.getByTestId("blind-select-play").click();
      }
    }
    await expect(page.getByTestId("blind-select-tags")).toContainText(
      "Double Tag",
    );
  });
});
