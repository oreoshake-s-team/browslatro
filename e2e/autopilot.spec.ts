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

test("autopilot plays the round without user input", async ({ page }) => {
  await startRound(page);
  const hands = page.getByTestId("hands-stat");
  const discards = page.getByTestId("discards-stat");
  const handsBefore = await hands.textContent();
  const discardsBefore = await discards.textContent();

  const toggle = page.getByRole("button", { name: /Autopilot/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await expect(async () => {
    const handsNow = await hands.textContent().catch(() => null);
    const discardsNow = await discards.textContent().catch(() => null);
    expect(
      handsNow !== handsBefore || discardsNow !== discardsBefore,
    ).toBe(true);
  }).toPass({ timeout: 30_000 });
});

test("autopilot can be switched off", async ({ page }) => {
  await startRound(page);
  const toggle = page.getByRole("button", { name: /Autopilot/ });
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});
