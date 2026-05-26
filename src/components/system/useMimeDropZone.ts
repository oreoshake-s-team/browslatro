import { useState, type DragEventHandler } from "react";

interface DropZoneOptions {
  readonly enabled: boolean;
  readonly mime: string;
  readonly onDrop?: () => void;
}

interface DropZoneHandlers {
  readonly hover: boolean;
  readonly onDragOver: DragEventHandler<HTMLElement> | undefined;
  readonly onDragLeave: DragEventHandler<HTMLElement> | undefined;
  readonly onDrop: DragEventHandler<HTMLElement> | undefined;
}

export function useMimeDropZone({
  enabled,
  mime,
  onDrop,
}: DropZoneOptions): DropZoneHandlers {
  const [hover, setHover] = useState(false);
  const active = enabled && Boolean(onDrop);

  if (!active) {
    return { hover: false, onDragOver: undefined, onDragLeave: undefined, onDrop: undefined };
  }

  const matches = (e: React.DragEvent<HTMLElement>) =>
    e.dataTransfer.types.includes(mime);

  return {
    hover,
    onDragOver: (e) => {
      if (!matches(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!hover) setHover(true);
    },
    onDragLeave: (e) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      if (hover) setHover(false);
    },
    onDrop: (e) => {
      if (!matches(e)) return;
      e.preventDefault();
      setHover(false);
      onDrop?.();
    },
  };
}
