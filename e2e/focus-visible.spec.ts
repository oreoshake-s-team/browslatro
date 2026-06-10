import { test, expect, type Page, type Locator } from "@playwright/test";

const FOCUS_RING = "rgb(116, 192, 252)";
const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SHOP_HEADING = /Shop/;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function focusViaKeyboard(page: Page, target: Locator): Promise<void> {
  await target.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
}

async function outlineOf(
  target: Locator,
): Promise<{ style: string; color: string }> {
  return target.evaluate((el) => {
    const computed = getComputedStyle(el);
    return { style: computed.outlineStyle, color: computed.outlineColor };
  });
}

async function openBlindSelect(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
}

async function openShop(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

// The boss-blind override only renders in production builds when the
// browslatro:devTools seam is set (issue #915).
async function enableDevTools(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:devTools", "1");
  });
}

test("boss-blind override keeps a visible focus ring on keyboard focus (issue #913)", async ({
  page,
}) => {
  await enableDevTools(page);
  await openBlindSelect(page);
  const override = page.getByTestId("blind-select-boss-override");
  await focusViaKeyboard(page, override);
  const outline = await outlineOf(override);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe(FOCUS_RING);
});

test("shop voucher override keeps a visible focus ring on keyboard focus (issue #913)", async ({
  page,
}) => {
  await openShop(page);
  const override = page.getByTestId("shop-voucher-override");
  await focusViaKeyboard(page, override);
  const outline = await outlineOf(override);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe("rgb(95, 61, 196)");
});

test("hand-sort buttons show the focus ring on keyboard focus (issue #913)", async ({
  page,
}) => {
  await openBlindSelect(page);
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  const sortButton = page.locator(".hand-sort-button").first();
  await focusViaKeyboard(page, sortButton);
  const outline = await outlineOf(sortButton);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe(FOCUS_RING);
});

test("pack preview sort buttons show the focus ring on keyboard focus (issue #913)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:forcePackPool", "arcana");
  });
  await openShop(page);
  const packOffer = page
    .locator(".shop-packs .shop-offer[data-offer-kind='pack']")
    .first();
  await expect(packOffer).toBeVisible();
  await packOffer.locator("button.shop-offer-buy").click();
  await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
  const sortButton = page.getByTestId("pack-open-preview-sort-rank");
  await focusViaKeyboard(page, sortButton);
  const outline = await outlineOf(sortButton);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe(FOCUS_RING);
});

async function startRound(page: Page): Promise<void> {
  await openBlindSelect(page);
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

test("scoring trace scroll region shows the focus ring on keyboard focus (issue #974)", async ({
  page,
}) => {
  await startRound(page);
  const trace = page.locator(".scoring-trace__scroll");
  await focusViaKeyboard(page, trace);
  const outline = await outlineOf(trace);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe(FOCUS_RING);
});

test("scoring trace modal body shows the focus ring on keyboard focus (issue #974)", async ({
  page,
}) => {
  await startRound(page);
  await page.locator(".scoring-trace__expand").click();
  const body = page.locator(".scoring-trace-modal__body");
  await expect(body).toBeVisible();
  await focusViaKeyboard(page, body);
  const outline = await outlineOf(body);
  expect(outline.style).toBe("solid");
  expect(outline.color).toBe(FOCUS_RING);
});

test("negative: clicking the scoring trace scroll region does not draw the focus outline (issue #974)", async ({
  page,
}) => {
  await startRound(page);
  const trace = page.locator(".scoring-trace__scroll");
  await trace.click();
  const outline = await outlineOf(trace);
  expect(outline.style).toBe("none");
});

test("negative: hovering the boss-blind override does not draw the focus outline (issue #913)", async ({
  page,
}) => {
  await enableDevTools(page);
  await openBlindSelect(page);
  const override = page.getByTestId("blind-select-boss-override");
  await override.hover();
  const outline = await outlineOf(override);
  expect(outline.style).toBe("none");
});
