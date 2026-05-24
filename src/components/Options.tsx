import { useState } from "react";
import "./Options.css";
import { createPortal } from "react-dom";
import {
  isHighVisibility,
  isMuted,
  toggleHighVisibility,
  toggleMute,
} from "./preferences";

interface OptionsProps {
  onReset: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
}

function Options({ onReset, onHighVisibilityChange }: OptionsProps) {
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
              <button onClick={handleToggleMute}>
                {muted ? "🔇 Unmute sounds" : "🔊 Mute sounds"}
              </button>
              <button
                className="high-visibility-toggle"
                aria-pressed={highVisibility}
                onClick={handleToggleHighVisibility}
              >
                {highVisibility
                  ? "🎨 Disable high visibility suits"
                  : "🎨 Enable high visibility suits"}
              </button>
              <button
                className="win-button reset-button"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Reset
              </button>
              <button className="modal-close" onClick={() => setOpen(false)}>
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