import type { ReactNode } from "react";
import type { HandLabel } from "../../scoring/handEvaluator";

const PLACEHOLDER = "???";

export function toDoListDescriptionText(
  base: string,
  todoHand: HandLabel | null,
): string {
  return `${base} — Currently: ${todoHand ?? PLACEHOLDER}`;
}

export function toDoListDescriptionNode(
  base: string,
  todoHand: HandLabel | null,
): ReactNode {
  return (
    <>
      {base} — Currently: <strong>{todoHand ?? PLACEHOLDER}</strong>
    </>
  );
}
