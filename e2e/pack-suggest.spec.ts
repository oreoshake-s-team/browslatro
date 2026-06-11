import { test, expect, type Page, type Route } from "@playwright/test";

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

async function openPackFromShop(page: Page): Promise<void> {
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
  await expect(page.getByTestId("pack-suggest")).toBeVisible();
}

test("the suggest button sits in the Skip action row", async ({ page }) => {
  await openPackFromShop(page);
  const row = page.locator(".pack-open-actions");
  await expect(row.getByTestId("pack-suggest")).toBeVisible();
  await expect(row.getByTestId("pack-open-close")).toBeVisible();
});

test("suggesting a pack pick and applying it takes the option without logging human play", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithFirstPick);
  await openPackFromShop(page);
  const optionsBefore = await page.locator(".pack-open-option").count();
  await page.getByTestId("pack-suggest").click();
  await expect(page.getByTestId("suggestion-recommendation")).toContainText(
    "Pick",
  );
  await page.getByTestId("suggestion-apply").click();
  await expect(page.locator(".pack-open-option")).not.toHaveCount(
    optionsBefore,
    { timeout: 10_000 },
  );
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).not.toContain('"kind":"pack-pick"');
});
