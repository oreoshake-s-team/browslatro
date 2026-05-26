import { useCallback, useId, useState } from "react";
import "./Options.css";
import { createPortal } from "react-dom";
import {
  ANIMATION_SPEED_VALUES,
  getAnimationSpeed,
  isHighVisibility,
  isMuted,
  setAnimationSpeed,
  toggleHighVisibility,
  toggleMute,
  type AnimationSpeed,
} from "../system/preferences";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface OptionsProps {
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
  onAnimationSpeedChange?: (value: AnimationSpeed) => void;
}

const ANIMATION_SPEED_LABELS: Readonly<Record<AnimationSpeed, string>> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  instant: "Instant",
};

function Options({
  onNewGame,
  onHighVisibilityChange,
  onAnimationSpeedChange,
}: OptionsProps) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [highVisibility, setHighVisibility] = useState(isHighVisibility);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(
    getAnimationSpeed,
  );
  const animationSpeedSelectId = useId();
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);

  function handleToggleMute() {
    toggleMute();
    setMuted(isMuted());
  }

  function handleToggleHighVisibility() {
    toggleHighVisibility();
    const next = isHighVisibility();
    setHighVisibility(next);
    onHighVisibilityChange?.(next);
  }

  function handleAnimationSpeedChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const next = event.target.value as AnimationSpeed;
    setAnimationSpeed(next);
    setAnimationSpeedState(next);
    onAnimationSpeedChange?.(next);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Options</button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={handleClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Options</h3>
              <button
                className="options-button options-button--toggle"
                aria-pressed={muted}
                onClick={handleToggleMute}
              >
                {muted ? "🔇 Unmute sounds" : "🔊 Mute sounds"}
              </button>
              <button
                className="options-button options-button--toggle"
                aria-pressed={highVisibility}
                onClick={handleToggleHighVisibility}
              >
                {highVisibility
                  ? "🎨 Disable high visibility suits"
                  : "🎨 Enable high visibility suits"}
              </button>
              <label
                className="options-field"
                htmlFor={animationSpeedSelectId}
              >
                <span className="options-field-label">Animation speed</span>
                <select
                  id={animationSpeedSelectId}
                  className="options-select"
                  value={animationSpeed}
                  onChange={handleAnimationSpeedChange}
                >
                  {ANIMATION_SPEED_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {ANIMATION_SPEED_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="options-button options-button--destructive"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Start a new game? This will end your current run.",
                  );
                  if (!confirmed) return;
                  onNewGame();
                  handleClose();
                }}
              >
                New game
              </button>
              <button className="options-button" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Options;
