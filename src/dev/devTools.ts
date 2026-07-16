import { STORAGE_KEYS } from "../system/storageKeys";
import { getBool } from "../system/safeStorage";

const DEV_TOOLS_KEY = STORAGE_KEYS.devTools;

/**
 * Dev-only affordances (e.g. the boss-blind override <select>) render in dev
 * builds. Production builds keep them out of the UI — and out of the tab
 * order — unless this localStorage seam is set, which lets e2e specs
 * running against a production preview build opt back in.
 */
export function devToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return getBool(DEV_TOOLS_KEY);
}
