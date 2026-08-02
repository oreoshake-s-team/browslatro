import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box;
}

test("hand card and deck pile share dimensions; joker and consumable tiles share the tile footprint", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector("button[data-suit]");
  const card = await boxOf(page, "button[data-suit]");
  const joker = await boxOf(page, '[data-testid^="joker-tile-"]');
  const consumable = await boxOf(page, '[data-testid^="consumable-tile-"]');
  const deck = await boxOf(page, '[data-testid="deck-pile"]');

  expect(card.width).toBeCloseTo(deck.width, 0);
  expect(card.height).toBeCloseTo(deck.height, 0);
  expect(joker.width).toBeCloseTo(consumable.width, 0);
  expect(joker.height).toBeCloseTo(consumable.height, 0);
  expect(card.height).toBeLessThanOrEqual(joker.height);
});

test("8 hand cards fit on one row at desktop width without wrapping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForSelector("button[data-suit]");
  const cards = page.locator('[data-testid="hand-cards"] [data-suit]');
  await expect(cards).toHaveCount(8);
  const firstTop = (await cards.first().boundingBox())?.y;
  const lastTop = (await cards.last().boundingBox())?.y;
  expect(firstTop).toBeDefined();
  expect(lastTop).toBeDefined();
  expect(Math.abs((firstTop ?? 0) - (lastTop ?? 0))).toBeLessThan(2);
});

test("13 hand cards scroll inside the hand row without a page-level horizontal scrollbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await dismissBlindSelect(page);
  await page.waitForSelector('[data-testid="modifier-disclosure"]');
  await page.locator('[data-testid="modifier-disclosure"]').click();
  const grow = page.getByRole("button", { name: /Hand \+1/ });
  for (let i = 0; i < 5; i += 1) await grow.click();
  await page.getByText(/Win/).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await dismissBlindSelect(page);
  await expect(
    page.locator('[data-testid="hand-cards"] [data-suit]'),
  ).toHaveCount(13);
  const overflowX = await page
    .locator('[data-testid="hand-cards"]')
    .evaluate((el) => getComputedStyle(el).overflowX);
  expect(overflowX).toBe("auto");
  const pageOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(pageOverflow).toBe(0);
});
