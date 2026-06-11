import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

const HAND_CARDS = '[aria-label="Your hand"] .card';

test("a discard records a decision the dev menu can clear", async ({ page }) => {
  await startRound(page);
  await page.locator(HAND_CARDS).first().click();
  await page.getByRole("button", { name: /^Discard/ }).click();
  await page.getByText("Apply modifiers").click();
  const count = page.getByTestId("human-play-log-count");
  await expect(count).toHaveText("1 recorded decision");
  await page.getByRole("button", { name: /Clear log/ }).click();
  await expect(count).toHaveText("0 recorded decisions");
});

test("the dev menu exports recorded decisions as JSONL", async ({ page }) => {
  await startRound(page);
  await page.locator(HAND_CARDS).first().click();
  await page.getByRole("button", { name: /^Discard/ }).click();
  await page.getByText("Apply modifiers").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export log/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("browslatro-human-play.jsonl");
});
