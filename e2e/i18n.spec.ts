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
  await page.getByRole("button", { name: /Options|Nā koho/ }).click();
  await page.getByTestId("options-language").selectOption(locale);
  await page
    .locator(".modal .options-button")
    .last()
    .click();
}

test("switching to Hawaiian translates the sidebar (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.getByText("Nā lima", { exact: true })).toBeVisible();
  await expect(page.getByText("Money", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("the Hawaiian locale persists across a reload (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("switching back to English restores the English sidebar (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await switchLanguage(page, "en");
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await expect(page.getByText("Kālā", { exact: true })).toHaveCount(0);
});

test("the shop renders Hawaiian strings under the haw locale (issue #921)", async ({
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
  ).toHaveText(/Kūʻai mai|Wehe|Ua kūʻai ʻia|Slots full/);
  await expect(page.getByRole("heading", { name: /^Shop$/ })).toHaveCount(0);
});

test("winning round 1 under the haw locale shows Hawaiian Round Won strings (issue #922)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:locale", "haw");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
  });
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  const handCards = page.locator('[aria-label="Your hand"] .card');
  await expect(handCards).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await handCards.nth(i).click();
  }
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await expect(page.getByText("Kālā i loaʻa")).toBeVisible();
  await expect(page.getByText("Huina")).toBeVisible();
  await page.getByRole("button", { name: "Hoʻomau →" }).click();
  await expect(page.getByRole("heading", { name: /Hale kūʻai/ })).toBeVisible();
});
