import { Component, type ErrorInfo, type ReactNode } from "react";
import "./LazyChunkErrorBoundary.css";

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes("dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Failed to load module script")
  );
}

interface LazyChunkErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onReload?: () => void;
}

interface LazyChunkErrorBoundaryState {
  readonly error: Error | null;
}

export default class LazyChunkErrorBoundary extends Component<
  LazyChunkErrorBoundaryProps,
  LazyChunkErrorBoundaryState
> {
  override state: LazyChunkErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): LazyChunkErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {}

  private handleReload = (): void => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (!isChunkLoadError(error)) throw error;
      return (
        <div
          className="lazy-chunk-error-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lazy-chunk-error-title"
          aria-describedby="lazy-chunk-error-body"
          data-testid="lazy-chunk-error"
        >
          <div className="lazy-chunk-error-modal">
            <h2
              id="lazy-chunk-error-title"
              className="lazy-chunk-error-title"
            >
              A new version is available
            </h2>
            <p
              id="lazy-chunk-error-body"
              className="lazy-chunk-error-body"
            >
              Part of the page failed to load. Reload to continue.
            </p>
            <button
              type="button"
              className="lazy-chunk-error-reload"
              onClick={this.handleReload}
              autoFocus
              data-testid="lazy-chunk-error-reload"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
