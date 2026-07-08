import { createContext, useContext } from "react";
import type { AutopilotController } from "../../hooks/useAutopilotController";

export const AutopilotSessionContext =
  createContext<AutopilotController | null>(null);

export function useAutopilotSession(): AutopilotController | null {
  return useContext(AutopilotSessionContext);
}
