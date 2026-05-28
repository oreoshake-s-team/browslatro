import { useEffect, useState } from "react";
import "./NopeAnimation.css";

export const NOPE_ANIMATION_MS = 700;

interface NopeAnimationProps {
  triggerKey: number;
}

function NopeAnimation({ triggerKey }: NopeAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerKey === 0) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), NOPE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [triggerKey]);

  return (
    <div className="nope-animation" aria-live="assertive" aria-atomic="true">
      {visible && (
        <span
          key={triggerKey}
          className="nope-animation-pop"
          data-testid="nope-animation"
        >
          Nope!
        </span>
      )}
    </div>
  );
}

export default NopeAnimation;
