import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../ui/cn";
import { useEscapeToClose } from "./useEscapeToClose";
import { useFocusTrap } from "./useFocusTrap";

export type ModalAccent =
  | "pack"
  | "boss-blind"
  | "success"
  | "danger"
  | "neutral";

export type ModalSize = "sm" | "md" | "lg";

export type ModalLevel = "base" | "elevated" | "top";

export interface ModalProps {
  readonly onClose: () => void;
  readonly labelledBy: string;
  readonly accent?: ModalAccent;
  readonly size?: ModalSize;
  readonly level?: ModalLevel;
  readonly closeOnEscape?: boolean;
  readonly closeOnBackdrop?: boolean;
  readonly className?: string;
  readonly testId?: string;
  readonly children: ReactNode;
}

const LEVEL_CLASS: Record<ModalLevel, string> = {
  base: "z-40",
  elevated: "z-42",
  top: "z-44",
};

const ACCENT_CLASS: Record<ModalAccent, string> = {
  pack: "border-advisor",
  "boss-blind": "border-chips",
  success: "border-success",
  danger: "border-mult",
  neutral: "border-border",
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-3xl",
  lg: "max-w-6xl",
};

export default function Modal({
  onClose,
  labelledBy,
  accent = "neutral",
  size = "sm",
  level = "base",
  closeOnEscape = true,
  closeOnBackdrop = true,
  className,
  testId,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, closeOnEscape);
  useFocusTrap(panelRef);

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/60 p-6",
        LEVEL_CLASS[level],
      )}
      data-modal-overlay
      data-level={level}
      onClick={
        closeOnBackdrop
          ? (event) => {
              if (event.target === event.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        className={cn(
          "flex max-h-[90vh] w-full flex-col gap-3 overflow-y-auto rounded-xl border-2 bg-surface p-6 text-ink shadow-xl",
          ACCENT_CLASS[accent],
          SIZE_CLASS[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-accent={accent}
        data-size={size}
        data-testid={testId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
