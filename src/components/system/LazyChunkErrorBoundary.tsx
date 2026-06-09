import { Component, type ErrorInfo, type ReactNode } from "react";

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

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (!isChunkLoadError(error)) return;
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    window.location.reload();
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (!isChunkLoadError(error)) throw error;
      return null;
    }
    return this.props.children;
  }
}
