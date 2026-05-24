import { useState } from "react";
import "./Options.css";
import { createPortal } from "react-dom";
import {
  isHighVisibility,
  isMuted,
  toggleHighVisibility,
  toggleMute,
} from "../system/preferences";

interface OptionsProps {
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
}

function Options({ onNewGame, onHighVisibilityChange }: OptionsProps) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [highVisibility, setHighVisibility] = useState(isHighVisibility);

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

  return (
    <>
      <button onClick={() => setOpen(true)}>Options</button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
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
              <button
                className="options-button options-button--destructive"
                onClick={() => {
                  onNewGame();
                  setOpen(false);
                }}
              >
                New game
              </button>
              <button
                className="options-button"
                onClick={() => setOpen(false)}
              >
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
