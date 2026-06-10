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

async function openDeckModal(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(".deck-pile");
  await dismissBlindSelect(page);
  await page.locator(".deck-pile").click();
  await page.waitForSelector(".deck-modal");
}

async function heightOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box.height;
}

test("Remaining Cards summary rows are readable on the dark theme (#887)", async ({
  page,
}) => {
  await openDeckModal(page);
  const oddRowBg = await page
    .locator(".deck-summary-row:nth-child(odd)")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const countColor = await page
    .locator(".deck-summary-count")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  const headingColor = await page
    .locator(".deck-summary-heading")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(oddRowBg).toBe("rgb(35, 43, 63)");
  expect(countColor).toBe("rgb(248, 249, 250)");
  expect(headingColor).toBe("rgb(173, 181, 189)");
});

test("Remaining Cards summary column matches the card grid height (#437)", async ({
  page,
}) => {
  await openDeckModal(page);
  const summary = await heightOf(page, ".deck-summary");
  const groups = await heightOf(page, ".deck-modal-groups");
  expect(Math.abs(summary - groups)).toBeLessThan(2);
});

test("Remaining Cards summary sections fill the column height (#437)", async ({
  page,
}) => {
  await openDeckModal(page);
  const summary = await heightOf(page, ".deck-summary");
  const suits = await heightOf(page, ".deck-summary-section-suits");
  const ranks = await heightOf(page, ".deck-summary-section-ranks");
  expect(suits + ranks).toBeGreaterThan(summary * 0.9);
});
