import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] [data-suit]';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const SHOP_HEADING = /Shop/;

function statValue(page: Page, label: string) {
  return page
    .locator("[data-stat]", { has: page.locator(`[data-stat-label]`, { hasText: label }) })
    .locator("[data-stat-value]");
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

async function openShopAfterRound1Win(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

async function openShopViaBootSeam(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

function offerOfKind(page: Page, kind: string) {
  return page.locator(`[data-shop-offer][data-offer-kind="${kind}"]`).first();
}

test.describe("Shop purchases", () => {
  test("buying the offered joker deducts the price, adds it to the equipped row, flips the button to Sold; then Reroll deducts the base $5", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "planet"]);
    await openShopAfterRound1Win(page);
    const moneyBefore = await moneyOf(page);
    const offer = offerOfKind(page, "joker");
    const priceText = (await offer.locator("[data-shop-offer-price]").textContent()) ?? "";
    const price = Number(priceText.replace(/[^0-9]/g, ""));
    const equippedBefore = await page
      .locator('[data-testid^="joker-tile-filled-"]')
      .count();
    await offer.locator("button[data-shop-buy]").click();
    expect(await moneyOf(page)).toBe(moneyBefore - price);
    await expect(
      page.locator('[data-testid^="joker-tile-filled-"]'),
    ).toHaveCount(equippedBefore + 1);
    await expect(offer.locator("button[data-shop-buy]")).toHaveText(/Sold/);
    const moneyAfterBuy = await moneyOf(page);
    await page.locator('[data-testid="shop-reroll"]').click();
    expect(await moneyOf(page)).toBe(moneyAfterBuy - 5);
  });

  test("buying the offered planet adds a planet consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await openShopViaBootSeam(page);
    await offerOfKind(page, "planet").locator("button[data-shop-buy]").click();
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(1);
  });

  test("buying the offered tarot adds a tarot consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["tarot", "joker"]);
    await openShopViaBootSeam(page);
    await offerOfKind(page, "tarot").locator("button[data-shop-buy]").click();
    await expect(
      page.locator('[data-consumable-kind="tarot"]'),
    ).toHaveCount(1);
  });

  test("buying the offered spectral adds a spectral consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["spectral", "joker"]);
    await openShopViaBootSeam(page);
    await offerOfKind(page, "spectral").locator("button[data-shop-buy]").click();
    await expect(
      page.locator('[data-consumable-kind="spectral"]'),
    ).toHaveCount(1);
  });

  test("the buy button is disabled when the player cannot afford the offer", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "joker"]);
    await openShopViaBootSeam(page);
    await page.locator('[data-testid="shop-reroll"]').click();
    const offers = page.locator('[data-shop-offer][data-offer-kind="joker"]');
    await offers.first().locator("button[data-shop-buy]").click();
    await expect(
      offers.nth(1).locator("button[data-shop-buy]"),
    ).toBeDisabled();
  });

});

test.describe("Reroll refreshes sold offers", () => {
  test("Reroll replaces a sold joker offer with a buyable one", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "joker"]);
    await openShopViaBootSeam(page);
    const firstOffer = page.locator("[data-shop-offer]").first();
    const buyName =
      (await firstOffer.locator("[data-shop-offer-name]").textContent()) ?? "";
    await firstOffer.locator("button[data-shop-buy]").click();
    await expect(
      firstOffer.locator("button[data-shop-buy]"),
    ).toHaveText(/Sold/);
    await page.locator('[data-testid="shop-reroll"]').click();
    const offerButtons = page.locator("[data-shop-offer] button[data-shop-buy]");
    const count = await offerButtons.count();
    for (let i = 0; i < count; i += 1) {
      await expect(offerButtons.nth(i)).not.toHaveText(/Sold/);
    }
    const offerNames = page.locator("[data-shop-offer] [data-shop-offer-name]");
    const namesCount = await offerNames.count();
    for (let i = 0; i < namesCount; i += 1) {
      const text = (await offerNames.nth(i).textContent()) ?? "";
      expect(text).not.toBe(buyName);
    }
  });
});
