import { test, expect, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRun(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function expectDialogCycle(
  page: Page,
  trigger: Locator,
  dialogName: string,
): Promise<void> {
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const focusInside = await page.evaluate(() =>
    Boolean(document.activeElement?.closest('[role="dialog"]')),
  );
  expect(focusInside).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

test.describe("Options, DeckPile, DiscardPile dialog semantics (#912)", () => {
  test("each modal opens as a labelled dialog with focus inside and restores focus to its trigger on Escape", async ({
    page,
  }) => {
    await startRun(page);
    await expectDialogCycle(
      page,
      page.getByRole("button", { name: "Options", exact: true }),
      "Options",
    );
    await expectDialogCycle(
      page,
      page.getByRole("button", { name: /^Deck \(/ }),
      "Remaining Cards",
    );
  });
});
