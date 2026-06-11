import { useEffect, useRef, useState } from "react";

const PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 768px)";
const HIDE_DISTANCE_PX = 64;
const HIDE_MIN_OFFSET_PX = 64;
const REVEAL_DELTA_PX = 6;
const TOP_REVEAL_PX = 8;
const LISTENER_OPTIONS: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

function matchesPortrait(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(PORTRAIT_QUERY).matches;
}

function isPageScroll(target: EventTarget | null): boolean {
  if (typeof document === "undefined") return false;
  return (
    target === document ||
    target === document.body ||
    target === document.documentElement
  );
}

function pageScrollTop(): number {
  if (typeof document === "undefined") return 0;
  return document.body.scrollTop || document.documentElement.scrollTop || 0;
}

export function useAutoHideSidebar(): boolean {
  const [portrait, setPortrait] = useState(matchesPortrait);
  const [hidden, setHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const downDistance = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia(PORTRAIT_QUERY);
    const update = () => setPortrait(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!portrait) {
      setHidden(false);
      return;
    }
    lastScrollTop.current = pageScrollTop();
    downDistance.current = 0;
    const onScroll = (event: Event): void => {
      if (!isPageScroll(event.target)) return;
      const top = pageScrollTop();
      const delta = top - lastScrollTop.current;
      lastScrollTop.current = top;
      if (top <= TOP_REVEAL_PX) {
        downDistance.current = 0;
        setHidden(false);
      } else if (delta > 0) {
        downDistance.current += delta;
        if (downDistance.current >= HIDE_DISTANCE_PX && top > HIDE_MIN_OFFSET_PX) {
          setHidden(true);
        }
      } else if (delta < 0) {
        downDistance.current = 0;
        if (-delta >= REVEAL_DELTA_PX) setHidden(false);
      }
    };
    window.addEventListener("scroll", onScroll, LISTENER_OPTIONS);
    return () => window.removeEventListener("scroll", onScroll, LISTENER_OPTIONS);
  }, [portrait]);

  return portrait && hidden;
}
