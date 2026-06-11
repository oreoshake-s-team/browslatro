import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

const HAND_CARDS = '[aria-label="Your hand"] .card';

test("HUD counters and score preview are polite live regions that update after a discard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const handsStat = page.getByTestId("hands-stat");
  const discardsStat = page.getByTestId("discards-stat");
  const preview = page.locator('[role="status"].hand-score-announcement');
  await expect(handsStat).toHaveAttribute("aria-live", "polite");
  await expect(handsStat).toHaveAttribute("aria-atomic", "true");
  await expect(discardsStat).toHaveAttribute("aria-live", "polite");
  await expect(discardsStat).toHaveAttribute("aria-atomic", "true");
  await expect(preview).toHaveAttribute("aria-live", "polite");

  const before = await discardsStat.textContent();
  await page.locator(HAND_CARDS).first().click();
  await expect(preview).toHaveText(/[1-9]\d* chips × \d+ mult/);

  await page.getByRole("button", { name: /^Discard/ }).click();
  await expect(discardsStat).not.toHaveText(before ?? "");
  await expect(preview).toHaveText(/^0 chips × 0 mult$/);
});
