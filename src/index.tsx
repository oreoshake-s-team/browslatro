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
import { isAuthEnabled } from "./components/auth/config";

enableDragDropTouch();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const authEnabled = isAuthEnabled();
root.render(
  <React.StrictMode>
    <AuthProvider>
      {authEnabled ? (
        <LoginGate>
          <App />
          <UserMenu />
        </LoginGate>
      ) : (
        <App />
      )}
      <Telemetry />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();