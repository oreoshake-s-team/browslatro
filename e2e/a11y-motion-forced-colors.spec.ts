import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const RED_SUIT_COLOR = "rgb(201, 42, 42)";
const BLACK_SUIT_COLOR = "rgb(33, 37, 41)";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

async function transitionSeconds(
  page: Page,
  selector: string,
): Promise<number> {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible();
  const durations = await target.evaluate(
    (el) => getComputedStyle(el).transitionDuration,
  );
  return Math.max(...durations.split(",").map((value) => parseFloat(value)));
}

test.describe("reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("hand card transitions collapse to 0s", async ({ page }) => {
    await startRound(page);
    expect(await transitionSeconds(page, HAND_CARDS)).toBe(0);
  });

  test("new run deck tile transition collapses to 0s", async ({ page }) => {
    await page.goto("/");
    expect(await transitionSeconds(page, ".new-run-deck-tile")).toBe(0);
    await page.screenshot({
      path: test.info().outputPath("reduced-motion-new-run.png"),
    });
  });

  test("shop offer fade transition collapses to 0s", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("browslatro:bootShop", "1");
    });
    await page.goto("/");
    expect(await transitionSeconds(page, ".shop-offer")).toBe(0);
  });
});

test.describe("default motion", () => {
  test("negative: deck tile keeps its 120ms transition without reduced motion", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await transitionSeconds(page, ".new-run-deck-tile")).toBeCloseTo(
      0.12,
    );
  });
});

test.describe("forced colors", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
  });

  test("suits stay distinguishable and selection and focus stay visible", async ({
    page,
  }) => {
    await startRound(page);
    const firstCard = page.locator(HAND_CARDS).first();
    expect(
      await firstCard.evaluate((el) => getComputedStyle(el).forcedColorAdjust),
    ).toBe("none");
    const cards = await page.locator(HAND_CARDS).evaluateAll((els) =>
      els.map((el) => ({
        isRed: el.className.includes("card-red"),
        color: getComputedStyle(el).color,
      })),
    );
    for (const card of cards) {
      expect(card.color).toBe(card.isRed ? RED_SUIT_COLOR : BLACK_SUIT_COLOR);
    }
    await firstCard.click();
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    const outline = await firstCard.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style).toBe("solid");
    expect(outline.width).toBe("2px");
    const focusRing = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--focus-ring")
        .trim(),
    );
    expect(focusRing).toBe("Highlight");
    await page.screenshot({
      path: test.info().outputPath("forced-colors-hand.png"),
    });
  });

  test("negative: the focus ring token keeps its default color without forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: null });
    await page.goto("/");
    const focusRing = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--focus-ring")
        .trim(),
    );
    expect(focusRing).toBe("#74c0fc");
  });
});
