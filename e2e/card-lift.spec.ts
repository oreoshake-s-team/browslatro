import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await expect(
    page.locator('[data-testid="hand-cards"] .card').first(),
  ).toBeVisible();
}

test("selecting a hand card lifts it out of the row", async ({
  page,
}) => {
  await startRound(page);
  const card = page.locator('[data-testid="hand-cards"] .card').first();
  const before = await card.boundingBox();
  await card.click();
  await expect(card).toHaveClass(/card--selected/);
  await page.mouse.move(0, 0);
  await expect
    .poll(async () => {
      const after = await card.boundingBox();
      return before!.y - after!.y;
    })
    .toBeGreaterThan(8);
});

test("deselecting a card returns it to the row", async ({
  page,
}) => {
  await startRound(page);
  const card = page.locator('[data-testid="hand-cards"] .card').first();
  const before = await card.boundingBox();
  await card.click();
  await expect(card).toHaveClass(/card--selected/);
  await card.click();
  await expect(card).not.toHaveClass(/card--selected/);
  await page.mouse.move(0, 0);
  await expect
    .poll(async () => {
      const after = await card.boundingBox();
      return Math.abs(after!.y - before!.y);
    })
    .toBeLessThan(2);
});

test("empty joker and consumable trays render with the muted empty treatment", async ({
  page,
}) => {
  await startRound(page);
  await expect(page.locator(".jokers")).toHaveClass(/jokers-tray-empty/);
  await expect(page.locator(".consumables")).toHaveClass(
    /consumables-tray-empty/,
  );
});
