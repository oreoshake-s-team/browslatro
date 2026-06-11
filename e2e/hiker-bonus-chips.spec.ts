import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;

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

async function makeNextHandWinTheRound(page: Page): Promise<void> {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("browslatro:run:v1");
    if (!raw) throw new Error("expected a saved snapshot");
    const snapshot = JSON.parse(raw) as { state: { roundScore?: number } };
    snapshot.state.roundScore = 1_000_000;
    window.localStorage.setItem("browslatro:run:v1", JSON.stringify(snapshot));
  });
  await page.reload();
}

test("a card scored with Hiker shows its bonus chips in the tooltip next round", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "hiker");
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await makeNextHandWinTheRound(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const firstCard = page.locator(HAND_CARDS).first();
  const playedRank = await firstCard.locator(".card-rank").first().textContent();
  await firstCard.click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();

  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const upgraded = page.locator(HAND_CARDS).first();
  await expect(upgraded.locator(".card-rank").first()).toHaveText(
    playedRank ?? "",
  );
  await upgraded.hover();
  await expect(page.getByTestId("card-tooltip-bonus-chips")).toHaveText(
    "+5 extra Chips",
  );
});

test("a card scored without Hiker shows no bonus-chips tooltip row (negative)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await makeNextHandWinTheRound(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await page.locator(HAND_CARDS).first().click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();

  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await page.locator(HAND_CARDS).first().hover();
  await expect(page.locator(".card-tooltip")).toBeVisible();
  await expect(
    page.getByTestId("card-tooltip-bonus-chips"),
  ).not.toBeVisible();
});
