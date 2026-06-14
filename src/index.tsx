import React from "react";
import ReactDOM from "react-dom/client";
import { enableDragDropTouch } from "@dragdroptouch/drag-drop-touch";
import "./styles/tokens.css";
import "./styles/buttons.css";
import "./styles/deckThemes.css";
import "./index.css";
import "./i18n";
import App from "./App";
import { Telemetry } from "./Telemetry";
import reportWebVitals from "./reportWebVitals";
import { restoreSnapshotIfPresent, subscribeAndAutoSave } from "./save/restore";

enableDragDropTouch();

restoreSnapshotIfPresent();
subscribeAndAutoSave();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
    <Telemetry />
  </React.StrictMode>
);

reportWebVitals();