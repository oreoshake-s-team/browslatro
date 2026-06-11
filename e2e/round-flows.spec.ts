import { test, expect, type Page } from "@playwright/test";

// Pin shuffle to identity (Spades 2..9 dealt; displayed rank-descending as
// 9♠..2♠) and mute audio so CI doesn't spawn Web Audio nodes. See the seam
// in `src/deck.ts`.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const NEXT_ROUND_BUTTON = /Next Round/;
const SHOP_HEADING = /Shop/;

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

async function selectAndSubmitStraightFlush(page: Page): Promise<void> {
  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
}

async function submitSingleLosingHand(
  page: Page,
  expectedHandsAfter: number,
): Promise<void> {
  await page.locator(HAND_CARDS).nth(0).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await expect(statValue(page, "Hands")).toHaveText(String(expectedHandsAfter));
  await expect(
    page.locator('[data-testid="hand-cards"] .card-discarding'),
  ).toHaveCount(0);
}

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function playStraightFlushAndContinue(page: Page): Promise<void> {
  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
  await dismissBlindSelect(page);
}

test("always-win path: 4 consecutive Straight Flushes advance ante and money", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$10");

  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(7);
  await expect(statValue(page, "Money")).toHaveText("$19");

  await expect(
    page.getByRole("heading", { name: "The Manacle" }),
  ).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$30");

  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Ante")).toHaveText("2");
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$41");

  // End state: Ante 2 Big Blind, hand re-dealt. No Game Over alert fired.
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
});

test("post-round shop flow: round-won modal → Continue → shop with 2 items + 2 packs (no duplicates, no equipped jokers) + Next Round closes the shop", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const equippedNames = await page
    .locator('[data-testid^="joker-tile-filled-"] .joker-tile-name')
    .allTextContents();

  await selectAndSubmitStraightFlush(page);
  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();

  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  await expect(
    page.locator('[data-testid^="shop-offer-"]:not([data-offer-kind="pack"])'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-testid^="shop-offer-"][data-offer-kind="pack"]'),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: NEXT_ROUND_BUTTON }),
  ).toBeVisible();

  const offerNames = await page
    .locator('.shop-offer:not([data-offer-kind="pack"]) .shop-offer-name')
    .allTextContents();
  expect(offerNames.filter((name) => equippedNames.includes(name))).toEqual([]);
  expect(new Set(offerNames).size).toBe(offerNames.length);

  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
  await dismissBlindSelect(page);
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
});

test("losing 3 games in a row leaves exactly one chips/multiplier span in the sidebar HandScore", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  const tryAgain = page.getByRole("button", { name: /Try again/ });

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await submitSingleLosingHand(page, 3);
    await submitSingleLosingHand(page, 2);
    await submitSingleLosingHand(page, 1);
    await page.locator(HAND_CARDS).nth(0).click();
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await tryAgain.click();
    await dismissBlindSelect(page);
    await expect(page.locator(".sidebar .chips")).toHaveCount(1);
    await expect(page.locator(".sidebar .multiplier")).toHaveCount(1);
  }
});

test("always-lose path: 4 single-card hands exhaust hands and trigger Game Over", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Hands")).toHaveText("4");

  await submitSingleLosingHand(page, 3);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await submitSingleLosingHand(page, 2);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await submitSingleLosingHand(page, 1);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await page.locator(HAND_CARDS).nth(0).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await expect(page.getByRole("dialog", { name: "Game Over" })).toBeVisible();
  await page.getByRole("button", { name: /Try again/ }).click();
  await dismissBlindSelect(page);

  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Money")).toHaveText("$4");
  await expect(statValue(page, "Ante")).toHaveText("1");
  await expect(statValue(page, "Hands")).toHaveText("4");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
});
