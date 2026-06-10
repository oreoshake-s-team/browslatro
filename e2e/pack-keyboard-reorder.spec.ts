import { test, expect, type Page } from "@playwright/test";

const SHOP_HEADING = /Shop/;

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function setupArcanaPack(page: Page): Promise<void> {
  await setDeterministic(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "browslatro:forcePackTarotIds",
      "the-sun,the-hermit",
    );
    window.localStorage.setItem("browslatro:forcePackVariant", "mega");
    window.localStorage.setItem("browslatro:forcePackPool", "arcana");
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  const packOffer = page
    .locator(".shop-packs .shop-offer[data-offer-kind='pack']")
    .first();
  await expect(packOffer).toBeVisible();
  await packOffer.locator("button.shop-offer-buy").click();
  await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
}

async function previewLabels(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="pack-open-preview-hand"] .card')
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
}

test("keyboard-only reorder of pack-preview picks announces the move (issue #910)", async ({
  page,
}) => {
  await setupArcanaPack(page);
  const before = await previewLabels(page);
  expect(before.length).toBeGreaterThan(1);
  await page
    .locator('[data-testid="pack-open-preview-hand"] .card')
    .nth(1)
    .focus();
  await page.keyboard.press("Tab");
  const moveLeft = page.getByRole("button", { name: `Move ${before[1]} left` });
  await expect(moveLeft).toBeFocused();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await previewLabels(page)).slice(0, 2))
    .toEqual([before[1], before[0]]);
  await expect(page.getByTestId("live-announcer")).toHaveText(
    `${before[1]} moved to position 1 of ${before.length}`,
  );
  expect((await previewLabels(page)).slice(2)).toEqual(before.slice(2));
});

test("mouse drag reordering of pack-preview picks still works (issue #910)", async ({
  page,
}) => {
  await setupArcanaPack(page);
  const before = await previewLabels(page);
  const cards = page.locator(
    '[data-testid="pack-open-preview-hand"] .pack-open-preview-card',
  );
  await cards.first().dragTo(cards.last());
  await expect
    .poll(async () => (await previewLabels(page)).at(-2))
    .toBe(before[0]);
});
