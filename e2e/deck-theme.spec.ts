import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRun(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

test("the app shell exposes the chosen deck and tints the deck pile with its color", async ({
  page,
}) => {
  await startRun(page);
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-deck",
    "red-deck",
  );
  const deckPile = page.getByTestId("deck-pile");
  await expect(deckPile).toBeVisible();
  const background = await deckPile.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(background).toBe("rgb(224, 49, 49)");
});
