import { useEffect } from "react";
import { subscribeAndAutoSave } from "../../save/restore";

/**
 * Mount-scoped auto-save wiring: subscribes to the game store and schedules a
 * microtask to persist snapshots to localStorage, then unsubscribes on unmount.
 *
 * Keeping this in a React effect prevents duplicate subscriptions under HMR
 * and aligns the lifetime with the app shell rather than module import.
 */
export default function AutoSave(): null {
  useEffect(() => {
    const unsubscribe = subscribeAndAutoSave();
    return unsubscribe;
  }, []);
  return null;
}
