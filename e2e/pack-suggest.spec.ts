import { test, expect, type Locator, type Page, type Route } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:forcePackPool", "celestial");
    window.localStorage.setItem("browslatro:forcePackVariant", "normal");
  });
});

async function fulfillWithFirstPick(route: Route): Promise<void> {
  const body = route.request().postDataJSON() as {
    candidates: ReadonlyArray<{ action: string }>;
  };
  await route.fulfill({
    json: {
      advice: {
        recommendationIndex: 0,
        alternativeIndex: body.candidates.length - 1,
        whyAlternativeWorse: "Skipping wastes the pack you already paid for.",
        explanation: "This option helps your run the most right now.",
        concept: "Take value from packs you opened.",
      },
    },
  });
}

function packModal(page: Page): Locator {
  return page.locator(".pack-open-modal");
}

async function openPackFromShop(page: Page): Promise<Locator> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await page.getByText("Apply modifiers").click();
  await page.getByText(/Win/).click();
  await page
    .locator('[data-pack-pool="celestial"] .shop-offer-buy:not([disabled])')
    .first()
    .click();
  const modal = packModal(page);
  await expect(modal.getByTestId("coach-trigger")).toBeVisible();
  return modal;
}

async function revealCoachPick(modal: Locator): Promise<void> {
  await modal.getByTestId("coach-trigger").click();
  await expect(modal.getByTestId("coach-recommendation")).toBeVisible({
    timeout: 10_000,
  });
}

test("the pack offers a Coach tip trigger and no panel by default", async ({
  page,
}) => {
  const modal = await openPackFromShop(page);
  await expect(modal.getByTestId("coach-advice")).toHaveCount(0);
});

test("revealing then getting the coach pick shows a recommendation", async ({
  page,
}) => {
  const modal = await openPackFromShop(page);
  await revealCoachPick(modal);
  await expect(modal.getByTestId("coach-recommendation")).not.toBeEmpty();
});

test("a keyless player sees the rate-limited Ask AI affordance", async ({
  page,
}) => {
  const modal = await openPackFromShop(page);
  await revealCoachPick(modal);
  await expect(modal.getByTestId("coach-ask-ai")).toContainText("rate-limited");
});

test("asking the AI annotates the coach pick with a verdict", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithFirstPick);
  const modal = await openPackFromShop(page);
  await revealCoachPick(modal);
  await modal.getByTestId("coach-ask-ai").click();
  await expect(modal.getByTestId("coach-ai-verdict")).toBeVisible({
    timeout: 10_000,
  });
});

test("dismissing collapses the panel back to the Coach tip trigger", async ({
  page,
}) => {
  const modal = await openPackFromShop(page);
  await revealCoachPick(modal);
  await modal.getByTestId("coach-dismiss").click();
  await expect(modal.getByTestId("coach-advice")).toHaveCount(0);
  await expect(modal.getByTestId("coach-trigger")).toBeVisible();
});
