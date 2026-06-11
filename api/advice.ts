import { handleAdviceRequest } from "../src/ai/advisor/handler";

export const maxDuration = 30;

export function POST(request: Request): Promise<Response> {
  return handleAdviceRequest(request);
}
