import { test, expect, type Page, type Route } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

interface AdviceCandidate {
  readonly action: string;
  readonly item?: { readonly itemType: string; readonly name: string };
}

async function fulfillWithBuyAdvice(route: Route): Promise<void> {
  const body = route.request().postDataJSON() as {
    candidates: ReadonlyArray<AdviceCandidate>;
  };
  const buyIdx = body.candidates.findIndex(
    (candidate) =>
      candidate.action === "buy" && candidate.item?.itemType !== "pack",
  );
  const recommendationIndex = buyIdx >= 0 ? buyIdx : 0;
  const alternativeIndex =
    recommendationIndex === body.candidates.length - 1
      ? 0
      : body.candidates.length - 1;
  await route.fulfill({
    json: {
      advice: {
        recommendationIndex,
        alternativeIndex,
        whyAlternativeWorse: "Leaving banks nothing this ante.",
        explanation: "This purchase strengthens your scoring engine now.",
        concept: "Buy engine pieces early.",
      },
    },
  });
}

async function openShop(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await page.getByText("Apply modifiers").click();
  await page.getByText(/Win/).click();
  await expect(page.getByTestId("coach-trigger")).toBeVisible();
}

async function revealCoachPick(page: Page): Promise<void> {
  await page.getByTestId("coach-trigger").click();
  await expect(page.getByTestId("coach-recommendation")).toBeVisible({
    timeout: 10_000,
  });
}

test("the shop offers a Coach tip trigger and no panel by default", async ({
  page,
}) => {
  await openShop(page);
  await expect(page.getByTestId("coach-advice")).toHaveCount(0);
});

test("revealing then getting the coach pick shows a recommendation", async ({
  page,
}) => {
  await openShop(page);
  await revealCoachPick(page);
  await expect(page.getByTestId("coach-recommendation")).not.toBeEmpty();
});

test("a keyless player sees the rate-limited Ask AI affordance", async ({
  page,
}) => {
  await openShop(page);
  await revealCoachPick(page);
  await expect(page.getByTestId("coach-ask-ai")).toContainText("rate-limited");
});

test("asking the AI annotates the coach pick with a verdict", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithBuyAdvice);
  await openShop(page);
  await revealCoachPick(page);
  await page.getByTestId("coach-ask-ai").click();
  await expect(page.getByTestId("coach-ai-verdict")).toBeVisible({
    timeout: 10_000,
  });
});

test("a rate-limited keyless player gets the key form inline after asking the AI", async ({
  page,
}) => {
  await page.route("**/api/advice", (route) =>
    route.fulfill({
      status: 429,
      headers: { "retry-after": "600" },
      json: { error: "rate_limited" },
    }),
  );
  await openShop(page);
  await revealCoachPick(page);
  await page.getByTestId("coach-ask-ai").click();
  await expect(page.getByTestId("coach-ai-error")).toContainText("10 min");
  await expect(page.getByLabel("Your Anthropic API key")).toBeVisible();
});

test("dismissing collapses the panel back to the Coach tip trigger", async ({
  page,
}) => {
  await openShop(page);
  await revealCoachPick(page);
  await page.getByTestId("coach-dismiss").click();
  await expect(page.getByTestId("coach-advice")).toHaveCount(0);
  await expect(page.getByTestId("coach-trigger")).toBeVisible();
});

test("committing a different shop action than the coach records auto-disagreement", async ({
  page,
}) => {
  await openShop(page);
  const addMoney = page.locator(".add-money-button");
  for (let i = 0; i < 4; i += 1) await addMoney.click();
  await revealCoachPick(page);

  const rec = (await page.getByTestId("coach-recommendation").textContent()) ?? "";
  if (rec.includes("Leave")) {
    await page.locator(".shop-reroll").click();
  } else {
    await page.getByRole("button", { name: /Next Round/ }).click();
  }

  await expect
    .poll(async () =>
      page.evaluate(
        () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
      ),
    )
    .toContain('"source":"auto-disagreement"');
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).toContain('"context":"shop"');
});

test("agreeing with the coach pick records a good policy verdict", async ({
  page,
}) => {
  await openShop(page);
  await revealCoachPick(page);

  await page.getByTestId("advice-feedback-agree").click();

  await expect
    .poll(async () =>
      page.evaluate(
        () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
      ),
    )
    .toContain('"verdict":"good"');
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).toContain('"source":"explicit"');
  expect(log).toContain('"context":"shop"');
});

test("downvoting the coach pick records policy advice feedback", async ({
  page,
}) => {
  await openShop(page);
  await revealCoachPick(page);

  await page.getByTestId("advice-feedback-open").click();
  await page.getByTestId("advice-feedback-just-bad").click();

  await expect(page.getByTestId("coach-advice")).toHaveCount(0);
  await expect(page.getByTestId("coach-feedback-recorded")).toBeVisible();

  await expect
    .poll(async () =>
      page.evaluate(
        () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
      ),
    )
    .toContain('"advisorKind":"policy"');
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).toContain('"context":"shop"');
});
