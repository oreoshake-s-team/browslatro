import { afterEach, describe, expect, test, vi } from "vitest";
import { dismissSeoShell } from "./loadingShell";

function mountShell(): HTMLElement {
  const shell = document.createElement("main");
  shell.setAttribute("data-seo-shell", "");
  shell.setAttribute("aria-busy", "true");
  document.body.appendChild(shell);
  return shell;
}

function stubMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches } as unknown as MediaQueryList),
  });
}

describe("dismissSeoShell", () => {
  afterEach(() => {
    document
      .querySelectorAll("[data-seo-shell]")
      .forEach((node) => node.remove());
    vi.useRealTimers();
  });

  test("does nothing when no shell is present", () => {
    stubMatchMedia(false);
    expect(() => dismissSeoShell()).not.toThrow();
  });

  test("marks the shell as dismissing", () => {
    stubMatchMedia(false);
    const shell = mountShell();
    dismissSeoShell();
    expect(shell.classList.contains("seo-shell-dismissing")).toBe(true);
  });

  test("hides the shell from assistive tech while fading", () => {
    stubMatchMedia(false);
    const shell = mountShell();
    dismissSeoShell();
    expect(shell.getAttribute("aria-hidden")).toBe("true");
  });

  test("removes the shell when its fade transition ends", () => {
    stubMatchMedia(false);
    const shell = mountShell();
    dismissSeoShell();
    shell.dispatchEvent(new Event("transitionend"));
    expect(document.querySelector("[data-seo-shell]")).toBeNull();
  });

  test("removes the shell after the fallback timeout when no transition fires", () => {
    stubMatchMedia(false);
    vi.useFakeTimers();
    mountShell();
    dismissSeoShell();
    vi.advanceTimersByTime(400);
    expect(document.querySelector("[data-seo-shell]")).toBeNull();
  });

  test("removes the shell immediately under reduced motion", () => {
    stubMatchMedia(true);
    mountShell();
    dismissSeoShell();
    expect(document.querySelector("[data-seo-shell]")).toBeNull();
  });

  test("schedules only one removal when called repeatedly", () => {
    stubMatchMedia(false);
    vi.useFakeTimers();
    mountShell();
    dismissSeoShell();
    dismissSeoShell();
    expect(vi.getTimerCount()).toBe(1);
  });
});
