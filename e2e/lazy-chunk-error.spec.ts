import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function selectAndSubmitStraightFlush(page: Page): Promise<void> {
  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
}

test("shows reload prompt when the RoundWonModal chunk responds with text/html", async ({
  page,
}) => {
  await page.route(/RoundWonModal.*\.js(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html></html>",
    });
  });
  page.on("pageerror", () => {});

  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await selectAndSubmitStraightFlush(page);

  await expect(page.getByTestId("lazy-chunk-error")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveAccessibleName(
    "A new version is available",
  );
  await expect(page.getByTestId("lazy-chunk-error-reload")).toBeVisible();
});

test("RoundWonModal still loads normally when the chunk is not intercepted", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await selectAndSubmitStraightFlush(page);

  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();
  await expect(page.getByTestId("lazy-chunk-error")).toHaveCount(0);
});
