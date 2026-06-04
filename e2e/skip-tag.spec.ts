import { test, expect, type Page } from "@playwright/test";

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function forceSkipTag(page: Page, tagId: string): Promise<void> {
  await page.addInitScript((id) => {
    window.localStorage.setItem("browslatro:forceSkipTagIds", id);
  }, tagId);
}

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
}

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(".stat-label", { hasText: label }) })
    .locator(".stat-value");
}

async function moneyOf(page: Page): Promise<number> {
  const txt = await statValue(page, "Money").textContent();
  return Number((txt ?? "$0").replace(/[^0-9-]/g, ""));
}

test.describe("Skip-tag flow (#697)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("skipping the Small Blind advances the current blind to Big", async ({
    page,
  }) => {
    await startRound(page);
    await page.getByTestId("blind-select-skip").click();
    await expect(page.getByTestId("blind-select-row-2")).toHaveAttribute(
      "data-blind-state",
      "current",
    );
  });

  test("skipping the Big Blind advances the current blind to Boss", async ({
    page,
  }) => {
    await startRound(page);
    await page.getByTestId("blind-select-skip").click();
    await page.getByTestId("blind-select-skip").click();
    await expect(page.getByTestId("blind-select-row-3")).toHaveAttribute(
      "data-blind-state",
      "current",
    );
  });

  test("the Boss Blind does not render a Skip button (negative)", async ({
    page,
  }) => {
    await startRound(page);
    await page.getByTestId("blind-select-skip").click();
    await page.getByTestId("blind-select-skip").click();
    await expect(page.getByTestId("blind-select-skip")).toHaveCount(0);
  });

  test("the Small Blind row renders a skip-reward tag tile", async ({
    page,
  }) => {
    await startRound(page);
    await expect(
      page.getByTestId("blind-select-row-skip-reward-1"),
    ).toBeVisible();
  });

  test("forcing the Economy Tag and skipping Small Blind doubles the player's money", async ({
    page,
  }) => {
    await forceSkipTag(page, "economy");
    await startRound(page);
    const before = await moneyOf(page);
    await page.getByTestId("blind-select-skip").click();
    const after = await moneyOf(page);
    expect(after).toBe(before * 2);
  });
});
