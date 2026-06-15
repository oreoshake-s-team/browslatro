import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SHOP_HEADING = /Shop/;

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function forcePackPool(
  page: Page,
  pool: "standard" | "arcana" | "buffoon" | "spectral" | "celestial",
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:forcePackPool", value);
  }, pool);
}

async function addTarotToTray(page: Page, tarotId: string): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:seedTarotIds", value);
  }, tarotId);
}

async function addSpectralToTray(
  page: Page,
  spectralId: string,
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:seedSpectralIds", value);
  }, spectralId);
}

async function winRound1AndOpenShop(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

async function forceStandardEnhancement(
  page: Page,
  enhancement: string,
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem(
      "browslatro:forcePackStandardEnhancement",
      value,
    );
  }, enhancement);
}

async function buyFirstPackOffer(page: Page): Promise<void> {
  const packOffer = page
    .locator(".shop-packs .shop-offer[data-offer-kind='pack']")
    .first();
  await expect(packOffer).toBeVisible();
  await packOffer.locator("button.shop-offer-buy").click();
  await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
}

test.describe("Pack opening flow", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("Standard pack pool: forced → modal opens on buy → picking the first option closes the modal", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
    await page.getByTestId("pack-open-pick-0").click();
    await expect(page.getByTestId("pack-open-subtitle")).not.toBeVisible();
  });

  test("Standard pack: the player hand is hidden when no usable consumable is held", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
    await expect(page.getByTestId("hand-cards")).toHaveCount(0);
  });

  test("Standard pack: an enhanced card surfaces a modifier badge on its pick tile", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await forceStandardEnhancement(page, "steel");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    const badge = page.getByTestId("pack-card-enhancement-0");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("Steel");
    await expect(page.getByTestId("pack-open-pick-0")).toHaveAttribute(
      "aria-label",
      /Steel/,
    );
  });

  test("closing the pack modal without picking leaves consumables unchanged (negative)", async ({
    page,
  }) => {
    await forcePackPool(page, "arcana");
    await winRound1AndOpenShop(page);
    const consumableCountBefore = await page
      .locator("[data-consumable-kind]")
      .count();
    await buyFirstPackOffer(page);
    await page.getByRole("button", { name: /^Skip$/ }).click();
    const consumableCountAfter = await page
      .locator("[data-consumable-kind]")
      .count();
    expect(consumableCountAfter).toBe(consumableCountBefore);
  });

  test("pack pick options are evenly spaced across the row without stretching", async ({
    page,
  }) => {
    await forcePackPool(page, "arcana");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    const list = page.locator(".pack-open-options");
    const options = list.locator(".pack-open-option");
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
    const listBox = await list.boundingBox();
    const boxes: Array<{ x: number; width: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const box = await options.nth(i).boundingBox();
      if (box) boxes.push(box);
    }
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    if (!listBox || !first || !last || boxes.length !== count) {
      throw new Error("missing bounding boxes");
    }
    const leading = first.x - listBox.x;
    const trailing = listBox.x + listBox.width - (last.x + last.width);
    expect(leading).toBeGreaterThan(8);
    expect(Math.abs(leading - trailing)).toBeLessThanOrEqual(1);
    for (const box of boxes) {
      expect(Math.abs(box.width - first.width)).toBeLessThanOrEqual(1);
    }
    expect(first.width).toBeLessThanOrEqual(13 * 16 + 2);
  });

  test("Standard pack: picking a card increments the shop overlay deck pile count", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await winRound1AndOpenShop(page);
    const deckPile = page.locator(".game-overlay-deck .deck-pile");
    await expect(deckPile).toBeVisible();
    const before = Number(
      (await deckPile.locator(".deck-pile-count").textContent()) ?? "0",
    );
    await buyFirstPackOffer(page);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
    await page.getByTestId("pack-open-pick-0").click();
    await expect(page.getByTestId("pack-open-subtitle")).not.toBeVisible();
    await expect
      .poll(async () =>
        Number(
          (await deckPile.locator(".deck-pile-count").textContent()) ?? "0",
        ),
      )
      .toBe(before + 1);
  });
});

test.describe("Consumables usable while a Standard pack is open", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("Strength tarot on a hand card, then Black Hole spectral, each consumed mid-Standard-pack with the modal staying open", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await addTarotToTray(page, "strength");
    await addSpectralToTray(page, "black-hole");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(page.locator(HAND_CARDS).first()).toBeVisible();
    await page.locator(HAND_CARDS).first().click();
    await page.locator('[data-consumable-kind="tarot"]').first().click();
    await expect(
      page.locator('[data-consumable-kind="tarot"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
    await page.locator('[data-consumable-kind="spectral"]').first().click();
    await expect(
      page.locator('[data-consumable-kind="spectral"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
  });
});
