import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] [data-suit]';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function topOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box.y;
}

async function overflowOf(page: Page) {
  return page.locator('[data-testid="game-top-row"]').evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
}

async function openShopAfterRound1Win(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
}

test("jokers and consumables stay on one row at a 600px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 400 });
  await page.goto("/");
  await page.waitForSelector('[data-testid^="joker-tile-"]');
  expect(Math.abs((await topOf(page, '[data-testid="jokers-tray"]')) - (await topOf(page, '[data-testid="consumables-tray"]')))).toBeLessThan(2);
  const overflow = await overflowOf(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("jokers, consumables, and deck stay on one row in the shop at a 600px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShopAfterRound1Win(page);
  await page.setViewportSize({ width: 600, height: 400 });
  await page.waitForSelector('[data-testid="game-overlay-deck"] [data-testid="deck-pile"]');
  const jokersTop = await topOf(page, '[data-testid="jokers-tray"]');
  expect(Math.abs(jokersTop - (await topOf(page, '[data-testid="consumables-tray"]')))).toBeLessThan(2);
  expect(Math.abs(jokersTop - (await topOf(page, '[data-testid="game-overlay-deck"] [data-testid="deck-pile"]')))).toBeLessThan(2);
  const overflow = await overflowOf(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("joker and consumable tiles keep the full tile footprint when there is room", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForSelector("button[data-suit]");
  const joker = await page.locator('[data-testid^="joker-tile-"]').first().boundingBox();
  const consumable = await page.locator('[data-testid^="consumable-tile-"]').first().boundingBox();
  expect(joker?.width).toBeDefined();
  expect(Math.abs((joker?.width ?? 0) - (consumable?.width ?? 0))).toBeLessThan(2);
  expect(Math.abs((joker?.height ?? 0) - (consumable?.height ?? 0))).toBeLessThan(2);
});
