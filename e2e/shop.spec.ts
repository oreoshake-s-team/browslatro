import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^🃏 Submit Hand$/;
const CONTINUE_BUTTON = /Continue/;
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

async function openShopAfterRound1Win(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

function offerOfKind(page: Page, kind: string) {
  return page.locator(`.shop-offer[data-offer-kind="${kind}"]`).first();
}

test.describe("Shop purchases (issue #240)", () => {
  test("buying the offered joker decreases money by the joker price", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "planet"]);
    await openShopAfterRound1Win(page);
    const before = await moneyOf(page);
    const offer = offerOfKind(page, "joker");
    const priceText = (await offer.locator(".shop-offer-price").textContent()) ?? "";
    const price = Number(priceText.replace(/[^0-9]/g, ""));
    await offer.locator("button.shop-offer-buy").click();
    expect(await moneyOf(page)).toBe(before - price);
  });

  test("buying the offered joker adds it to the equipped row", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "planet"]);
    await openShopAfterRound1Win(page);
    const before = await page
      .locator('[data-testid^="joker-tile-filled-"]')
      .count();
    await offerOfKind(page, "joker").locator("button.shop-offer-buy").click();
    await expect(
      page.locator('[data-testid^="joker-tile-filled-"]'),
    ).toHaveCount(before + 1);
  });

  test("buying the offered joker flips that offer's button to Sold", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "planet"]);
    await openShopAfterRound1Win(page);
    const offer = offerOfKind(page, "joker");
    await offer.locator("button.shop-offer-buy").click();
    await expect(offer.locator("button.shop-offer-buy")).toHaveText(/Sold/);
  });

  test("buying the offered planet adds a planet consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await openShopAfterRound1Win(page);
    await offerOfKind(page, "planet").locator("button.shop-offer-buy").click();
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(1);
  });

  test("buying the offered tarot adds a tarot consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["tarot", "joker"]);
    await openShopAfterRound1Win(page);
    await offerOfKind(page, "tarot").locator("button.shop-offer-buy").click();
    await expect(
      page.locator('[data-consumable-kind="tarot"]'),
    ).toHaveCount(1);
  });

  test("buying the offered spectral adds a spectral consumable to the tray", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["spectral", "joker"]);
    await openShopAfterRound1Win(page);
    await offerOfKind(page, "spectral").locator("button.shop-offer-buy").click();
    await expect(
      page.locator('[data-consumable-kind="spectral"]'),
    ).toHaveCount(1);
  });

  test("clicking Reroll decreases money by the base reroll cost", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "planet"]);
    await openShopAfterRound1Win(page);
    const before = await moneyOf(page);
    await page.getByRole("button", { name: /Reroll/ }).click();
    expect(await moneyOf(page)).toBe(before - 5);
  });

  test("the buy button is disabled when the player cannot afford the offer", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "joker"]);
    await openShopAfterRound1Win(page);
    await page.getByRole("button", { name: /Reroll/ }).click();
    await page.getByRole("button", { name: /Reroll/ }).click();
    await expect(
      offerOfKind(page, "joker").locator("button.shop-offer-buy"),
    ).toBeDisabled();
  });

  test("clicking a disabled buy button does not equip the joker", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["joker", "joker"]);
    await openShopAfterRound1Win(page);
    await page.getByRole("button", { name: /Reroll/ }).click();
    await page.getByRole("button", { name: /Reroll/ }).click();
    const before = await page
      .locator('[data-testid^="joker-tile-filled-"]')
      .count();
    await offerOfKind(page, "joker")
      .locator("button.shop-offer-buy")
      .click({ force: true })
      .catch(() => {});
    expect(
      await page.locator('[data-testid^="joker-tile-filled-"]').count(),
    ).toBe(before);
  });
});
