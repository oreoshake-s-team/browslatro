import { useCallback, useId, useState } from "react";
import { createPortal } from "react-dom";
import "./RunInfo.css";
import { HANDS } from "../../constants";
import type { HandLabel } from "../../handEvaluator";
import { useEscapeToClose } from "../system/useEscapeToClose";

export type HandPlayCounts = Readonly<Record<HandLabel, number>>;

export function emptyHandCounts(): HandPlayCounts {
  const counts = {} as Record<HandLabel, number>;
  for (const hand of HANDS) {
    counts[hand.label as HandLabel] = 0;
  }
  return counts;
}

interface RunInfoProps {
  handPlayCounts: HandPlayCounts;
}

function RunInfo({ handPlayCounts }: RunInfoProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);

  return (
    <>
      <button onClick={() => setOpen(true)}>Run info</button>
      {open &&
        createPortal(
          <div
            className="run-info-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={handleClose}
          >
            <div className="run-info-modal" onClick={(e) => e.stopPropagation()}>
              <h2 id={titleId} className="run-info-title">
                Run Information
              </h2>
              <table className="run-info-table">
                <thead>
                  <tr>
                    <th scope="col">Hand</th>
                    <th scope="col">Chips × Mult</th>
                    <th scope="col">Played</th>
                  </tr>
                </thead>
                <tbody>
                  {[...HANDS].reverse().map((hand) => {
                    const label = hand.label as HandLabel;
                    return (
                      <tr key={label} data-testid={`run-info-row-${label}`}>
                        <th scope="row">{label}</th>
                        <td>
                          {hand.chips} × {hand.multiplier}
                        </td>
                        <td data-testid={`run-info-count-${label}`}>
                          {handPlayCounts[label]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button
                type="button"
                className="run-info-close"
                onClick={handleClose}
                autoFocus
              >
                Close
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default RunInfo;
