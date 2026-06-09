import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const SHOP_HEADING = /Shop/;

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  await expect(summary).toBeVisible();
  const details = summary.locator("xpath=ancestor::details[1]");
  const detailsOpen = await details.evaluate((el) => el.hasAttribute("open"));
  if (!detailsOpen) {
    await summary.click();
    await expect(details).toHaveAttribute("open", "");
  }
}

async function forcePackPool(
  page: Page,
  pool: "standard" | "arcana" | "buffoon" | "spectral" | "celestial",
): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Force a Pack pool in next shop/);
  const button = page.getByTestId(`force-pack-${pool}`);
  await expect(button).toBeVisible();
  await button.click();
}

async function addTarotToTray(page: Page, tarotId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Tarot/);
  const button = page.locator(`button[data-tarot-id="${tarotId}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

async function addSpectralToTray(
  page: Page,
  spectralId: string,
): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Spectral/);
  const button = page.locator(`button[data-spectral-id="${spectralId}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

async function winRound1AndOpenShop(page: Page): Promise<void> {
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

async function buyFirstPackOffer(page: Page): Promise<void> {
  const packOffer = page
    .locator(".shop-packs .shop-offer[data-offer-kind='pack']")
    .first();
  await expect(packOffer).toBeVisible();
  await packOffer.locator("button.shop-offer-buy").click();
  await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
}

test.describe("Pack opening flow (#694)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
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

  test("forcing an Arcana pack pool opens an Arcana pack modal", async ({
    page,
  }) => {
    await forcePackPool(page, "arcana");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(
      page.getByRole("heading", { name: /Arcana/ }),
    ).toBeVisible();
  });

  test("forcing a Buffoon pack pool opens a Buffoon pack modal", async ({
    page,
  }) => {
    await forcePackPool(page, "buffoon");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(
      page.getByRole("heading", { name: /Buffoon/ }),
    ).toBeVisible();
  });

  test("forcing a Spectral pack pool opens a Spectral pack modal", async ({
    page,
  }) => {
    await forcePackPool(page, "spectral");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(
      page.getByRole("heading", { name: /Spectral/ }),
    ).toBeVisible();
  });

  test("forcing a Celestial pack pool opens a Celestial pack modal", async ({
    page,
  }) => {
    await forcePackPool(page, "celestial");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(
      page.getByRole("heading", { name: /Celestial/ }),
    ).toBeVisible();
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

  test("using The Sun on a selected Arcana-pack preview card converts that card to hearts (#692)", async ({
    page,
  }) => {
    await forcePackPool(page, "arcana");
    await addTarotToTray(page, "the-sun");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    const firstPreviewCard = page
      .getByTestId("pack-open-preview-hand")
      .locator(".card")
      .first();
    await expect(firstPreviewCard).toBeVisible();
    await firstPreviewCard.click();
    await page.locator('[data-consumable-kind="tarot"]').first().click();
    await expect(
      page
        .getByTestId("pack-open-preview-hand")
        .locator(".card.card-suit-hearts"),
    ).toHaveCount(1);
  });

  test("using The Lovers on a selected Arcana-pack preview card applies the wild enhancement", async ({
    page,
  }) => {
    await forcePackPool(page, "arcana");
    await addTarotToTray(page, "the-lovers");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    const firstPreviewCard = page
      .getByTestId("pack-open-preview-hand")
      .locator(".card")
      .first();
    await expect(firstPreviewCard).toBeVisible();
    await firstPreviewCard.click();
    await page.locator('[data-consumable-kind="tarot"]').first().click();
    await expect(
      page
        .getByTestId("pack-open-preview-hand")
        .locator(".card.card-enhancement-wild"),
    ).toHaveCount(1);
  });

  test("Standard pack: picking a card increments the shop overlay deck pile count (closes #747)", async ({
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

test.describe("Consumables usable while a Standard pack is open (#821)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
  });

  test("Strength tarot applied to a hand card mid-Standard-pack consumes the tarot and keeps the modal open", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await addTarotToTray(page, "strength");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await expect(page.locator(HAND_CARDS).first()).toBeVisible();
    await page.locator(HAND_CARDS).first().click();
    await page.locator('[data-consumable-kind="tarot"]').first().click();
    await expect(
      page.locator('[data-consumable-kind="tarot"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
  });

  test("Black Hole spectral used mid-Standard-pack consumes the spectral and keeps the modal open", async ({
    page,
  }) => {
    await forcePackPool(page, "standard");
    await addSpectralToTray(page, "black-hole");
    await winRound1AndOpenShop(page);
    await buyFirstPackOffer(page);
    await page.locator('[data-consumable-kind="spectral"]').first().click();
    await expect(
      page.locator('[data-consumable-kind="spectral"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
  });
});
