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
  await expect(page.getByTestId("shop-suggest")).toBeVisible();
}

test("suggesting a purchase and applying it buys the offer without logging human play", async ({
  page,
}) => {
  await page.route("**/api/advice", fulfillWithBuyAdvice);
  await openShop(page);
  await page.getByTestId("shop-suggest").click();
  await expect(page.getByTestId("suggestion-recommendation")).toContainText(
    "Buy",
  );
  await page.getByTestId("suggestion-apply").click();
  await expect(page.locator(".shop-offer-sold").first()).toBeVisible();
  await expect(page.getByTestId("suggestion-advice")).toHaveCount(0);
  const log = await page.evaluate(
    () => window.localStorage.getItem("browslatro.human-play-log.v1") ?? "",
  );
  expect(log).not.toContain('"kind":"purchase"');
});

test("the suggest button sits in the Next Round action row", async ({
  page,
}) => {
  await openShop(page);
  const row = page.locator(".shop-actions");
  await expect(row.getByTestId("shop-suggest")).toBeVisible();
  await expect(row.locator(".shop-next")).toBeVisible();
});

test("a rate-limited keyless player gets the key form inline", async ({
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
  await page.getByTestId("shop-suggest").click();
  await expect(page.getByTestId("suggestion-error")).toContainText("10 min");
  await expect(
    page.getByLabel("Your Anthropic API key"),
  ).toBeVisible();
});

test("ONNX policy shows a recommendation while the LLM is still loading", async ({
  page,
}) => {
  await page.route("**/api/advice", () => {/* never respond — keep loading state */});
  await openShop(page);
  await page.getByTestId("shop-suggest").click();
  await expect(page.getByTestId("suggestion-onnx")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("suggestion-onnx-recommendation")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("suggestion-onnx-recommendation")).not.toBeEmpty();
});
