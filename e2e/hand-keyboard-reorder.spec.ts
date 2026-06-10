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

async function handLabels(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="hand-cards"] .card')
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
}

test("keyboard-only reorder of two adjacent cards announces the move (issue #908)", async ({
  page,
}) => {
  await startRound(page);
  const before = await handLabels(page);
  await page.locator('[data-testid="hand-cards"] .card').nth(1).focus();
  await page.keyboard.press("Tab");
  const moveLeft = page.getByRole("button", { name: `Move ${before[1]} left` });
  await expect(moveLeft).toBeFocused();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await handLabels(page)).slice(0, 2))
    .toEqual([before[1], before[0]]);
  await expect(page.getByTestId("live-announcer")).toHaveText(
    `${before[1]} moved to position 1 of ${before.length}`,
  );
  expect((await handLabels(page)).slice(2)).toEqual(before.slice(2));
});

test("mouse drag reordering still works after the keyboard controls (issue #908)", async ({
  page,
}) => {
  await startRound(page);
  const before = await handLabels(page);
  const firstCard = page.locator('[data-testid="hand-cards"] .card').first();
  const lastGap = page.getByTestId(`hand-gap-${before.length}`);
  await firstCard.dragTo(lastGap);
  await expect
    .poll(async () => (await handLabels(page)).at(-1))
    .toBe(before[0]);
});
