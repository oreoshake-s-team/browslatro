import { useState } from "react";
import { createPortal } from "react-dom";

interface OptionsProps {
  onReset: () => void;
}

function Options({ onReset }: OptionsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Options</button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Options</h3>
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