const FAKE_AUTOPILOT_POLICY_KEY = "browslatro:fakeAutopilotPolicy";

/**
 * Test-only seam: when `localStorage["browslatro:fakeAutopilotPolicy"]` is
 * `"1"`, the autopilot uses an instant, deterministic greedy ranker instead of
 * downloading the ONNX policy model. This lets e2e specs exercise the autopilot
 * propose/approve flow without racing the model download in CI.
 */
export function fakeAutopilotPolicyEnabled(): boolean {
  try {
    return window.localStorage.getItem(FAKE_AUTOPILOT_POLICY_KEY) === "1";
  } catch {
    return false;
  }
}
