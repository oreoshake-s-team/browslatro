import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const DECK_COUNT = ".deck-pile-count";

async function startRunAndDealHand(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
}

async function restartViaOptions(page: Page): Promise<void> {
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("button", { name: "New game" }).click();
}

test.describe("New run clears lingering board state (closes #851)", () => {
  test("restarting mid-round leaves no previous hand or drawn-down deck behind the New-Run screen", async ({
    page,
  }) => {
    await startRunAndDealHand(page);
    await expect(page.locator(HAND_CARDS)).toHaveCount(8);
    await expect(page.locator(DECK_COUNT).first()).toHaveText("44");

    await restartViaOptions(page);

    await expect(page.getByTestId("new-run-confirm")).toBeVisible();
    await expect(page.locator(HAND_CARDS)).toHaveCount(0);
    await expect(page.locator(DECK_COUNT).first()).toHaveText("52");
  });
});
