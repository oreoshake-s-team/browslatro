import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;

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

async function playFiveCardHand(page: Page): Promise<void> {
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
}

test.describe("Copy jokers fire in scoring (#858)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
  });

  test("Blueprint left of +4 Mult copies it into the scoring trace", async ({
    page,
  }) => {
    await addJokerById(page, "blueprint");
    await addJokerById(page, "plus-four-mult");
    await playFiveCardHand(page);
    await expect(
      page.locator(".scoring-trace__item", { hasText: "Blueprint" }).first(),
    ).toBeVisible();
  });

  test("Brainstorm right of +4 Mult copies the leftmost joker into the scoring trace", async ({
    page,
  }) => {
    await addJokerById(page, "plus-four-mult");
    await addJokerById(page, "brainstorm");
    await playFiveCardHand(page);
    await expect(
      page.locator(".scoring-trace__item", { hasText: "Brainstorm" }).first(),
    ).toBeVisible();
  });
});
