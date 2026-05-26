import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function dismissBlindSelect(page: Page): Promise<void> {
  const btn = page.getByTestId("blind-select-play");
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box;
}

test("hand card, joker tile, consumable tile, and deck pile all render at the same dimensions (issue #214)", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector(".card");
  const card = await boxOf(page, ".card");
  const joker = await boxOf(page, ".joker-tile");
  const consumable = await boxOf(page, '[data-testid^="consumable-tile-"]');
  const deck = await boxOf(page, ".deck-pile");

  expect(card.width).toBeCloseTo(joker.width, 0);
  expect(card.height).toBeCloseTo(joker.height, 0);
  expect(card.width).toBeCloseTo(consumable.width, 0);
  expect(card.height).toBeCloseTo(consumable.height, 0);
  expect(card.width).toBeCloseTo(deck.width, 0);
  expect(card.height).toBeCloseTo(deck.height, 0);
});

test("8 hand cards fit on one row at desktop width without wrapping (issue #214)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForSelector(".card");
  const cards = page.locator('[aria-label="Your hand"] .card');
  await expect(cards).toHaveCount(8);
  const firstTop = (await cards.first().boundingBox())?.y;
  const lastTop = (await cards.last().boundingBox())?.y;
  expect(firstTop).toBeDefined();
  expect(lastTop).toBeDefined();
  expect(Math.abs((firstTop ?? 0) - (lastTop ?? 0))).toBeLessThan(2);
});

test("13 hand cards squish instead of producing a horizontal scrollbar (issue #210)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await dismissBlindSelect(page);
  await page.waitForSelector(".modifier-disclosure");
  await page.locator(".modifier-disclosure").click();
  const grow = page.getByRole("button", { name: /Hand \+1/ });
  for (let i = 0; i < 5; i += 1) await grow.click();
  await page.getByText(/Win/).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await dismissBlindSelect(page);
  await expect(
    page.locator('[aria-label="Your hand"] .card'),
  ).toHaveCount(13);
  const overflow = await page.locator(".hand-cards").evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});
