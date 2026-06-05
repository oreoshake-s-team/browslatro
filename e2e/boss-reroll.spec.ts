import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:forceSkipTagIds", "investment");
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

async function addMoney(page: Page, times: number): Promise<void> {
  await ensureModifierPanelOpen(page);
  for (let i = 0; i < times; i += 1) {
    await page.locator("button.add-money-button").click();
  }
}

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(".stat-label", { hasText: label }) })
    .locator(".stat-value");
}

async function moneyOf(page: Page): Promise<number> {
  const txt = await statValue(page, "Money").textContent();
  return Number((txt ?? "$0").replace(/[^0-9-]/g, ""));
}

async function reachShop(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await clickWin(page);
  await clickWin(page);
  await clickWin(page);
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
}

async function buyDirectorsCutAndAdvanceToBossBlindSelect(
  page: Page,
): Promise<void> {
  await reachShop(page);
  await page
    .getByTestId("shop-voucher-override")
    .selectOption({ value: "directors-cut" });
  await page.getByTestId("shop-voucher-buy-0").click();
  await addMoney(page, 4);
  await page.getByRole("button", { name: /Next Round/ }).click();
  await page.getByTestId("blind-select-skip").click();
  await page.getByTestId("blind-select-skip").click();
  await expect(page.getByTestId("blind-select-row-3")).toHaveAttribute(
    "data-blind-state",
    "current",
  );
}

test.describe("Director's Cut boss reroll (#280)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("renders the Reroll Boss button on the Boss row when owned", async ({
    page,
  }) => {
    await buyDirectorsCutAndAdvanceToBossBlindSelect(page);
    await expect(
      page.getByTestId("blind-select-boss-reroll"),
    ).toBeVisible();
  });

  test("clicking Reroll Boss deducts $10 from the player's money", async ({
    page,
  }) => {
    await buyDirectorsCutAndAdvanceToBossBlindSelect(page);
    const before = await moneyOf(page);
    await page.getByTestId("blind-select-boss-reroll").click();
    expect(await moneyOf(page)).toBe(before - 10);
  });

  test("clicking Reroll Boss replaces the boss displayed on the row", async ({
    page,
  }) => {
    await buyDirectorsCutAndAdvanceToBossBlindSelect(page);
    const before = await page
      .getByTestId("blind-select-boss-description")
      .textContent();
    await page.getByTestId("blind-select-boss-reroll").click();
    const after = await page
      .getByTestId("blind-select-boss-description")
      .textContent();
    expect(after).not.toBe(before);
  });

  test("after one reroll the button no longer renders (directors-cut limits to 1/ante)", async ({
    page,
  }) => {
    await buyDirectorsCutAndAdvanceToBossBlindSelect(page);
    await page.getByTestId("blind-select-boss-reroll").click();
    await expect(
      page.getByTestId("blind-select-boss-reroll"),
    ).toHaveCount(0);
  });

  test("the Reroll Boss button is not rendered when no reroll voucher is owned (negative)", async ({
    page,
  }) => {
    await reachShop(page);
    await page.getByRole("button", { name: /Next Round/ }).click();
    await page.getByTestId("blind-select-skip").click();
    await page.getByTestId("blind-select-skip").click();
    await expect(
      page.getByTestId("blind-select-boss-reroll"),
    ).toHaveCount(0);
  });

  test("the player can preview-reroll the Boss from the Small Blind row (any-blind)", async ({
    page,
  }) => {
    await reachShop(page);
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: "directors-cut" });
    await page.getByTestId("shop-voucher-buy-0").click();
    await addMoney(page, 4);
    await page.getByRole("button", { name: /Next Round/ }).click();
    await expect(page.getByTestId("blind-select-row-1")).toHaveAttribute(
      "data-blind-state",
      "current",
    );
    const before = await page
      .getByTestId("blind-select-boss-description")
      .textContent();
    await page.getByTestId("blind-select-boss-reroll").click();
    const after = await page
      .getByTestId("blind-select-boss-description")
      .textContent();
    expect(after).not.toBe(before);
  });
});
