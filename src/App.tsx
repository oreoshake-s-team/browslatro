import { useEffect } from "react";
import { useBodyClass } from "./hooks/useBodyClass";
import { useTranslation } from "react-i18next";

import { useGame } from "./store/game";
import { useChanceOverrides } from "./hooks/useChanceOverrides";
import Game from "./components/game/Game";
import GameSessionProvider from "./components/game/GameSessionProvider";
import AutopilotSessionProvider from "./components/game/AutopilotSessionProvider";
import AppOverlays from "./components/game/AppOverlays";
import { useGameSession } from "./components/game/gameSession";
import { didRestoreFromSnapshot } from "./save/restore";
import Sidebar from "./components/hud/Sidebar";
import LiveAnnouncer from "./components/system/LiveAnnouncer";
import AdminModeController from "./components/system/AdminModeController";
import BossEffectToast from "./components/system/BossEffectToast";
import { usePreferences } from "./components/system/preferences";
import { useDevAnimationSpeedStyle } from "./hooks/useDevAnimationSpeedStyle";
import { useInitialDeal } from "./hooks/useInitialDeal";
import { useRunInitialization } from "./hooks/useRunInitialization";
import { useAppViewModel } from "./hooks/useAppViewModel";
import { initialJokersConfig } from "./items/jokers";

export { getScoringStepMs } from "./hooks/useScoringStepMs";

function AppContent() {
  const { t } = useTranslation();
  const { runStats, pendingRunSelect, selectedDeck } = useAppViewModel();
  useChanceOverrides();
  useInitialDeal();
  const highVisibility = usePreferences((state) => state.highVisibility);
  useBodyClass(highVisibility, "high-visibility");
  const dyslexicFont = usePreferences((state) => state.dyslexicFont);
  useBodyClass(dyslexicFont, "dyslexic-font");
  const animationSpeed = usePreferences((state) => state.animationSpeed);
  const setJokers = useGame((state) => state.setJokers);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);

  const { startNewGame } = useGameSession();

  useRunInitialization();

  const appStyle = useDevAnimationSpeedStyle(animationSpeed);

  return (
    <div
      className="flex h-dvh w-full flex-row bg-bg text-ink portrait-narrow:flex-col"
      data-app-shell=""
      data-deck={selectedDeck}
      style={appStyle}
      data-hands-played={runStats.handsPlayed}
      data-unused-discards={runStats.unusedDiscards}
      data-blinds-skipped={runStats.blindsSkipped}
    >
      <h1 className="sr-only">
        {pendingRunSelect ? t("app.titleMenu") : t("app.titleRun")}
      </h1>
      <Sidebar onNewGame={startNewGame} />
      <Game />
      <AppOverlays />
      <LiveAnnouncer />
      <AdminModeController />
      <BossEffectToast />
    </div>
  );
}

function App() {
  return (
    <GameSessionProvider>
      <AutopilotSessionProvider>
        <AppContent />
      </AutopilotSessionProvider>
    </GameSessionProvider>
  );
}

export default App;
