import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function ensureModifierPanelOpen(page: Page): Promise<void> {
  const summary = page.getByText(/Apply modifiers/);
  const open = await summary
    .locator("xpath=ancestor::details[1]")
    .evaluate((el) => el.hasAttribute("open"));
  if (!open) await summary.click();
}

async function clickWin(page: Page): Promise<void> {
  await ensureModifierPanelOpen(page);
  await page.getByRole("button", { name: "Win", exact: true }).click();
}

// Single-screen stake math (payouts, required chips, the live New Run
// preview) is covered by NewRunScreen.test.tsx, BlindSelectScreen.test.tsx,
// items/stakes.test.ts, and scoring/anteScaling.test.ts; this journey keeps
// the only multi-round behavior — Green Stake scaling kicking in at ante 2.
test("Green Stake: after advancing to Ante 2, Small Blind required is 900 (GREEN_STAKE_CHIPS[1])", async ({
  page,
}) => {
  await setDeterministic(page);
  await page.goto("/");
  await page.getByTestId("new-run-stake-green").click();
  await page.getByTestId("new-run-confirm").click();
  await expect(page.getByTestId("blind-select-required-1")).toHaveText("300");
  await page.getByTestId("blind-select-play").click();
  await clickWin(page);
  await clickWin(page);
  await clickWin(page);
  await page.getByRole("button", { name: /Next Round/ }).click();
  await expect(page.getByTestId("blind-select-required-1")).toHaveText("900");
});
