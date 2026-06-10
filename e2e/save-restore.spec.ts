import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function selectAndSubmitStraightFlush(page: Page): Promise<void> {
  const cards = page.locator(HAND_CARDS);
  for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
}

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

test("refreshing mid-round preserves the hand, money, and ante from localStorage", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  const handBefore = await page.locator(HAND_CARDS).evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") ?? ""),
  );
  const moneyBefore = await statValue(page, "Money").textContent();
  const anteBefore = await statValue(page, "Ante").textContent();

  await page.reload();

  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  const handAfter = await page.locator(HAND_CARDS).evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") ?? ""),
  );
  expect(handAfter).toEqual(handBefore);
  await expect(statValue(page, "Money")).toHaveText(moneyBefore ?? "");
  await expect(statValue(page, "Ante")).toHaveText(anteBefore ?? "");
});

test("refreshing after winning a round restores the round-won modal", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await selectAndSubmitStraightFlush(page);
  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: /Round Won!/ })).toBeVisible();
});

test("refreshing after dismissing the round-won modal restores the shop", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
});

test("no stored snapshot still boots into the New Run select screen", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    window.localStorage.removeItem("browslatro:run:v1");
  });
  await page.goto("/");
  await expect(page.getByTestId("new-run-confirm")).toBeVisible();
});

test("refreshing on Blind Select preserves the boss and skip-tag offers", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  const bossRowBefore = await page
    .getByTestId("blind-select-row-3")
    .textContent();

  await page.reload();

  const bossRowAfter = await page
    .getByTestId("blind-select-row-3")
    .textContent();
  expect(bossRowAfter).toBe(bossRowBefore);
});

test("Start Run over a restored stale run fully resets ante, round, and scoring trace (issue #870)", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  await page.evaluate(() => {
    const raw = window.localStorage.getItem("browslatro:run:v1");
    if (!raw) throw new Error("expected a saved snapshot");
    const snapshot = JSON.parse(raw) as { state: Record<string, unknown> };
    snapshot.state.ante = 9;
    snapshot.state.round = 27;
    snapshot.state.endlessMode = true;
    snapshot.state.pendingRunSelect = true;
    snapshot.state.scoringEvents = [
      { kind: "chips-delta", amount: 10, source: "stale" },
    ];
    window.localStorage.setItem("browslatro:run:v1", JSON.stringify(snapshot));
  });
  await page.reload();

  await expect(page.getByTestId("new-run-confirm")).toBeVisible();
  await page.getByTestId("new-run-confirm").click();

  await expect(page.getByTestId("blind-select-play")).toBeVisible();
  await expect(statValue(page, "Ante")).toHaveText("1");
  await expect(statValue(page, "Round")).toHaveText("1");
  await expect(page.locator(".scoring-trace")).not.toContainText("stale");
});

test("refreshing in the shop preserves the offered voucher", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBlindSelect(page);
  await selectAndSubmitStraightFlush(page);
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
  const voucherBefore = await page
    .locator(".shop-voucher-name")
    .first()
    .textContent();

  await page.reload();

  await expect(page.getByRole("heading", { name: /Shop/ })).toBeVisible();
  const voucherAfter = await page
    .locator(".shop-voucher-name")
    .first()
    .textContent();
  expect(voucherAfter).toBe(voucherBefore);
});
