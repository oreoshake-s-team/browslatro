import { test, expect, type Page, type Route } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:forceSkipTagIds", "investment");
  });
});

async function fulfillWithSkip(route: Route): Promise<void> {
  await route.fulfill({
    json: {
      advice: {
        recommendationIndex: 1,
        alternativeIndex: 0,
        whyAlternativeWorse: "The payout is small and the boss is manageable.",
        explanation: "The tag outweighs the blind's payout here.",
        concept: "Skip cheap blinds for compounding rewards.",
      },
    },
  });
}

async function openBlindSelect(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
}

test("asking whether the skip is worth it and applying the skip grants the tag without logging human play", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithSkip);
  await openBlindSelect(page);
  await page.getByTestId("blind-suggest").click();
  await expect(page.getByTestId("suggestion-recommendation")).toContainText(
    "Skip it for the",
  );
  await page.getByTestId("suggestion-apply").click();
  await expect(
    page.locator('[data-tag-id="investment"]').first(),
  ).toBeVisible();
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).not.toContain('"kind":"blind-skip"');
});

test("the suggest button is absent on the boss blind", async ({ page }) => {
  await page.route("**/api/advice", fulfillWithSkip);
  await openBlindSelect(page);
  await page.getByTestId("blind-select-skip").click();
  await page.getByTestId("blind-select-skip").click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
  await expect(page.getByTestId("blind-suggest")).toHaveCount(0);
});
