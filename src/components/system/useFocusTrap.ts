import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const activeTraps = new Set<symbol>();

function syncShellInert(): void {
  const shell = document.querySelector("[data-app-shell]");
  if (!(shell instanceof HTMLElement)) return;
  if (activeTraps.size > 0) {
    shell.setAttribute("inert", "");
  } else {
    shell.removeAttribute("inert");
  }
}

function focusableElements(container: HTMLElement): ReadonlyArray<HTMLElement> {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.closest("[hidden]") === null);
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active = true,
): void {
  const triggerRef = useRef<HTMLElement | null>(null);
  if (
    active &&
    triggerRef.current === null &&
    document.activeElement instanceof HTMLElement
  ) {
    triggerRef.current = document.activeElement;
  }
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const trapId = Symbol("focus-trap");
    activeTraps.add(trapId);
    syncShellInert();
    if (!container.contains(document.activeElement)) {
      const first = focusableElements(container)[0];
      (first ?? container).focus();
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const focusables = focusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside =
        current instanceof HTMLElement && container.contains(current);
      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      activeTraps.delete(trapId);
      syncShellInert();
      const trigger = triggerRef.current;
      triggerRef.current = null;
      trigger?.focus();
    };
  }, [containerRef, active]);
}
