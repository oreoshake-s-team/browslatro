import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';

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
  return page.locator(".game-top-row").evaluate((el) => ({
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
  await page.waitForSelector(".joker-tile");
  expect(Math.abs((await topOf(page, ".jokers")) - (await topOf(page, ".consumables")))).toBeLessThan(2);
  const overflow = await overflowOf(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("jokers, consumables, and deck stay on one row in the shop at a 600px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShopAfterRound1Win(page);
  await page.setViewportSize({ width: 600, height: 400 });
  await page.waitForSelector(".game-overlay-deck .deck-pile");
  const jokersTop = await topOf(page, ".jokers");
  expect(Math.abs(jokersTop - (await topOf(page, ".consumables")))).toBeLessThan(2);
  expect(Math.abs(jokersTop - (await topOf(page, ".game-overlay-deck .deck-pile")))).toBeLessThan(2);
  const overflow = await overflowOf(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("joker and consumable tiles keep full card width when there is room", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForSelector(".card");
  const card = await page.locator(".card").first().boundingBox();
  const joker = await page.locator(".joker-tile").first().boundingBox();
  expect(card?.width).toBeDefined();
  expect(joker?.width).toBeCloseTo(card?.width ?? 0, 0);
});
