import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const SHOP_HEADING = /Shop/;

async function contrastViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${node.target.join(" ")} — ${node.failureSummary ?? ""}`,
    ),
  );
}

async function seedPreferences(page: Page, highVisibility = false) {
  await page.addInitScript((highVis) => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
    if (highVis) {
      window.localStorage.setItem("browslatro:highVisibility", "true");
    }
  }, highVisibility);
}

async function startRound(page: Page) {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(fg: string, bg: string): number {
  const parse = (color: string): [number, number, number] => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) throw new Error(`unparseable color: ${color}`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const l1 = relativeLuminance(...parse(fg));
  const l2 = relativeLuminance(...parse(bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test.describe("color contrast (issue #911)", () => {
  test("blind select screen has no axe color-contrast violations", async ({
    page,
  }) => {
    await seedPreferences(page);
    await page.goto("/");
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-play")).toBeVisible();
    expect(await contrastViolations(page)).toEqual([]);
  });

  test("gameplay, round-won modal, and shop have no axe color-contrast violations", async ({
    page,
  }) => {
    await seedPreferences(page);
    await startRound(page);
    expect(await contrastViolations(page)).toEqual([]);
    for (let i = 0; i < 5; i += 1) {
      await page.locator(HAND_CARDS).nth(i).click();
    }
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await expect(
      page.getByRole("button", { name: CONTINUE_BUTTON }),
    ).toBeVisible();
    expect(await contrastViolations(page)).toEqual([]);
    await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
    await expect(
      page.getByRole("heading", { name: SHOP_HEADING }),
    ).toBeVisible();
    expect(await contrastViolations(page)).toEqual([]);
  });

  test("high-visibility gameplay has no axe color-contrast violations and all four suit colors meet 4.5:1 on the card face", async ({
    page,
  }) => {
    await seedPreferences(page, true);
    await startRound(page);
    expect(await contrastViolations(page)).toEqual([]);
    const palette = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "high-visibility";
      document.body.appendChild(probe);
      const styles = getComputedStyle(probe);
      const cardFace = document.createElement("div");
      cardFace.className = "card";
      document.body.appendChild(cardFace);
      const suits = [
        "--card-suit-spades-color",
        "--card-suit-hearts-color",
        "--card-suit-diamonds-color",
        "--card-suit-clubs-color",
      ].map((token) => {
        const swatch = document.createElement("div");
        swatch.style.color = styles.getPropertyValue(token);
        document.body.appendChild(swatch);
        return [token, getComputedStyle(swatch).color] as const;
      });
      return {
        suits,
        cardBackground: getComputedStyle(cardFace).backgroundColor,
      };
    });
    for (const [token, color] of palette.suits) {
      expect
        .soft(
          contrastRatio(color, palette.cardBackground),
          `${token} (${color}) on ${palette.cardBackground}`,
        )
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  test("scoring-trace expand button renders at 12px or larger", async ({
    page,
  }) => {
    await seedPreferences(page);
    await startRound(page);
    const expand = page.locator(".scoring-trace__expand");
    await expect(expand).toBeVisible();
    const fontSize = await expand.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });
});
