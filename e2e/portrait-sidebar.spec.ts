import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 480, height: 900 } });

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
  await expect(page.locator('[data-testid="hand-cards"] .card').first()).toBeVisible();
}

test("portrait: blind, round score, and chips×mult stack in one column", async ({
  page,
}) => {
  await startRound(page);
  const roundInfo = await page.locator(".round-info").boundingBox();
  const roundScore = await page.locator(".round-score").boundingBox();
  const handScore = await page.locator(".hand-score").boundingBox();
  expect(roundInfo).not.toBeNull();
  expect(roundScore).not.toBeNull();
  expect(handScore).not.toBeNull();
  expect(Math.round(roundScore!.x)).toBe(Math.round(roundInfo!.x));
  expect(Math.round(handScore!.x)).toBe(Math.round(roundInfo!.x));
  expect(roundScore!.y).toBeGreaterThan(roundInfo!.y);
  expect(handScore!.y).toBeGreaterThan(roundScore!.y);
});

test("portrait: Run info and Options are compact and sit above the stacked stats", async ({
  page,
}) => {
  await startRound(page);
  const runInfo = await page
    .getByRole("button", { name: "Run info" })
    .boundingBox();
  const options = await page
    .getByRole("button", { name: "Options" })
    .boundingBox();
  const help = await page
    .getByRole("button", { name: "Help" })
    .boundingBox();
  const stats = await page.locator(".progress").boundingBox();
  const handsStat = await page.locator(".round-progress > .stat").first().boundingBox();
  expect(runInfo).not.toBeNull();
  expect(options).not.toBeNull();
  expect(help).not.toBeNull();
  expect(stats).not.toBeNull();
  expect(handsStat).not.toBeNull();
  expect(runInfo!.height).toBeLessThan(40);
  expect(Math.round(options!.y)).toBe(Math.round(runInfo!.y));
  expect(stats!.y).toBeGreaterThan(runInfo!.y + runInfo!.height);
  expect(Math.abs(runInfo!.width - handsStat!.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(options!.width - handsStat!.width)).toBeLessThanOrEqual(2);
  expect(help!.y).toBeGreaterThan(runInfo!.y);
  expect(Math.round(help!.x)).toBe(Math.round(runInfo!.x));
  expect(help!.width).toBeGreaterThan(runInfo!.width * 1.5);
});

test("portrait: the sidebar strip fits the viewport without a horizontal scrollbar", async ({
  page,
}) => {
  await startRound(page);
  const overflow = await page
    .locator(".sidebar")
    .evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

async function scrollPage(page: Page, top: number): Promise<void> {
  await page.evaluate((value) => {
    const candidates = [document.body, document.documentElement];
    const scroller =
      candidates.find((el) => el.scrollHeight - el.clientHeight > 0) ??
      document.body;
    scroller.scrollTop = value;
    scroller.dispatchEvent(new Event("scroll"));
  }, top);
}

test.describe("auto-hide on a short portrait viewport", () => {
  test.use({ viewport: { width: 480, height: 500 } });

  test("the sidebar slides up out of view after a deliberate scroll down", async ({
    page,
  }) => {
    await startRound(page);
    const before = await page.locator(".sidebar").boundingBox();
    await scrollPage(page, 130);
    await expect(page.locator(".sidebar")).toHaveClass(/sidebar--hidden/);
    await expect
      .poll(async () => (await page.locator(".sidebar").boundingBox())?.y ?? 0)
      .toBeLessThan(before!.y);
  });

  test("negative: a small accidental scroll does not hide the sidebar", async ({
    page,
  }) => {
    await startRound(page);
    await scrollPage(page, 24);
    await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar--hidden/);
  });

  test("scrolling back up reveals the hidden sidebar again", async ({
    page,
  }) => {
    await startRound(page);
    await scrollPage(page, 130);
    await expect(page.locator(".sidebar")).toHaveClass(/sidebar--hidden/);
    await scrollPage(page, 50);
    await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar--hidden/);
  });

  test("returning the board to the top keeps the sidebar visible", async ({
    page,
  }) => {
    await startRound(page);
    await scrollPage(page, 130);
    await scrollPage(page, 0);
    await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar--hidden/);
  });

  test("negative: scrolling the scoring trace inside the sidebar does not hide it", async ({
    page,
  }) => {
    await startRound(page);
    await page.locator(".scoring-trace").evaluate((el) => {
      el.scrollTop = 200;
      el.dispatchEvent(new Event("scroll"));
    });
    await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar--hidden/);
  });
});

test("negative: landscape keeps the vertical sidebar column", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
  const page = await context.newPage();
  await startRound(page);
  const display = await page
    .locator(".sidebar")
    .evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("flex");
  await context.close();
});
