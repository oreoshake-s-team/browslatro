import { useDelayedRender } from "../../hooks/useDelayedRender";
import "./LazyChunkSpinner.css";

export const LAZY_CHUNK_SPINNER_DELAY_MS = 180;

export type LazyChunkSpinnerVariant = "inline" | "overlay";

interface LazyChunkSpinnerProps {
  readonly variant?: LazyChunkSpinnerVariant;
  readonly label?: string;
}

export default function LazyChunkSpinner({
  variant = "inline",
  label = "Loading…",
}: LazyChunkSpinnerProps) {
  const ready = useDelayedRender(LAZY_CHUNK_SPINNER_DELAY_MS);
  if (!ready) return null;

  if (variant === "overlay") {
    return (
      <div
        className="lazy-chunk-spinner lazy-chunk-spinner--overlay"
        role="status"
        aria-live="polite"
        data-testid="lazy-chunk-spinner"
      >
        <div className="lazy-chunk-spinner__panel">
          <span className="lazy-chunk-spinner__dot" aria-hidden="true" />
          <span className="lazy-chunk-spinner__text">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="lazy-chunk-spinner"
      role="status"
      aria-live="polite"
      data-testid="lazy-chunk-spinner"
    >
      <span className="lazy-chunk-spinner__dot" aria-hidden="true" />
      <span className="lazy-chunk-spinner__text">{label}</span>
    </div>
  );
}
