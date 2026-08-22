import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
  await expect(
    page.locator('[data-testid="hand-cards"] [data-suit]').first(),
  ).toBeVisible();
}

async function documentScrollOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight,
  );
}

test.describe("iPad landscape", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("the page and the sidebar both fit the viewport without vertical scrolling", async ({
    page,
  }) => {
    await startRound(page);
    expect(await documentScrollOverflow(page)).toBeLessThanOrEqual(0);
    const sidebarOverflow = await page
      .locator('[data-testid="sidebar"]')
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(sidebarOverflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole("link", { name: /GitHub/ })).toBeInViewport();
  });
});

test.describe("iPad portrait", () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test("the dealt hand fans to fit beside the deck without horizontal scrolling", async ({
    page,
  }) => {
    await startRound(page);
    const handOverflow = await page
      .locator('[data-testid="hand-cards"]')
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(handOverflow).toBeLessThanOrEqual(1);
    const container = await page
      .locator('[data-testid="hand-cards"]')
      .boundingBox();
    const slots = await page
      .locator('[data-testid^="hand-slot-"]')
      .evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().right),
      );
    expect(container).not.toBeNull();
    expect(slots).toHaveLength(8);
    for (const right of slots) {
      expect(right).toBeLessThanOrEqual(container!.x + container!.width + 1);
    }
  });

  test("the page does not scroll vertically", async ({ page }) => {
    await startRound(page);
    expect(await documentScrollOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("negative: desktop keeps non-overlapping hand cards", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("hand slots do not overlap at desktop width", async ({ page }) => {
    await startRound(page);
    const slots = await page
      .locator('[data-testid^="hand-slot-"]')
      .evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      );
    expect(slots.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < slots.length; i += 1) {
      expect(slots[i].left).toBeGreaterThanOrEqual(slots[i - 1].right - 1);
    }
  });
});
