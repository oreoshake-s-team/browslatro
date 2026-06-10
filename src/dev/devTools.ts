const DEV_TOOLS_KEY = "browslatro:devTools";

/**
 * Dev-only affordances (e.g. the boss-blind override <select>) render in dev
 * builds. Production builds keep them out of the UI — and out of the tab
 * order (#915) — unless this localStorage seam is set, which lets e2e specs
 * running against a production preview build opt back in.
 */
export function devToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return window.localStorage.getItem(DEV_TOOLS_KEY) === "1";
  } catch {
    return false;
  }
}
