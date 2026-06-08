import "./GameWonScreen.css";
import { createPortal } from "react-dom";
import { useEscapeToClose } from "../system/useEscapeToClose";
import type { GameWonInfo } from "../../store/progression";

interface GameWonScreenProps {
  info: GameWonInfo;
  onNewRun: () => void;
}

export default function GameWonScreen({ info, onNewRun }: GameWonScreenProps) {
  const { finalAnte, finalMoney, handsPlayed, blindsSkipped } = info;
  useEscapeToClose(onNewRun, true);

  return createPortal(
    <div
      className="game-won-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-won-title"
    >
      <div
        className="game-won-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="game-won-title" className="game-won-title">
          You Win!
        </h2>
        <p className="game-won-subtitle">
          You cleared Ante {finalAnte}'s Boss Blind and finished the run.
        </p>
        <dl className="game-won-stats">
          <div className="game-won-stat">
            <dt>Final ante</dt>
            <dd data-testid="game-won-final-ante">{finalAnte}</dd>
          </div>
          <div className="game-won-stat">
            <dt>Final money</dt>
            <dd data-testid="game-won-final-money">${finalMoney}</dd>
          </div>
          <div className="game-won-stat">
            <dt>Hands played</dt>
            <dd data-testid="game-won-hands-played">{handsPlayed}</dd>
          </div>
          <div className="game-won-stat">
            <dt>Blinds skipped</dt>
            <dd data-testid="game-won-blinds-skipped">{blindsSkipped}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="game-won-new-run"
          data-testid="game-won-new-run"
          onClick={onNewRun}
          autoFocus
        >
          Start a new run →
        </button>
      </div>
    </div>,
    document.body,
  );
}
