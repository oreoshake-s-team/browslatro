import { test, expect, type Page } from "@playwright/test";

// Pin shuffle to identity (Spades 2..9 dealt; displayed rank-descending as
// 9♠..2♠) and mute audio so CI doesn't spawn Web Audio nodes. See the seam
// in `src/deck.ts`.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^🃏 Submit Hand$/;
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

async function playStraightFlushAndContinue(page: Page): Promise<void> {
  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
}

test("always-win path: 4 consecutive Straight Flushes advance ante and money", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  // Round 1 — start $4, +$9 gold (3 held), interest on $13 = $2, +$3 base. End $18.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$18");

  // Round 2 — +$9 gold, interest on $27 = $5 (capped), +$4 base. End $36.
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$36");

  // Round 3 — +$9 gold, interest on $45 = $5 (capped), +$5 base. End $55.
  await expect(page.getByRole("heading", { name: "Boss Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$55");

  // Round 4 — +$9 gold, interest on $64 = $5 (capped), +$3 base. End $72.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Ante")).toHaveText("2");
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$72");

  // End state: Ante 2 Big Blind, hand re-dealt. No Game Over alert fired.
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
});

test("the post-round shop appears after dismissing the round-won modal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await selectAndSubmitStraightFlush(page);
  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();

  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();

  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  await expect(page.getByTestId(/^shop-offer-/)).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: NEXT_ROUND_BUTTON }),
  ).toBeVisible();
});

test("shop offers exclude already-equipped jokers and never duplicate within a single shop", async ({
  page,
}) => {
  await page.goto("/");

  const equippedNames = await page
    .locator('[data-testid^="joker-tile-filled-"] .joker-tile-name')
    .allTextContents();

  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  await expect(page.getByTestId(/^shop-offer-/)).toHaveCount(2);

  const offerNames = await page
    .locator(".shop-offer .shop-offer-name")
    .allTextContents();

  const overlap = offerNames.filter((name) => equippedNames.includes(name));
  expect(overlap).toEqual([]);
  expect(new Set(offerNames).size).toBe(offerNames.length);
});

test("clicking Next Round in the shop closes it and starts the next blind", async ({
  page,
}) => {
  await page.goto("/");

  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();

  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();

  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
});

test("losing 3 games in a row leaves exactly one chips/multiplier span in the sidebar HandScore (issue #118)", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  const submit = page.getByRole("button", { name: SUBMIT_BUTTON });

  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (let hand = 0; hand < 4; hand += 1) {
      await submit.click();
    }
    await expect(page.locator(".sidebar .chips")).toHaveCount(1);
    await expect(page.locator(".sidebar .multiplier")).toHaveCount(1);
  }
});

test("always-lose path: 4 empty submits exhaust hands and trigger Game Over", async ({
  page,
}) => {
  // The browser-native alert blocks the run loop until accepted.
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Hands")).toHaveText("4");

  // Empty submissions don't discard anything, so the hand stays at 8 each time.
  const submit = page.getByRole("button", { name: SUBMIT_BUTTON });
  await submit.click();
  await expect(statValue(page, "Hands")).toHaveText("3");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await submit.click();
  await expect(statValue(page, "Hands")).toHaveText("2");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await submit.click();
  await expect(statValue(page, "Hands")).toHaveText("1");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  // 4th submit triggers loseGame() → alert + full game reset.
  await submit.click();

  // State resets: back to Ante 1 Small Blind, $4 money, 4 hands.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Money")).toHaveText("$4");
  await expect(statValue(page, "Ante")).toHaveText("1");
  await expect(statValue(page, "Hands")).toHaveText("4");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
});
