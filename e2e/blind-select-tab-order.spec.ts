import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function openBlindSelect(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await expect(page.getByTestId("blind-select-play")).toBeVisible();
}

test.describe("BlindSelect tab order", () => {
  test("Tab cycles Play → Skip → Play with no tooltip or dev-override stops in between", async ({
    page,
  }) => {
    await openBlindSelect(page);
    // The skip-reward preview is on screen but must not be a tab stop.
    await expect(
      page.getByTestId("blind-select-row-skip-reward-1"),
    ).toBeVisible();
    await expect(page.getByTestId("blind-select-play")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("blind-select-skip")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("blind-select-play")).toBeFocused();
  });

  test("the dev boss override is absent from production builds (negative)", async ({
    page,
  }) => {
    await openBlindSelect(page);
    await expect(page.getByTestId("blind-select-boss-override")).toHaveCount(0);
  });

  test("the dev boss override returns when the browslatro:devTools seam is set", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("browslatro:devTools", "1");
    });
    await openBlindSelect(page);
    await expect(
      page.getByTestId("blind-select-boss-override"),
    ).toBeVisible();
  });
});
