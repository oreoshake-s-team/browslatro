import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
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

async function startRoundWithJokers(
  page: Page,
  jokerIds: ReadonlyArray<string>,
): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  for (const id of jokerIds) {
    await addJokerById(page, id);
  }
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS).first()).toBeVisible();
}

async function jokerOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid^="joker-tile-filled-"]')
    .evaluateAll((els) =>
      els.map(
        (el) =>
          el.getAttribute("data-testid")?.replace("joker-tile-filled-", "") ??
          "",
      ),
    );
}

test.beforeEach(async ({ page }) => {
  await setDeterministic(page);
});

test("keyboard-only reorder of jokers announces the move (issue #909)", async ({
  page,
}) => {
  await startRoundWithJokers(page, ["blueprint", "plus-four-mult"]);
  await expect.poll(() => jokerOrder(page)).toEqual([
    "blueprint",
    "plus-four-mult",
  ]);
  await page.getByTestId("joker-tile-filled-blueprint").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("joker-move-left-blueprint")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("joker-move-right-blueprint")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => jokerOrder(page)).toEqual([
    "plus-four-mult",
    "blueprint",
  ]);
  await expect(page.getByTestId("live-announcer")).toHaveText(
    "Blueprint moved to position 2 of 2",
  );
});

test("keyboard-only sell of a joker announces the sale (issue #909)", async ({
  page,
}) => {
  await startRoundWithJokers(page, ["blueprint", "plus-four-mult"]);
  const sellButton = page.getByTestId("joker-sell-plus-four-mult");
  await sellButton.focus();
  await expect(sellButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("joker-tile-filled-plus-four-mult"),
  ).toHaveCount(0);
  await expect(page.getByTestId("live-announcer")).toHaveText(
    /^Sold \+4 Mult for \$\d+$/,
  );
});

test("mouse drag reordering of jokers still works (issue #909)", async ({
  page,
}) => {
  await startRoundWithJokers(page, ["blueprint", "plus-four-mult"]);
  const source = page.getByTestId("joker-tile-filled-blueprint");
  const lastGap = page.getByTestId("joker-gap-2");
  await source.dragTo(lastGap);
  await expect.poll(() => jokerOrder(page)).toEqual([
    "plus-four-mult",
    "blueprint",
  ]);
});

test("shift-click sell of a joker still works (issue #909)", async ({
  page,
}) => {
  await startRoundWithJokers(page, ["blueprint", "plus-four-mult"]);
  await page
    .getByTestId("joker-tile-filled-plus-four-mult")
    .click({ modifiers: ["Shift"] });
  await expect(
    page.getByTestId("joker-tile-filled-plus-four-mult"),
  ).toHaveCount(0);
});
