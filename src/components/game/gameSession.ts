import { createContext, useContext } from "react";
import type { Card } from "../../cards/types";
import type { Deck } from "../../items/decks";
import type { Stake } from "../../items/stakes";

export interface GameSessionActions {
  readonly submitHand: () => void;
  readonly discardSelected: () => void;
  readonly isScoring: boolean;
  readonly currentScoringId: number | null;
  readonly currentGoldScoringId: number | null;
  readonly currentSteelScoringId: number | null;
  readonly handleCardDiscardEnd: (card: Card) => void;
  readonly startNewGame: () => void;
  readonly confirmRunSelection: (selection: {
    readonly stake: Stake;
    readonly deck: Deck;
  }) => void;
  readonly skipBlind: () => void;
  readonly confirmBlindSelect: () => void;
}

export const GameSessionContext = createContext<GameSessionActions | null>(
  null,
);

export function useGameSession(): GameSessionActions {
  const value = useContext(GameSessionContext);
  if (value === null) {
    throw new Error("useGameSession must be used within GameSessionProvider");
  }
  return value;
}
