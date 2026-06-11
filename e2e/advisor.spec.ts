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

const ADVICE_BODY = {
  advice: {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "The alternative gives up tempo for no payoff.",
    explanation: "Coach says: take the strongest engine-vetted line.",
    concept: "Bank guaranteed score before chasing draws.",
  },
};

async function preferWalkthrough(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:advisor-verbosity", "full");
  });
}

test("the advisor defaults to just the move without touching the API", async ({
  page,
}) => {
  let adviceCalls = 0;
  await page.route("**/api/advice", (route) => {
    adviceCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADVICE_BODY),
    });
  });
  await startRound(page);
  await page.getByRole("button", { name: /Advisor/ }).click();
  await expect(page.getByTestId("advisor-move-only")).toBeVisible();
  expect(adviceCalls).toBe(0);
});

test("the advisor panel shows the coach's explanation", async ({ page }) => {
  await preferWalkthrough(page);
  await page.route("**/api/advice", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADVICE_BODY),
    }),
  );
  await startRound(page);
  await page.getByRole("button", { name: /Advisor/ }).click();
  const panel = page.getByTestId("advisor-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("aria-modal", "true");
  await expect(
    panel.getByText("Coach says: take the strongest engine-vetted line."),
  ).toBeVisible();
  await expect(
    panel.getByText("Bank guaranteed score before chasing draws."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(panel).not.toBeVisible();
});

test("the advisor degrades to the engine suggestion when the API is unavailable", async ({
  page,
}) => {
  await preferWalkthrough(page);
  await page.route("**/api/advice", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "not_configured" }),
    }),
  );
  await startRound(page);
  await page.getByRole("button", { name: /Advisor/ }).click();
  const degraded = page.getByTestId("advisor-degraded");
  await expect(degraded).toBeVisible();
  await expect(degraded).toContainText("engine's top-ranked move");
});

test("just-the-move verbosity skips the API and persists", async ({ page }) => {
  await preferWalkthrough(page);
  let adviceCalls = 0;
  await page.route("**/api/advice", (route) => {
    adviceCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADVICE_BODY),
    });
  });
  await startRound(page);
  await page.getByRole("button", { name: /Advisor/ }).click();
  await expect(
    page.getByText("Coach says: take the strongest engine-vetted line."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Just the move" }).click();
  await expect(page.getByTestId("advisor-move-only")).toBeVisible();
  const callsAfterToggle = adviceCalls;
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: /Advisor/ }).click();
  await expect(page.getByTestId("advisor-move-only")).toBeVisible();
  expect(adviceCalls).toBe(callsAfterToggle);
});
