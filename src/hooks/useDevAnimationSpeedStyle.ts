import { useMemo } from "react";
import { getAnimationSpeedMultiplier, hasUserOverriddenAnimationSpeed, type AnimationSpeed } from "../components/system/preferences";

export function useDevAnimationSpeedStyle(animationSpeed: AnimationSpeed): React.CSSProperties | undefined {
  return useMemo(() => {
    return hasUserOverriddenAnimationSpeed(animationSpeed)
      ? ({ "--animation-speed": String(getAnimationSpeedMultiplier(animationSpeed)) } as React.CSSProperties)
      : undefined;
  }, [animationSpeed]);
}
