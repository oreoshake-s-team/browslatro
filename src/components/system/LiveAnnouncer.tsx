import { useSyncExternalStore } from "react";
import "./LiveAnnouncer.css";

type Listener = () => void;

let currentMessage = "";
const listeners = new Set<Listener>();

export function announce(text: string): void {
  currentMessage = currentMessage === text ? `${text}\u00A0` : text;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  return currentMessage;
}

export default function LiveAnnouncer() {
  const message = useSyncExternalStore(subscribe, getSnapshot);
  return (
    <div
      className="live-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="live-announcer"
    >
      {message}
    </div>
  );
}
