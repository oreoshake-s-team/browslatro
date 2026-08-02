const SHELL_SELECTOR = "[data-seo-shell]";
const DISMISSING_CLASS = "seo-shell-dismissing";
const REMOVAL_FALLBACK_MS = 400;

export function dismissSeoShell(): void {
  const shell = document.querySelector<HTMLElement>(SHELL_SELECTOR);
  if (!shell || shell.classList.contains(DISMISSING_CLASS)) return;

  shell.classList.add(DISMISSING_CLASS);
  shell.setAttribute("aria-hidden", "true");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia) &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    shell.remove();
    return;
  }

  const timer = window.setTimeout(() => shell.remove(), REMOVAL_FALLBACK_MS);
  shell.addEventListener(
    "transitionend",
    () => {
      window.clearTimeout(timer);
      shell.remove();
    },
    { once: true },
  );
}
