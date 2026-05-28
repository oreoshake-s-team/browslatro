import { createPortal } from "react-dom";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import { useEscapeToClose } from "../system/useEscapeToClose";
import "./ScoringTraceModal.css";

interface ScoringTraceModalProps {
  readonly events: ReadonlyArray<ScoringEvent>;
  readonly onClose: () => void;
}

export default function ScoringTraceModal({ events, onClose }: ScoringTraceModalProps) {
  useEscapeToClose(onClose, true);
  return createPortal(
    <div
      className="scoring-trace-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-trace-modal-title"
      onClick={onClose}
    >
      <div className="scoring-trace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scoring-trace-modal__header">
          <h2 id="scoring-trace-modal-title" className="scoring-trace-modal__title">
            Scoring Trace
          </h2>
          <button
            type="button"
            className="scoring-trace-modal__close"
            onClick={onClose}
            aria-label="Close scoring trace"
            autoFocus
          >
            ✕ Close
          </button>
        </div>
        <div
          className="scoring-trace-modal__body"
          role="log"
          aria-live="polite"
          aria-label="Scoring trace"
          tabIndex={0}
        >
          <ScoringTraceContent events={events} idPrefix="scoring-trace-modal" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
