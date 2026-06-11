import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

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

test("autopilot proposes a move and plays it after approval", async ({
  page,
}) => {
  await startRound(page);
  const hands = page.getByTestId("hands-stat");
  const discards = page.getByTestId("discards-stat");
  const handsBefore = await hands.textContent();
  const discardsBefore = await discards.textContent();

  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const approve = page.getByRole("button", { name: /Approve move/ });
  await expect(approve).toBeVisible({ timeout: 30_000 });

  const handsNow = await hands.textContent();
  const discardsNow = await discards.textContent();
  expect(handsNow === handsBefore && discardsNow === discardsBefore).toBe(true);

  await expect(async () => {
    if (await approve.isVisible().catch(() => false)) {
      await approve.click();
    }
    const handsAfter = await hands.textContent().catch(() => null);
    const discardsAfter = await discards.textContent().catch(() => null);
    expect(
      handsAfter !== handsBefore || discardsAfter !== discardsBefore,
    ).toBe(true);
  }).toPass({ timeout: 30_000 });
});

test("autopilot stops without executing the proposed move", async ({
  page,
}) => {
  await startRound(page);
  const hands = page.getByTestId("hands-stat");
  const discards = page.getByTestId("discards-stat");
  const handsBefore = await hands.textContent();
  const discardsBefore = await discards.textContent();

  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();

  const stop = page.getByRole("button", { name: /Stop suggesting/ });
  await expect(stop).toBeVisible({ timeout: 30_000 });
  await stop.click();

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await hands.textContent()).toBe(handsBefore);
  expect(await discards.textContent()).toBe(discardsBefore);
});

test("autopilot can be switched off", async ({ page }) => {
  await startRound(page);
  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("a pending suggestion fills the Submit Hand preview and sidebar hand score", async ({
  page,
}) => {
  await startRound(page);
  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();

  const approve = page.getByRole("button", { name: /Approve move/ });
  await expect(approve).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId("submit-hand-detected")).toBeVisible();
  await expect(page.locator(".hand-score .chips")).not.toHaveText("0");
  await expect(page.locator(".hand-score .multiplier")).not.toHaveText("0");
});
