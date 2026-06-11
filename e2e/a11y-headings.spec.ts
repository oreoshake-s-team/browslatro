import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[data-testid="hand-cards"] .card';

async function expectHeadingRulesPass(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withRules(["page-has-heading-one", "heading-order"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function startRun(page: Page): Promise<void> {
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

async function winRound(page: Page): Promise<void> {
  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: /^Submit Hand/ }).click();
  await expect(
    page.getByRole("heading", { name: /Round Won!/ }),
  ).toBeVisible();
}

test("main menu has a single sr-only h1 and passes axe heading rules", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("new-run-confirm")).toBeVisible();
  await expect(page.locator("[data-seo-shell]")).toHaveCount(0);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText("Browslatro — Main menu");
  await expectHeadingRulesPass(page);
});

test("gameplay surface switches the h1 to run-in-progress and passes axe heading rules", async ({
  page,
}) => {
  await page.goto("/");
  await startRun(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Browslatro — Run in progress",
  );
  await expectHeadingRulesPass(page);
});

test("round-won surface passes axe heading rules", async ({ page }) => {
  await page.goto("/");
  await startRun(page);
  await winRound(page);
  await expectHeadingRulesPass(page);
});

test("shop surface passes axe heading rules", async ({ page }) => {
  await page.goto("/");
  await startRun(page);
  await winRound(page);
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
  await expectHeadingRulesPass(page);
});
