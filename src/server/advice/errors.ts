export type AdviceErrorCode =
  | "rate_limited"
  | "advisor_busy"
  | "payload_too_large"
  | "invalid_json"
  | "invalid_request"
  | "model_not_configured"
  | "model_timeout"
  | "model_error";
