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

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

async function playStraightFlushAndContinue(page: Page): Promise<void> {
  // Top 5 displayed cards (9♠,8♠,7♠,6♠,5♠) → Straight Flush, 1080 chips.
  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
}

test("always-win path: 4 consecutive Straight Flushes advance ante and money", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  // Round 1 — Ante 1 Small Blind (need 300) → +$3 base, no interest.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$3");

  // Round 2 — Ante 1 Big Blind (need 450) → +$4 base, interest on $3 = $0.
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$7");

  // Round 3 — Ante 1 Boss Blind (need 600) → +$5 base, interest on $7 = $1.
  await expect(page.getByRole("heading", { name: "Boss Blind" })).toBeVisible();
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$13");

  // Round 4 — Ante 2 Small Blind (need 800) → +$3 base, interest on $13 = $2.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Ante")).toHaveText("2");
  await playStraightFlushAndContinue(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(statValue(page, "Money")).toHaveText("$18");

  // End state: Ante 2 Big Blind, hand re-dealt. No Game Over alert fired.
  await expect(page.getByRole("heading", { name: "Big Blind" })).toBeVisible();
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

  // State resets: back to Ante 1 Small Blind, $0 money, 4 hands.
  await expect(page.getByRole("heading", { name: "Small Blind" })).toBeVisible();
  await expect(statValue(page, "Money")).toHaveText("$0");
  await expect(statValue(page, "Ante")).toHaveText("1");
  await expect(statValue(page, "Hands")).toHaveText("4");
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
});
