import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  const detailsOpen = await summary
    .locator("xpath=ancestor::details[1]")
    .evaluate((el) => el.hasAttribute("open"));
  if (!detailsOpen) await summary.click();
}

test.describe("Modifier Joker Picker (#748)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await openDetails(page, /Apply modifiers/);
    await openDetails(page, /Add a specific Joker/);
  });

  test("first page renders 12 tiles and Prev is disabled", async ({ page }) => {
    await expect(page.locator("button[data-joker-id]")).toHaveCount(12);
    await expect(
      page.getByTestId("modifier-joker-picker-prev"),
    ).toBeDisabled();
  });

  test("Next advances to page 2 and updates the page label", async ({
    page,
  }) => {
    await page.getByTestId("modifier-joker-picker-next").click();
    await expect(
      page.getByTestId("modifier-joker-picker-page-label"),
    ).toHaveText(/Page 2 \/ \d+/);
  });

  test("clicking a tile adds the joker to the player's equipped jokers", async ({
    page,
  }) => {
    const firstTile = page.locator("button[data-joker-id]").first();
    const jokerId = await firstTile.getAttribute("data-joker-id");
    if (!jokerId) throw new Error("first tile has no data-joker-id");
    await firstTile.click();
    await expect(
      page.getByTestId(`joker-tile-filled-${jokerId}`),
    ).toBeVisible();
  });
});
