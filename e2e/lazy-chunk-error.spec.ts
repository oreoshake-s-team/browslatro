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

test("auto-reloads when the RoundWonModal chunk responds with text/html", async ({
  page,
}) => {
  let chunkRequestCount = 0;
  await page.route(/RoundWonModal.*\.js(\?.*)?$/, async (route) => {
    chunkRequestCount += 1;
    if (chunkRequestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html></html>",
      });
    } else {
      await route.continue();
    }
  });
  page.on("pageerror", () => {});

  const loadEvents: number[] = [];
  page.on("load", () => loadEvents.push(Date.now()));

  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const initialLoadCount = loadEvents.length;
  await selectAndSubmitStraightFlush(page);

  await expect.poll(() => loadEvents.length).toBeGreaterThan(initialLoadCount);
});

test("RoundWonModal still loads normally when the chunk is not intercepted", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await selectAndSubmitStraightFlush(page);

  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();
});
