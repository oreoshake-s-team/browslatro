import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const NEXT_ROUND_BUTTON = /Next Round/;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  await expect(summary).toBeVisible();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await expect(details).toHaveAttribute("open", "");
}

test("Cryptid copies persist into the shop deck and the next round", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Spectral/);
  await page
    .locator('button[data-spectral-id="cryptid"]')
    .dispatchEvent("click");
  await expect(page.locator('[data-consumable-kind="spectral"]')).toHaveCount(1);

  await page.locator(HAND_CARDS).nth(7).click();
  await page.locator('[data-consumable-kind="spectral"]').click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(10);

  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();

  await expect(page.locator(".deck-pile-count")).toHaveText("54");

  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(page.locator(".deck-pile-count")).toHaveText("46");
});
