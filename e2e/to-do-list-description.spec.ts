import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  await expect(summary).toBeVisible();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await expect(details).toHaveAttribute("open", "");
}

async function addJokerById(page: Page, jokerId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Joker/);
  const prev = page.getByTestId("modifier-joker-picker-prev");
  while (!(await prev.isDisabled())) {
    await prev.dispatchEvent("click");
  }
  const tile = page.locator(`button[data-joker-id="${jokerId}"]`);
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await expect(tile).toBeVisible();
  await tile.dispatchEvent("click");
}

test("To Do List tile and tooltip show the current target hand after entering a blind", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "to-do-list");
  await page.getByTestId("blind-select-play").click();

  const HAND_CARDS = '[data-testid="hand-cards"] .card';
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const todoHand = await page.evaluate(() => {
    const raw = window.localStorage.getItem("browslatro:run:v1");
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as { state: { todoHand?: string } };
    return snapshot.state.todoHand ?? null;
  });
  expect(todoHand).not.toBeNull();

  const tile = page.getByTestId("joker-tile-filled-to-do-list");

  const tileDesc = page.getByTestId("joker-tile-description-to-do-list");
  await expect(tileDesc).toContainText(`Currently: ${todoHand}`);

  await tile.hover();
  const tooltipDesc = page.getByTestId("joker-tooltip-description");
  await expect(tooltipDesc).toContainText(`Currently: ${todoHand}`);
});

test("To Do List tile shows ??? placeholder before any blind is entered (negative)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "to-do-list");

  const tileDesc = page.getByTestId("joker-tile-description-to-do-list");
  await expect(tileDesc).toContainText("Currently: ???");
});
