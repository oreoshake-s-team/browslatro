import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
}

async function overrideBoss(page: Page, bossId: string): Promise<void> {
  await page
    .getByTestId("blind-select-boss-override")
    .selectOption({ value: bossId });
}

test.describe("Boss blinds on BlindSelectScreen (#698)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await startRound(page);
  });

  test("The Manacle (scoreMultiplier 2): description reads '-1 Hand Size.' and Boss Blind required reads 600 at ante 1", async ({
    page,
  }) => {
    await overrideBoss(page, "the-manacle");
    await expect(page.getByTestId("blind-select-boss-description")).toHaveText(
      "-1 Hand Size.",
    );
    await expect(page.getByTestId("blind-select-required-3")).toHaveText("600");
  });

  test("The Psychic description names the play-5-cards constraint", async ({
    page,
  }) => {
    await overrideBoss(page, "the-psychic");
    await expect(page.getByTestId("blind-select-boss-description")).toHaveText(
      "Play 5 cards or score 0.",
    );
  });

  test("The Club description names the clubs debuff", async ({ page }) => {
    await overrideBoss(page, "the-club");
    await expect(page.getByTestId("blind-select-boss-description")).toHaveText(
      "All Club cards are debuffed.",
    );
  });

  test("the override select includes ante-1-eligible bosses (The Manacle) but not anteMin-2 bosses (The Wall) at ante 1", async ({
    page,
  }) => {
    const select = page.getByTestId("blind-select-boss-override");
    await expect(select).toBeVisible();
    const options = await select
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(options).toContain("the-manacle");
    expect(options).not.toContain("the-wall");
  });
});
