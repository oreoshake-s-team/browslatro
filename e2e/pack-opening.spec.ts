import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand$/;
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
  const detailsOpen = await summary
    .locator("xpath=ancestor::details[1]")
    .evaluate((el) => el.hasAttribute("open"));
  if (!detailsOpen) await summary.click();
}

async function forcePackPool(
  page: Page,
  pool: "standard" | "arcana" | "buffoon" | "spectral" | "celestial",
): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Force a Pack pool in next shop/);
  await page.getByTestId(`force-pack-${pool}`).click();
}

async function addTarotToTray(page: Page, tarotId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Tarot/);
  await page.locator(`button[data-tarot-id="${tarotId}"]`).click();
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
    await firstPreviewCard.click();
    const tarotTile = page.locator('[data-consumable-kind="tarot"]').first();
    await expect(tarotTile).toBeEnabled();
    await tarotTile.click();
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
    await firstPreviewCard.click();
    const tarotTile = page.locator('[data-consumable-kind="tarot"]').first();
    await expect(tarotTile).toBeEnabled();
    await tarotTile.click();
    await expect(
      page
        .getByTestId("pack-open-preview-hand")
        .locator(".card.card-enhancement-wild"),
    ).toHaveCount(1);
  });
});
