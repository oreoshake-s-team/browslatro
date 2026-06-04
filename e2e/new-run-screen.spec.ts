import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

test.describe("New-run screen — deck selection (#561, #562, #564)", () => {
  test("the picker shows the Red Deck (#562) and Yellow Deck (#564) tiles", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("new-run-deck-red-deck")).toBeVisible();
    await expect(page.getByTestId("new-run-deck-yellow-deck")).toBeVisible();
  });

  test("Yellow Deck starts the run with $14 (+$10 over the $4 baseline)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$14");
  });

  test("Red Deck (default) starts the run with $4 (no money bonus, negative)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Money")).toHaveText("$4");
  });

  test("Red Deck starts the round with 4 discards (+1 over the 3 baseline)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Discards")).toHaveText("4");
  });

  test("Yellow Deck does not bump starting discards (negative)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("new-run-deck-yellow-deck").click();
    await page.getByTestId("new-run-confirm").click();
    await page.getByTestId("blind-select-play").click();
    await expect(statValue(page, "Discards")).toHaveText("3");
  });
});
