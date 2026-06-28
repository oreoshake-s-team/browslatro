import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function switchLanguage(page: Page, locale: string): Promise<void> {
  await page.getByRole("button", { name: /Options|Nā Koho/ }).click();
  await page.getByTestId("options-language").selectOption(locale);
  await page.locator(".options-footer .btn--secondary").click();
}

test("switching to Hawaiian translates the sidebar", async ({
  page,
}) => {
  await startRound(page);
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.getByText("Nā Haʻawina Pepa", { exact: true })).toBeVisible();
  await expect(page.getByText("Money", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("the Hawaiian locale persists across a reload", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("switching back to English restores the English sidebar", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await switchLanguage(page, "en");
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await expect(page.getByText("Kālā", { exact: true })).toHaveCount(0);
});

test("the shop renders Hawaiian strings under the haw locale", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:locale", "haw");
    window.localStorage.setItem("browslatro:bootShop", "1");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hale kūʻai/ }),
  ).toBeVisible();
  await expect(
    page.locator(".shop-offer-buy").first(),
  ).toHaveText(/Kūʻai no|Wehe|Ua kūʻai ʻia|Slots full/);
  await expect(page.getByRole("heading", { name: /^Shop$/ })).toHaveCount(0);
});

test("a Celestial pack under the haw locale shows Hawaiian planet names", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:locale", "haw");
    window.localStorage.setItem("browslatro:bootShop", "1");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:forcePackPool", "celestial");
    window.localStorage.setItem("browslatro:forcePackPlanetIds", "mercury");
  });
  await page.goto("/");
  const packOffer = page
    .locator(".shop-packs .shop-offer[data-offer-kind='pack']")
    .first();
  await packOffer.locator("button.shop-offer-buy").click();
  await expect(page.getByTestId("pack-open-subtitle")).toBeVisible();
  await expect(
    page
      .locator(".pack-open-option-name")
      .filter({ hasText: /ʻUkali/ })
      .first(),
  ).toBeVisible();
});

test("winning round 1 under the haw locale shows Hawaiian Round Won strings", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:locale", "haw");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
  });
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  const handCards = page.locator('[data-testid="hand-cards"] .card');
  await expect(handCards).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await handCards.nth(i).click();
  }
  await page.getByRole("button", { name: /^Hoʻoholo Haʻawina/ }).click();
  await expect(page.getByText("Kālā i loaʻa")).toBeVisible();
  await expect(page.getByText("Huinanui")).toBeVisible();
  await page.getByRole("button", { name: "Hoʻomau →" }).click();
  await expect(page.getByRole("heading", { name: /Hale kūʻai/ })).toBeVisible();
});

test("aria-labels are translated under the haw locale", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:locale", "haw");
  });
  await startRound(page);
  await expect(page.getByTestId("hand-cards")).toHaveAttribute(
    "aria-label",
    "Kāu haʻawina",
  );
  await expect(page.getByTestId("jokers-tray")).toHaveAttribute(
    "aria-label",
    "Nā Kiʻi Pepa i hoʻokomo ʻia",
  );
  await expect(page.getByTestId("consumables-tray")).toHaveAttribute(
    "aria-label",
    "Nā hakahaka kemu",
  );
  await expect(page.getByTestId("deck-pile")).toHaveAttribute(
    "aria-label",
    /^Pūʻulu kāleka \(\d+ kāleka i koe\)$/,
  );
  await expect(page.locator('[aria-label="Your hand"]')).toHaveCount(0);
});
