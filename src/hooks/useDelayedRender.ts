import { useEffect, useState } from "react";

export function useDelayedRender(delayMs: number = 180): boolean {
  const safeDelay = Math.max(0, delayMs);
  const [ready, setReady] = useState<boolean>(safeDelay === 0);

  useEffect(() => {
    if (safeDelay === 0) {
      setReady(true);
      return;
    }
    setReady(false);
    const handle = window.setTimeout(() => {
      setReady(true);
    }, safeDelay);
    return () => {
      window.clearTimeout(handle);
    };
  }, [safeDelay]);

  return ready;
}
