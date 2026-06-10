import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { collectInteractiveRects, placeTooltip } from "./tooltipPlacement";

export interface TooltipPositionStyle {
  readonly top: number;
  readonly left: number;
}

const TOOLTIP_OFFSET_PX = 8;

/**
 * Position a hover tooltip relative to its anchor without covering any
 * interactive element (issue #993). Returns the legacy "below the anchor"
 * position until the tooltip has been measured; in environments without
 * layout (jsdom returns zero-size rects) the legacy position is kept.
 *
 * The placement is recomputed when the surrounding DOM mutates or the
 * window resizes, since content can mount or shift while a tooltip is
 * open (e.g. the hand row appearing as a round starts).
 *
 * The returned `left` is the tooltip's horizontal center — pair it with
 * `transform: translateX(-50%)` like all tooltip stylesheets do.
 */
export function useTooltipPosition(anchorRect: {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly bottom: number;
}): {
  readonly ref: RefObject<HTMLDivElement | null>;
  readonly style: TooltipPositionStyle;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [adjusted, setAdjusted] = useState<TooltipPositionStyle | null>(null);

  const { left, top, width, height, bottom } = anchorRect;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const size = el.getBoundingClientRect();
      if (size.width === 0 || size.height === 0) return;
      const placement = placeTooltip({
        anchor: { left, top, width, height },
        size: { width: size.width, height: size.height },
        obstacles: collectInteractiveRects(el),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        offset: TOOLTIP_OFFSET_PX,
      });
      setAdjusted((prev) =>
        prev && prev.top === placement.top && prev.left === placement.centerX
          ? prev
          : { top: placement.top, left: placement.centerX },
      );
    };
    compute();

    // Throttle recomputes to one per frame; the equality guard above keeps
    // our own style write from re-triggering the observer in a loop.
    let frame = 0;
    const schedule = () => {
      if (typeof requestAnimationFrame !== "function") {
        compute();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    };
  }, [left, top, width, height]);

  return {
    ref,
    style: adjusted ?? { top: bottom + TOOLTIP_OFFSET_PX, left: left + width / 2 },
  };
}
