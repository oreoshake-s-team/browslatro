import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function addTarotToTray(page: Page, tarotId: string): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("browslatro:seedTarotIds", value);
  }, tarotId);
}

// Effect-by-effect in-hand tarot coverage (destroy, rank-up, convert,
// copy, money, no-op guards) lives in src/hooks/useConsumableActions.test.tsx;
// this journey only proves the select-card → click-tarot wiring.
test("The Sun: selecting a hand card and clicking the tarot converts it to hearts and consumes the tile", async ({
  page,
}) => {
  await setDeterministic(page);
  await addTarotToTray(page, "the-sun");
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await page.locator(HAND_CARDS).first().click();
  await page.locator('[data-consumable-kind="tarot"]').first().click();
  await expect(
    page.locator(`${HAND_CARDS}.card-suit-hearts`).first(),
  ).toBeVisible();
  await expect(page.locator('[data-consumable-kind="tarot"]')).toHaveCount(0);
});
