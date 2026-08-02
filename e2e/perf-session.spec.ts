import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface RenderProfilingRecord {
  readonly id: string;
  readonly phase: string;
  readonly actualDuration: number;
  readonly baseDuration: number;
  readonly startTime: number;
  readonly commitTime: number;
}

declare global {
  interface Window {
    __renderProfilingRecords?: RenderProfilingRecord[];
  }
}

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;
const CONTINUE_BUTTON = /Continue/;
const NEXT_ROUND_BUTTON = /Next Round/;
const SHOP_HEADING = /Shop/;
const ROUNDS = Number(process.env.PERF_ROUNDS ?? 6);

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function playRoundUntilDecided(page: Page): Promise<"won" | "lost"> {
  const continueButton = page.getByRole("button", { name: CONTINUE_BUTTON });
  const tryAgainButton = page.locator(".round-lost-continue");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const cards = page.locator(HAND_CARDS);
    if ((await cards.count()) < 5) break;
    for (let i = 0; i < 5; i += 1) await cards.nth(i).click();
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await Promise.race([
      continueButton.waitFor({ state: "visible", timeout: 8000 }),
      tryAgainButton.waitFor({ state: "visible", timeout: 8000 }),
    ]).catch(() => undefined);
    if (await continueButton.isVisible().catch(() => false)) break;
    if (await tryAgainButton.isVisible().catch(() => false)) break;
  }
  if (await tryAgainButton.isVisible().catch(() => false)) {
    await tryAgainButton.click();
    return "lost";
  }
  await continueButton.click();
  return "won";
}

async function maybeBuyJoker(page: Page): Promise<void> {
  const jokerOffer = page.locator('.shop-offer[data-offer-kind="joker"]').first();
  if (!(await jokerOffer.isVisible().catch(() => false))) return;
  const buyButton = jokerOffer.locator(".shop-offer-buy");
  if (await buyButton.isEnabled().catch(() => false)) await buyButton.click();
}

async function maybeOpenCoachTip(page: Page): Promise<void> {
  const coachTrigger = page.getByTestId("coach-trigger");
  if (!(await coachTrigger.isVisible().catch(() => false))) return;
  await coachTrigger.click();
  await page.waitForTimeout(200);
}

async function visitShop(page: Page, roundIndex: number): Promise<void> {
  await page.getByRole("heading", { name: SHOP_HEADING }).waitFor();
  await maybeBuyJoker(page);
  const reroll = page.locator(".shop-reroll");
  if (await reroll.isEnabled().catch(() => false)) await reroll.click();
  if (roundIndex % 2 === 0) await maybeOpenCoachTip(page);
  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
}

test("capture render profiling data across a full deterministic play session", async ({
  page,
  context,
}) => {
  test.skip(!process.env.PERF_CAPTURE, "opt-in harness; run via `yarn perf:profile`");

  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:renderProfiling", "1");
    window.localStorage.setItem(
      "browslatro:forceShopOfferKinds",
      "joker,joker,planet,tarot",
    );
  });

  await page.goto("/");
  await dismissBlindSelect(page);

  for (let round = 0; round < ROUNDS; round += 1) {
    const outcome = await playRoundUntilDecided(page);
    if (outcome === "won") await visitShop(page, round);
    await dismissBlindSelect(page);
  }

  const records = await page.evaluate(
    () => window.__renderProfilingRecords ?? [],
  );
  const outDir = path.join("perf", "profiling-runs");
  mkdirSync(outDir, { recursive: true });
  const label = process.env.PERF_LABEL ?? "run";
  writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(records));
});
