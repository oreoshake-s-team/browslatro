import { test, expect, type Page } from "@playwright/test";

const SHOP_HEADING = /Shop/;

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function forcePackPool(
  page: Page,
  pool: "arcana" | "spectral",
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:forcePackPool", value);
  }, pool);
}

async function forcePackTarots(
  page: Page,
  ids: ReadonlyArray<string>,
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:forcePackTarotIds", value);
  }, ids.join(","));
}

async function forcePackSpectrals(
  page: Page,
  ids: ReadonlyArray<string>,
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:forcePackSpectralIds", value);
  }, ids.join(","));
}

async function forcePackVariant(
  page: Page,
  variant: "normal" | "mega",
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:forcePackVariant", value);
  }, variant);
}

async function winRound1AndOpenShop(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
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

async function setupArcanaPackWith(
  page: Page,
  tarotIds: ReadonlyArray<string>,
  variant: "normal" | "mega" = "normal",
): Promise<void> {
  await setDeterministic(page);
  await forcePackTarots(page, tarotIds);
  await forcePackVariant(page, variant);
  await forcePackPool(page, "arcana");
  await winRound1AndOpenShop(page);
  await buyFirstPackOffer(page);
}

async function setupSpectralPackWith(
  page: Page,
  spectralIds: ReadonlyArray<string>,
): Promise<void> {
  await setDeterministic(page);
  await forcePackSpectrals(page, spectralIds);
  await forcePackVariant(page, "normal");
  await forcePackPool(page, "spectral");
  await winRound1AndOpenShop(page);
  await buyFirstPackOffer(page);
}

function pickButton(page: Page, idx: number) {
  return page.getByTestId(`pack-open-pick-${idx}`);
}

// Effect-by-effect pack-pick coverage lives in
// src/hooks/useOpenedPackPicker.test.tsx; these journeys prove the browser
// wiring for the three pick target modes (#931).
test.describe("Pack-pick wiring (#850, #931)", () => {
  test("preview-target: The Sun converts a selected preview card to hearts", async ({
    page,
  }) => {
    await setupArcanaPackWith(page, ["the-sun", "the-hermit"], "mega");
    const heartCards = page
      .getByTestId("pack-open-preview-hand")
      .locator(".card.card-suit-hearts");
    const before = await heartCards.count();
    const previewCard = page
      .getByTestId("pack-open-preview-hand")
      .locator(".card")
      .first();
    await previewCard.click();
    await pickButton(page, 0).click();
    await expect(heartCards).toHaveCount(before + 1);
  });

  test("tray-fallthrough: Aura lands in the consumable tray when no preview card is selected", async ({
    page,
  }) => {
    await setupSpectralPackWith(page, ["aura"]);
    await pickButton(page, 0).click();
    await expect(
      page.locator('[data-consumable-kind="spectral"]'),
    ).toHaveCount(1);
  });

  test("no-target: Black Hole fires on pick and consumes the option", async ({
    page,
  }) => {
    await setupSpectralPackWith(page, ["black-hole"]);
    await pickButton(page, 0).click();
    await expect(page.getByTestId("pack-open-subtitle")).toBeHidden();
  });
});
