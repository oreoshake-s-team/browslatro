import { test, expect } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] [data-suit]';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

test("the jokers and consumables trays bleed into the top edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForSelector('[data-testid^="joker-tile-"]');
  const jokers = await page.getByTestId("jokers-tray").boundingBox();
  const consumables = await page.getByTestId("consumables-tray").boundingBox();
  expect(jokers?.y).toBeLessThan(1);
  expect(consumables?.y).toBeLessThan(1);
});

test("the game area never scrolls and the shop scrolls internally on a short viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  const playScroll = await page
    .locator("main")
    .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(playScroll.scroll).toBeLessThanOrEqual(playScroll.client);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 500 });
  const mainScroll = await page
    .locator("main")
    .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(mainScroll.scroll).toBeLessThanOrEqual(mainScroll.client);
  const shopScroll = await page
    .getByTestId("shop-panel")
    .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(shopScroll.scroll).toBeGreaterThan(shopScroll.client);
});
