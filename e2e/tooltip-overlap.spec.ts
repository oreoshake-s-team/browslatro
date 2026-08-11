import { test, expect, type Locator, type Page } from "@playwright/test";

const PROXIMITY_PX = 200;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await expect(
    page.locator('[data-testid="hand-cards"] button[aria-pressed]').first(),
  ).toBeVisible();
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function rectGap(a: Box, b: Box): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.max(dx, dy);
}

async function anchorGap(tooltip: Locator, anchor: Locator): Promise<number> {
  const tipBox = await tooltip.boundingBox();
  const anchorBox = await anchor.boundingBox();
  if (!tipBox || !anchorBox) return Number.POSITIVE_INFINITY;
  return rectGap(tipBox, anchorBox);
}

test("a hand-card tooltip stays within the proximity cap of its card", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] button[aria-pressed]');
  await cards.nth(3).hover();
  const tooltip = page.locator('[data-testid="card-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect
    .poll(() => anchorGap(tooltip, cards.nth(3)))
    .toBeLessThanOrEqual(PROXIMITY_PX);
});

test("a selected (lifted) card's tooltip stays near the card", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] button[aria-pressed]');
  await cards.nth(3).click();
  await page.mouse.move(0, 0);
  await cards.nth(3).hover();
  const tooltip = page.locator('[data-testid="card-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect
    .poll(() => anchorGap(tooltip, cards.nth(3)))
    .toBeLessThanOrEqual(PROXIMITY_PX);
});

test("clicking a card while a neighbor's tooltip is open always selects it", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] button[aria-pressed]');
  await cards.nth(3).hover();
  await expect(page.locator('[data-testid="card-tooltip"]')).toBeVisible();
  await cards.nth(2).click();
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "true");
});

test("a joker tooltip stays within the proximity cap of its tile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  const summary = page.getByText(/Apply modifiers/).first();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  const inner = page.getByText(/Add a specific Joker/).first();
  const innerDetails = inner.locator("xpath=ancestor::details[1]");
  await innerDetails.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  const tile = page.locator('button[data-joker-id="blueprint"]');
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await tile.dispatchEvent("click");
  await page.getByTestId("blind-select-play").click();
  const joker = page.getByTestId("joker-tile-filled-blueprint");
  await expect(joker).toBeVisible();
  await joker.hover();
  const tooltip = page.locator('[data-testid="joker-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect
    .poll(() => anchorGap(tooltip, joker))
    .toBeLessThanOrEqual(PROXIMITY_PX);
});
