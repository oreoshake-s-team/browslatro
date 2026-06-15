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

test("the blind offers a Coach tip trigger and no panel by default", async ({
  page,
}) => {
  await openBlindSelect(page);
  await expect(page.getByTestId("coach-trigger")).toBeVisible();
  await expect(page.getByTestId("coach-advice")).toHaveCount(0);
});

test("clicking the Coach tip trigger reveals the local coach recommendation", async ({
  page,
}) => {
  await openBlindSelect(page);
  await page.getByTestId("coach-trigger").click();
  await expect(page.getByTestId("coach-recommendation")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("coach-recommendation")).not.toBeEmpty();
});

test("a keyless player sees the rate-limited Ask AI affordance", async ({
  page,
}) => {
  await openBlindSelect(page);
  await page.getByTestId("coach-trigger").click();
  await expect(page.getByTestId("coach-ask-ai")).toContainText("rate-limited");
});

test("asking the AI annotates the coach pick with a verdict", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithSkip);
  await openBlindSelect(page);
  await page.getByTestId("coach-trigger").click();
  await expect(page.getByTestId("coach-recommendation")).toBeVisible({
    timeout: 10_000,
  });
  await page.getByTestId("coach-ask-ai").click();
  await expect(page.getByTestId("coach-ai-verdict")).toBeVisible({
    timeout: 10_000,
  });
});

test("dismissing collapses the panel back to the Coach tip trigger", async ({
  page,
}) => {
  await openBlindSelect(page);
  await page.getByTestId("coach-trigger").click();
  await expect(page.getByTestId("coach-recommendation")).toBeVisible({
    timeout: 10_000,
  });
  await page.getByTestId("coach-dismiss").click();
  await expect(page.getByTestId("coach-advice")).toHaveCount(0);
  await expect(page.getByTestId("coach-trigger")).toBeVisible();
});

test("the Coach tip trigger is absent on the boss blind", async ({ page }) => {
  await openBlindSelect(page);
  await page.getByTestId("blind-select-skip").click();
  await page.getByTestId("blind-select-skip").click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
  await expect(page.getByTestId("coach-trigger")).toHaveCount(0);
});
