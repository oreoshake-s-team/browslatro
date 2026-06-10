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

async function reachShop(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:bootShop", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
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

test.describe("Shop vouchers (#699)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("voucher row is visible; overriding to Grabber renames the tile; buying Grabber deducts money", async ({
    page,
  }) => {
    await reachShop(page);
    await expect(page.getByTestId("shop-voucher")).toBeVisible();
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: "grabber" });
    await expect(page.getByTestId("shop-voucher-0")).toContainText("Grabber");
    const before = await moneyOf(page);
    await page.getByTestId("shop-voucher-buy-0").click();
    const after = await moneyOf(page);
    expect(before - after).toBeGreaterThan(0);
  });

  test("Nacho Tong is locked behind Grabber (negative — requires-prereq disables buy)", async ({
    page,
  }) => {
    await reachShop(page);
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: "nacho-tong" });
    await expect(page.getByTestId("shop-voucher-buy-0")).toBeDisabled();
  });

  test("after buying Grabber, the next round's HUD shows +1 Hands (persistence)", async ({
    page,
  }) => {
    await reachShop(page);
    const handsBefore = Number(
      (await statValue(page, "Hands").textContent()) ?? "0",
    );
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: "grabber" });
    await page.getByTestId("shop-voucher-buy-0").click();
    await page.getByRole("button", { name: /Next Round/ }).click();
    const handsAfter = Number(
      (await statValue(page, "Hands").textContent()) ?? "0",
    );
    expect(handsAfter).toBe(handsBefore + 1);
  });
});

test.describe("Telescope + Observatory vouchers (#281)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  async function buyVoucherInShop(page: Page, voucherId: string): Promise<void> {
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: voucherId });
    await page.getByTestId("shop-voucher-buy-0").click();
  }

  async function nextRound(page: Page): Promise<void> {
    await page.getByRole("button", { name: /Next Round/ }).click();
    await page.getByTestId("blind-select-play").click();
  }

  test("Observatory is locked behind Telescope (negative — requires-prereq disables buy)", async ({
    page,
  }) => {
    await reachShop(page);
    await page
      .getByTestId("shop-voucher-override")
      .selectOption({ value: "observatory" });
    await expect(page.getByTestId("shop-voucher-buy-0")).toBeDisabled();
  });

  test("after buying Telescope + Observatory and holding Pluto, playing High Card emits an Observatory ×1.5 Mult trace entry", async ({
    page,
  }) => {
    await reachShop(page);
    await buyVoucherInShop(page, "telescope");
    await nextRound(page);
    await clickWin(page);
    await clickWin(page);
    await clickWin(page);
    await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
    await buyVoucherInShop(page, "observatory");
    await nextRound(page);

    await ensureModifierPanelOpen(page);
    await page.getByText(/Add a specific Planet/).click();
    await page.locator('button[data-planet-id="pluto"]').first().click();

    const cards = page.locator('[aria-label="Your hand"] .card');
    await cards.first().click();
    await page.getByRole("button", { name: /^Submit Hand/ }).click();

    await expect(page.locator(".scoring-trace")).toContainText(
      /×1\.5 Mult \(Observatory: 1 matching Planet\)/,
    );
  });
});
