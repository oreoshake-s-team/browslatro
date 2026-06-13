import { useEffect, useState } from "react";
import "./BossEffectToast.css";

type Listener = () => void;

interface ToastState {
  readonly text: string;
  readonly nonce: number;
}

let current: ToastState = { text: "", nonce: 0 };
const listeners = new Set<Listener>();

export function showBossEffectToast(text: string): void {
  current = { text, nonce: current.nonce + 1 };
  listeners.forEach((listener) => listener());
}

const TOAST_MS = 2600;

export default function BossEffectToast(): React.JSX.Element | null {
  const [shown, setShown] = useState<ToastState | null>(null);

  useEffect(() => {
    const update = (): void => setShown(current);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  useEffect(() => {
    if (shown === null) return;
    const timer = window.setTimeout(() => setShown(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (shown === null || shown.text === "") return null;

  return (
    <div
      key={shown.nonce}
      className="boss-effect-toast"
      role="status"
      aria-live="assertive"
      data-testid="boss-effect-toast"
    >
      {shown.text}
    </div>
  );
}
