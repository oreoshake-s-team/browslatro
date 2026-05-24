import { useState } from "react";
import "./Options.css";
import { createPortal } from "react-dom";
import { isMuted, toggleMute } from "./sounds";

interface OptionsProps {
  onReset: () => void;
}

function Options({ onReset }: OptionsProps) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted);

  function handleToggleMute() {
    toggleMute();
    setMuted(isMuted());
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