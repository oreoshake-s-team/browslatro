import type { ReactNode } from "react";
import { useAutopilotController } from "../../hooks/useAutopilotController";
import { useGameSession } from "./gameSession";
import { AutopilotSessionContext } from "./autopilotSession";

export default function AutopilotSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { submitHand, discardSelected, isScoring } = useGameSession();
  const controller = useAutopilotController(isScoring, {
    play: submitHand,
    discard: discardSelected,
  });
  return (
    <AutopilotSessionContext.Provider value={controller}>
      {children}
    </AutopilotSessionContext.Provider>
  );
}
