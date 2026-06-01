import React from "react";
import ReactDOM from "react-dom/client";
import { enableDragDropTouch } from "@dragdroptouch/drag-drop-touch";
import "./index.css";
import App from "./App";
import { Telemetry } from "./Telemetry";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "./components/auth/AuthProvider";
import { LoginGate } from "./components/auth/LoginGate";
import { UserMenu } from "./components/auth/UserMenu";

enableDragDropTouch();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LoginGate>
        <App />
        <UserMenu />
      </LoginGate>
      <Telemetry />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();