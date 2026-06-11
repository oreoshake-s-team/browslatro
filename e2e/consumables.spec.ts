// Drag wiring (drag-to-deck sell, drag-to-jokers use) is covered by
// src/App.consumableDrag.test.tsx — the e2e drags were synthetic events,
// not real browser drags, so they live in jsdom now.
import { test, expect, type Page } from "@playwright/test";

const NEXT_ROUND_BUTTON = /Next Round/;
const SHOP_HEADING = /Shop/;

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

async function moneyOf(page: Page): Promise<number> {
  const txt = await statValue(page, "Money").textContent();
  return Number((txt ?? "$0").replace(/[^0-9-]/g, ""));
}

async function setForcedShopKinds(
  page: Page,
  kinds: ReadonlyArray<string>,
): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:forceShopOfferKinds", value);
  }, kinds.join(","));
}

async function buyForcedKindThenLeaveShop(
  page: Page,
  kind: string,
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  await page
    .locator(`.shop-offer[data-offer-kind="${kind}"]`)
    .first()
    .locator("button.shop-offer-buy")
    .click();
  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
  await page.getByTestId("blind-select-play").click();
}

test.describe("Consumables in-game flow", () => {
  test("clicking a planet consumable empties the slot", async ({ page }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(1);
    await page.locator('[data-consumable-kind="planet"]').click();
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(0);
  });

  test("shift-clicking a consumable sells it for $1", async ({ page }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    const before = await moneyOf(page);
    await page
      .locator('[data-consumable-kind="planet"]')
      .click({ modifiers: ["Shift"] });
    expect(await moneyOf(page)).toBe(before + 1);
  });
});
