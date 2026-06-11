import { test, expect, type Page, type Route } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
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
    .locator('[data-offer-kind="pack"] .shop-offer-buy')
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
  await page.getByTestId("pack-suggest").click();
  await expect(page.getByTestId("suggestion-recommendation")).toContainText(
    "Pick",
  );
  await page.getByTestId("suggestion-apply").click();
  await expect(page.getByTestId("pack-open-subtitle")).toHaveCount(0);
  await expect(page.getByTestId("shop-suggest")).toBeVisible();
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).not.toContain('"kind":"pack-pick"');
});
