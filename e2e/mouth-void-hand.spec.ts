import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:devTools", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function reachMouthRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await page.getByText("Apply modifiers").click();
  await page.getByRole("button", { name: "Ante +1" }).click();
  await page.getByText(/Win/).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await page
    .getByTestId("blind-select-boss-override")
    .selectOption("the-mouth");
  await page.getByTestId("blind-select-play").click();
  await page.getByText(/Win/).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await expect(
    page.getByRole("heading", { name: "The Mouth" }),
  ).toBeVisible();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

test("The Mouth submits a non-matching hand, scores it 0, and shows a void toast", async ({
  page,
}) => {
  await reachMouthRound(page);

  await page.locator(HAND_CARDS).nth(7).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await expect(page.locator(".round-score-value")).toHaveText("7");
  await expect(
    page.locator('[data-testid="hand-cards"] .card-discarding'),
  ).toHaveCount(0);

  for (let i = 0; i < 5; i += 1) await page.locator(HAND_CARDS).nth(i).click();
  await expect(page.getByRole("button", { name: SUBMIT_BUTTON })).toBeEnabled();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();

  await expect(page.getByTestId("boss-effect-toast")).toContainText(
    "scored 0",
  );
  await expect(page.locator(".scoring-trace__scroll")).toContainText("voided");
  await expect(page.locator(".round-score-value")).toHaveText("7");
});
