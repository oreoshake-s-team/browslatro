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
    page.locator('[data-testid="hand-cards"] .card').first(),
  ).toBeVisible();
}

async function interactiveOverlaps(page: Page, tooltipSelector: string) {
  return page.evaluate((selector) => {
    const tip = document.querySelector(selector);
    if (!tip) return null;
    const t = tip.getBoundingClientRect();
    return Array.from(
      document.querySelectorAll<HTMLElement>("button, [tabindex='0']"),
    )
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const x = Math.min(r.right, t.right) - Math.max(r.left, t.left);
        const y = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
        return x > 2 && y > 2;
      })
      .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "");
  }, tooltipSelector);
}

test("a hand-card tooltip does not cover any interactive element", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] .card');
  await cards.nth(3).hover();
  await expect(page.locator(".card-tooltip")).toBeVisible();
  expect(await interactiveOverlaps(page, ".card-tooltip")).toEqual([]);
});

test("a selected (lifted) card's tooltip does not cover neighboring cards", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] .card');
  await cards.nth(3).click();
  await page.mouse.move(0, 0);
  await cards.nth(3).hover();
  await expect(page.locator(".card-tooltip")).toBeVisible();
  expect(await interactiveOverlaps(page, ".card-tooltip")).toEqual([]);
});

test("clicking a card while a neighbor's tooltip is open always selects it", async ({
  page,
}) => {
  await startRound(page);
  const cards = page.locator('[data-testid="hand-cards"] .card');
  await cards.nth(3).hover();
  await expect(page.locator(".card-tooltip")).toBeVisible();
  await cards.nth(2).click();
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "true");
});

test("a joker tooltip does not cover any interactive element", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  const summary = page.getByText(/Apply modifiers/).first();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  const inner = page.getByText(/Add a specific Joker/).first();
  const innerDetails = inner.locator("xpath=ancestor::details[1]");
  await innerDetails.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  const tile = page.locator('button[data-joker-id="blueprint"]');
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await tile.dispatchEvent("click");
  await page.getByTestId("blind-select-play").click();
  const joker = page.getByTestId("joker-tile-filled-blueprint");
  await expect(joker).toBeVisible();
  await joker.hover();
  await expect(page.locator(".joker-tooltip")).toBeVisible();
  expect(await interactiveOverlaps(page, ".joker-tooltip")).toEqual([]);
});
