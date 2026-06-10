import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRun(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
}

test.describe("Dialog focus trap + inert background (#907)", () => {
  test("the app shell is inert while the boot and blind-select dialogs are open, and live again in gameplay", async ({
    page,
  }) => {
    await page.goto("/");
    const shell = page.locator("[data-app-shell]");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(shell).toHaveAttribute("inert", "");
    await page.getByTestId("new-run-confirm").click();
    await expect(page.getByTestId("blind-select-play")).toBeVisible();
    await expect(shell).toHaveAttribute("inert", "");
    await page.getByTestId("blind-select-play").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(shell).not.toHaveAttribute("inert", "");
    await expect(
      page.getByRole("button", { name: "Discard", exact: true }),
    ).toBeVisible();
  });

  test("Tab and Shift+Tab cycle only within the blind-select dialog", async ({
    page,
  }) => {
    await startRun(page);
    await expect(page.getByTestId("blind-select-play")).toBeFocused();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const insideDialog = await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".blind-select-overlay")),
      );
      expect(insideDialog).toBe(true);
    }
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Shift+Tab");
      const insideDialog = await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".blind-select-overlay")),
      );
      expect(insideDialog).toBe(true);
    }
  });

  test("background buttons cannot be keyboard-activated while a dialog is open", async ({
    page,
  }) => {
    await startRun(page);
    await expect(page.getByTestId("blind-select-play")).toBeFocused();
    const skipped = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>(
        ".sidebar button",
      );
      if (!button) return "missing";
      button.focus();
      return document.activeElement === button ? "focused" : "blocked";
    });
    expect(skipped).toBe("blocked");
  });

  test("closing the Run info dialog returns focus to the Run info trigger", async ({
    page,
  }) => {
    await startRun(page);
    await page.getByTestId("blind-select-play").click();
    const trigger = page.getByRole("button", { name: "Run info" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
