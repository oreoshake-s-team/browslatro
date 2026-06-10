import { useMemo } from "react";
import type { Decorator } from "@storybook/react-vite";
import { useGame, type GameState } from "../store/game";

export function withGame(seed?: (state: GameState) => void): Decorator {
  return function GameDecorator(Story) {
    useMemo(() => {
      useGame.getState().resetGame();
      seed?.(useGame.getState());
    }, []);
    return <Story />;
  };
}

export function withFullscreen(): Decorator {
  return function FullscreenDecorator(Story) {
    return (
      <div className="App" style={{ minHeight: "100vh", width: "100vw" }}>
        <Story />
      </div>
    );
  };
}
