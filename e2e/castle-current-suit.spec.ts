import { test, expect, type Page } from "@playwright/test";

const SUIT_GLYPHS: Record<string, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  await expect(summary).toBeVisible();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await expect(details).toHaveAttribute("open", "");
}

async function addJokerById(page: Page, jokerId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Joker/);
  const prev = page.getByTestId("modifier-joker-picker-prev");
  while (!(await prev.isDisabled())) {
    await prev.dispatchEvent("click");
  }
  const tile = page.locator(`button[data-joker-id="${jokerId}"]`);
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await expect(tile).toBeVisible();
  await tile.dispatchEvent("click");
}

function readCastleSuit(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("browslatro:run:v1");
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as { state: { castleSuit?: string } };
    return snapshot.state.castleSuit ?? null;
  });
}

test("Castle tile and tooltip show the current rotating suit after entering a blind", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "castle");
  await page.getByTestId("blind-select-play").click();

  const HAND_CARDS = '[data-testid="hand-cards"] .card';
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);

  const castleSuit = await readCastleSuit(page);
  expect(castleSuit).not.toBeNull();
  const glyph = SUIT_GLYPHS[castleSuit as string];

  const tile = page.getByTestId("joker-tile-filled-castle");
  const tileDesc = page.getByTestId("joker-tile-description-castle");
  await expect(tileDesc).toContainText("Currently:");
  await expect(tileDesc).toContainText(glyph);

  await tile.hover();
  const tooltipDesc = page.getByTestId("joker-tooltip-description");
  await expect(tooltipDesc).toContainText("Currently:");
  await expect(tooltipDesc).toContainText(glyph);
});

test("Castle tile shows the placeholder before any blind is entered (negative)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "castle");

  const tileDesc = page.getByTestId("joker-tile-description-castle");
  await expect(tileDesc).toContainText("Suit is chosen when the blind starts");
});
