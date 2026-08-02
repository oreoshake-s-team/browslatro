import { useDelayedRender } from "../../hooks/useDelayedRender";

export const LAZY_CHUNK_SPINNER_DELAY_MS = 180;

export type LazyChunkSpinnerVariant = "inline" | "overlay";

interface LazyChunkSpinnerProps {
  readonly variant?: LazyChunkSpinnerVariant;
  readonly label?: string;
}

function SpinnerDot() {
  return (
    <span
      className="inline-block size-3 rounded-full border-2 border-white/30 border-t-white motion-safe:animate-spin"
      aria-hidden="true"
    />
  );
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
        className="pointer-events-none fixed inset-0 z-45 flex items-center justify-center bg-black/45"
        role="status"
        aria-live="polite"
        data-variant={variant}
        data-testid="lazy-chunk-spinner"
      >
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-border bg-raised px-5 py-3 text-base text-ink shadow-xl">
          <SpinnerDot />
          <span className="font-medium">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center gap-2 rounded-md bg-black/50 px-3 py-2 text-sm text-ink"
      role="status"
      aria-live="polite"
      data-variant={variant}
      data-testid="lazy-chunk-spinner"
    >
      <SpinnerDot />
      <span className="font-medium">{label}</span>
    </div>
  );
}
