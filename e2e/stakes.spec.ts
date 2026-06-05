import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function ensureModifierPanelOpen(page: Page): Promise<void> {
  const summary = page.getByText(/Apply modifiers/);
  const open = await summary
    .locator("xpath=ancestor::details[1]")
    .evaluate((el) => el.hasAttribute("open"));
  if (!open) await summary.click();
}

async function clickWin(page: Page): Promise<void> {
  await ensureModifierPanelOpen(page);
  await page.locator("button.win-button").click();
}

test.describe("Stake picker (#695)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
  });

  test("renders White / Red / Green / Black / Blue stake tiles; does not render Gold (still implemented:false)", async ({
    page,
  }) => {
    await expect(page.getByTestId("new-run-stake-white")).toBeVisible();
    await expect(page.getByTestId("new-run-stake-red")).toBeVisible();
    await expect(page.getByTestId("new-run-stake-green")).toBeVisible();
    await expect(page.getByTestId("new-run-stake-black")).toBeVisible();
    await expect(page.getByTestId("new-run-stake-blue")).toBeVisible();
    await expect(page.getByTestId("new-run-stake-gold")).toHaveCount(0);
  });
});

test.describe("Stake-derived deltas on BlindSelectScreen (#695)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
  });

  test("Red Stake: Small Blind payout is $0; Big Blind payout is still $4 (only Small is zeroed)", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-red").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-payout-1")).toHaveText("$0");
    await expect(page.getByTestId("blind-select-payout-2")).toHaveText("$4");
  });

  test("White Stake: Small Blind payout is $3 and Ante 1 Small Blind required is 300 (BASE_CHIPS[0])", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-white").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-payout-1")).toHaveText("$3");
    await expect(page.getByTestId("blind-select-required-1")).toHaveText("300");
  });

  test("Green Stake: Ante 1 Small Blind required is 300 (Green = White at ante 1)", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-green").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-required-1")).toHaveText("300");
  });

  test("Green Stake: after advancing to Ante 2, Small Blind required is 900 (GREEN_STAKE_CHIPS[1])", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-green").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await clickWin(page);
    await clickWin(page);
    await clickWin(page);
    await page.getByRole("button", { name: /Next Round/ }).click();
    await expect(page.getByTestId("blind-select-required-1")).toHaveText("900");
  });

  test("Blue Stake: starting Small Blind on Yellow Deck shows 2 discards (base 3 − 1) (#556)", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-blue").click();
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    const discardsStat = page
      .locator(".stat")
      .filter({ has: page.getByText("Discards", { exact: true }) })
      .locator(".stat-value");
    await expect(discardsStat).toHaveText("2");
  });

  test("NewRunScreen preview: Starting Discards updates live as stake/deck change (#737)", async ({
    page,
  }) => {
    const discardsPreview = page
      .getByTestId("new-run-preview-discards")
      .locator(".new-run-preview-value");
    await expect(discardsPreview).toHaveText("4");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await expect(discardsPreview).toHaveText("3");
    await page.getByTestId("new-run-stake-blue").click();
    await expect(discardsPreview).toHaveText("2");
    await page.getByTestId("new-run-stake-white").click();
    await expect(discardsPreview).toHaveText("3");
  });
});
