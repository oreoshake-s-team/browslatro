import { useEffect, useRef } from "react";

const KONAMI_SEQUENCE: ReadonlyArray<string> = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useKonamiCode(onTrigger: () => void): void {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;
  useEffect(() => {
    const buffer: string[] = [];
    const handler = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) return;
      buffer.push(event.key.toLowerCase());
      if (buffer.length > KONAMI_SEQUENCE.length) buffer.shift();
      if (
        buffer.length === KONAMI_SEQUENCE.length &&
        KONAMI_SEQUENCE.every((key, index) => key === buffer[index])
      ) {
        buffer.length = 0;
        onTriggerRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
