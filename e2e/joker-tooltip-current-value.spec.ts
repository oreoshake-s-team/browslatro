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
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await expect(details).toHaveAttribute("open", "");
}

async function addJokerById(page: Page, jokerId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Joker/);
  const prev = page.getByTestId("modifier-joker-picker-prev");
  while (!(await prev.isDisabled())) {
    await prev.dispatchEvent("click");
  }
  const tile = page.locator(`button[data-joker-id="${jokerId}"]`);
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await expect(tile).toBeVisible();
  await tile.dispatchEvent("click");
}

async function winRound1IntoShop(page: Page): Promise<void> {
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
}

async function hoveredCurrentValue(page: Page, jokerId: string) {
  const tile = page.getByTestId(`joker-tile-filled-${jokerId}`);
  await tile.hover();
  const row = page.getByTestId("joker-tooltip-current-value");
  await expect(row).toBeVisible();
  return row;
}

test.describe("Joker tooltip current scaling value (#884)", () => {
  test("Flash Card tooltip shows +0 Mult before and +2 Mult after a shop reroll", async ({
    page,
  }) => {
    await setDeterministic(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await addJokerById(page, "flash-card");
    await winRound1IntoShop(page);

    await expect(await hoveredCurrentValue(page, "flash-card")).toHaveText(
      "Currently: +0 Mult",
    );
    await page.mouse.move(0, 0);
    await expect(
      page.getByTestId("joker-tooltip-current-value"),
    ).toBeHidden();

    await page.locator("button.shop-reroll").click();
    await expect(await hoveredCurrentValue(page, "flash-card")).toHaveText(
      "Currently: +2 Mult",
    );
  });
});
