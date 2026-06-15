import "./Modal.css";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  base: "",
  elevated: "modal-overlay--elevated",
  top: "modal-overlay--top",
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

  const overlayClasses = ["modal-overlay", LEVEL_CLASS[level]]
    .filter(Boolean)
    .join(" ");
  const panelClasses = [
    "modal-panel",
    `modal-panel--${accent}`,
    `modal-panel--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={overlayClasses}
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
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-testid={testId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
