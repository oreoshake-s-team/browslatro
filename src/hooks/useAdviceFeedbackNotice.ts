import { useCallback, useEffect, useState } from "react";
import { useGame } from "../store/game";

export interface AdviceFeedbackNotice {
  readonly recorded: boolean;
  readonly markRecorded: () => void;
  readonly clear: () => void;
}

export function useAdviceFeedbackNotice(
  isScoring: boolean,
): AdviceFeedbackNotice {
  const [recorded, setRecorded] = useState(false);
  const hand = useGame((s) => s.dealt.hand);
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);

  useEffect(() => {
    setRecorded(false);
  }, [hand]);

  useEffect(() => {
    if (isScoring || discardingIds.size > 0) return;
    setRecorded(false);
  }, [selectedIds, isScoring, discardingIds]);

  const markRecorded = useCallback(() => {
    setRecorded(true);
  }, []);
  const clear = useCallback(() => {
    setRecorded(false);
  }, []);

  return { recorded, markRecorded, clear };
}
