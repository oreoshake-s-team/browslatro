import { test, expect, type Page, type Route } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

async function fulfillWithAdvice(route: Route): Promise<void> {
  await route.fulfill({
    json: {
      advice: {
        recommendationIndex: 0,
        alternativeIndex: 1,
        whyAlternativeWorse: "The discard throws away a made hand.",
        explanation: "Play the pair to bank guaranteed chips.",
        concept: "Lock in value before chasing draws.",
      },
    },
  });
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:fakeAutopilotPolicy", "1");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
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
  const roundScore = page.locator(".round-score-value");
  await expect(roundScore).toHaveText("0");

  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const approve = page.getByRole("button", { name: /Approve move/ });
  await expect(approve).toBeVisible({ timeout: 10_000 });

  // The proposal is pending — it must not execute until approved.
  await expect(roundScore).toHaveText("0");

  await approve.click();
  // Approving plays the proposed hand, which scores.
  await expect(roundScore).not.toHaveText("0", { timeout: 10_000 });
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
  await expect(stop).toBeVisible({ timeout: 10_000 });
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

test("downvoting an AI explanation with a corrective pick records advice feedback", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithAdvice);
  await startRound(page);

  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();
  await expect(page.getByRole("button", { name: /Approve move/ })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: /Ask the AI/ }).click();
  const badPick = page.getByTestId("advice-feedback-open");
  await expect(badPick).toBeVisible({ timeout: 10_000 });
  await badPick.click();

  await page.getByTestId("advice-feedback-option-1").click();
  await page.getByTestId("advice-feedback-submit").click();

  await expect(page.getByTestId("advice-feedback-recorded")).toBeVisible();
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).toContain('"kind":"advice-feedback"');
  expect(log).toContain('"advisorKind":"llm"');
  expect(log).toContain('"correctedIndex":1');
});

test("a pending suggestion fills the Submit Hand preview and sidebar hand score", async ({
  page,
}) => {
  await startRound(page);
  const toggle = page.getByRole("button", { name: "Suggest" });
  await toggle.click();

  const approve = page.getByRole("button", { name: /Approve move/ });
  await expect(approve).toBeVisible({ timeout: 10_000 });

  await expect(page.getByTestId("submit-hand-detected")).toBeVisible();
  await expect(page.locator(".hand-score .chips")).not.toHaveText("0");
  await expect(page.locator(".hand-score .multiplier")).not.toHaveText("0");
});
