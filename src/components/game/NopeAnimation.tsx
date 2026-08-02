import { useEffect, useRef, useState } from "react";

export const NOPE_ANIMATION_MS = 700;

interface NopeAnimationProps {
  triggerKey: number;
}

function NopeAnimation({ triggerKey }: NopeAnimationProps) {
  const [visible, setVisible] = useState(false);
  // The trigger key is part of the persisted run state, so a restored run can
  // mount with a non-zero key; only animate when the key changes after mount.
  const lastKeyRef = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey === lastKeyRef.current) return;
    lastKeyRef.current = triggerKey;
    if (triggerKey === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), NOPE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [triggerKey]);

  return (
    <div
      className="pointer-events-none fixed top-[38%] left-1/2 z-[200] -translate-x-1/2 -translate-y-1/2"
      aria-live="assertive"
      aria-atomic="true"
    >
      {visible && (
        <span
          key={triggerKey}
          className="animate-nope-pop inline-block rounded-lg border-4 border-mult bg-surface/90 px-5 py-2 text-[4rem] leading-none font-extrabold tracking-wider whitespace-nowrap text-mult uppercase motion-reduce:animate-none"
          data-testid="nope-animation"
        >
          Nope!
        </span>
      )}
    </div>
  );
}

export default NopeAnimation;
