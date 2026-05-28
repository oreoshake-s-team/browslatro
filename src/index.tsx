import React from "react";
import ReactDOM from "react-dom/client";
import { enableDragDropTouch } from "@dragdroptouch/drag-drop-touch";
import "./index.css";
import App from "./App";
import { Telemetry } from "./Telemetry";
import reportWebVitals from "./reportWebVitals";

enableDragDropTouch();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
    <Telemetry />
  </React.StrictMode>
);

reportWebVitals();