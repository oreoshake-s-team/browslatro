import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:devTools", "1");
  });
});

async function reachBossBlindSelect(page: Page): Promise<void> {
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
    .selectOption("the-house");
  await page.getByTestId("blind-select-play").click();
  await page.getByText(/Win/).click();
  await page.getByRole("button", { name: /Next Round/ }).click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
}

test("a fully face-down hand shows the no-suggestion state instead of a proposal", async ({
  page,
}) => {
  await reachBossBlindSelect(page);
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(".card.card--face-down").first()).toBeVisible();
  await page.getByRole("button", { name: "Suggest" }).click();
  await expect(page.getByTestId("autopilot-no-suggestion")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: /Approve move/ }),
  ).toHaveCount(0);
});
