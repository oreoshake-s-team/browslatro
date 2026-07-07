import { useEffect } from "react";
import { chanceOverrideConfig } from "../dev/chanceOverride";
import { probabilityMultiplierFromJokers } from "../items/jokers";
import { useGame } from "../store/game";

export function useChanceOverrides(): void {
  const forceProbabilities = useGame((s) => s.forceProbabilities);
  const jokers = useGame((s) => s.jokers);

  useEffect(() => {
    chanceOverrideConfig.force100 = forceProbabilities;
    return () => {
      chanceOverrideConfig.force100 = false;
    };
  }, [forceProbabilities]);

  useEffect(() => {
    chanceOverrideConfig.probabilityMultiplier = probabilityMultiplierFromJokers(jokers);
    return () => {
      chanceOverrideConfig.probabilityMultiplier = 1;
    };
  }, [jokers]);
}
