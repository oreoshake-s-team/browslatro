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
  await page.waitForSelector('[data-testid="deck-pile"]');
  await dismissBlindSelect(page);
  await page.getByTestId("deck-pile").click();
  await page.waitForSelector('[data-testid="deck-modal"]');
}

async function heightOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box.height;
}

test("Remaining Cards summary rows are readable on the dark theme", async ({
  page,
}) => {
  await openDeckModal(page);
  const oddRowBg = await page
    .locator('[data-testid^="deck-summary-suit-"], [data-testid^="deck-summary-rank-"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const countColor = await page
    .locator('[data-testid="deck-summary-count"]')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  const headingColor = await page
    .locator('[data-testid="deck-summary-heading"]')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(oddRowBg).toBe("rgb(31, 38, 52)");
  expect(countColor).toBe("rgb(238, 241, 245)");
  expect(headingColor).toBe("rgb(151, 161, 176)");
});

test("Remaining Cards summary column matches the card grid height", async ({
  page,
}) => {
  await openDeckModal(page);
  const summary = await heightOf(page, '[data-testid="deck-summary"]');
  const groups = await heightOf(page, '[data-testid="deck-modal-groups"]');
  expect(Math.abs(summary - groups)).toBeLessThan(2);
});

test("Remaining Cards summary sections fill the column height", async ({
  page,
}) => {
  await openDeckModal(page);
  const summary = await heightOf(page, '[data-testid="deck-summary"]');
  const suits = await heightOf(page, '[data-testid="deck-summary-suits"]');
  const ranks = await heightOf(page, '[data-testid="deck-summary-ranks"]');
  expect(suits + ranks).toBeGreaterThan(summary * 0.9);
});

test("deck modal cards use the high-visibility palette when enabled in Options", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:highVisibility", "false");
  });
  await page.goto("/");
  await page.waitForSelector('[data-testid="deck-pile"]');
  await dismissBlindSelect(page);
  await page.getByRole("button", { name: "Options" }).click();
  const optionsDialog = page.getByRole("dialog", { name: "Options" });
  await optionsDialog
    .getByRole("button", { name: "Enable high visibility suits" })
    .click();
  await optionsDialog.getByRole("button", { name: "Close" }).click();
  await page.getByTestId("deck-pile").click();
  await page.waitForSelector('[data-testid="deck-modal"]');
  const diamondColor = await page
    .locator('[data-testid="deck-modal"] [data-suit="diamonds"]')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  const clubColor = await page
    .locator('[data-testid="deck-modal"] [data-suit="clubs"]')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(diamondColor).toBe("rgb(25, 113, 194)");
  expect(clubColor).toBe("rgb(26, 116, 49)");
});

test("deck modal cards keep the classic palette when high visibility is off", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:highVisibility", "false");
  });
  await openDeckModal(page);
  const diamondColor = await page
    .locator('[data-testid="deck-modal"] [data-suit="diamonds"]')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(diamondColor).toBe("rgb(211, 54, 54)");
});
