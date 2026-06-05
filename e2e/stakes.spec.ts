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

  test("renders the White stake tile", async ({ page }) => {
    await expect(page.getByTestId("new-run-stake-white")).toBeVisible();
  });

  test("renders the Red stake tile", async ({ page }) => {
    await expect(page.getByTestId("new-run-stake-red")).toBeVisible();
  });

  test("renders the Green stake tile", async ({ page }) => {
    await expect(page.getByTestId("new-run-stake-green")).toBeVisible();
  });

  test("renders the Black stake tile (implemented in #555)", async ({ page }) => {
    await expect(page.getByTestId("new-run-stake-black")).toBeVisible();
  });

  test("does not render the Gold stake tile (negative — implemented:false)", async ({
    page,
  }) => {
    await expect(page.getByTestId("new-run-stake-gold")).toHaveCount(0);
  });
});

test.describe("Stake-derived deltas on BlindSelectScreen (#695)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
  });

  test("Red Stake: Small Blind payout is $0", async ({ page }) => {
    await page.getByTestId("new-run-stake-red").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-payout-1")).toHaveText("$0");
  });

  test("Red Stake: Big Blind payout is still $4 (negative — only Small is zeroed)", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-red").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-payout-2")).toHaveText("$4");
  });

  test("White Stake: Small Blind payout is $3 (regression baseline)", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-white").click();
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-payout-1")).toHaveText("$3");
  });

  test("White Stake: Ante 1 Small Blind required is 300 (BASE_CHIPS[0])", async ({
    page,
  }) => {
    await page.getByTestId("new-run-stake-white").click();
    await page.getByTestId("new-run-confirm").click();
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
});
