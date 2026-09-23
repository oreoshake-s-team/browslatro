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
    page.locator('[data-testid="hand-cards"] button[aria-pressed]').first(),
  ).toBeVisible();
}

test("hand label row reserves its space before any card is selected", async ({
  page,
}) => {
  await startRound(page);
  const row = page.getByTestId("hand-label-row");
  const box = await row.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(24);
});

test("selecting cards does not move the chips/mult pills in the sidebar", async ({
  page,
}) => {
  await startRound(page);
  const chips = page.getByTestId("hand-chips");
  const before = await chips.boundingBox();
  const cards = page.locator('[data-testid="hand-cards"] button[aria-pressed]');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByTestId("hand-label-row").getByRole("heading")).toBeVisible();
  const after = await chips.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
});

test("deselecting every card keeps the pills anchored while the label empties", async ({
  page,
}) => {
  await startRound(page);
  const chips = page.getByTestId("hand-chips");
  const cards = page.locator('[data-testid="hand-cards"] button[aria-pressed]');
  await cards.nth(0).click();
  await expect(page.getByTestId("hand-label-row").getByRole("heading")).toBeVisible();
  const before = await chips.boundingBox();
  await cards.nth(0).click();
  await expect(
    page.getByTestId("hand-label-row").getByRole("heading"),
  ).toBeHidden();
  const after = await chips.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
});
