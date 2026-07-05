import { readFileSync } from "node:fs";
import type { HeadlessShopAgent } from "./headlessRun";
import {
  createHeadlessShopAgent,
  type HeadlessShopAgentOptions,
  type ShopActionChoiceInput,
} from "./headlessShopAgent";
import { searchShopVisit, type StateEvaluator } from "./advisor/shopVisitSearch";
import { SHOP_CONTEXT_FEATURES } from "./advisor/shopEncoding";

export function searchChooser(
  evaluate: StateEvaluator,
): (input: ShopActionChoiceInput) => Promise<number> {
  return async (input) => {
    const plan = await searchShopVisit(
      {
        candidates: input.candidates,
        state: { build: input.build, money: input.money },
        ante: input.ante,
        round: input.round,
      },
      evaluate,
    );
    if (plan.firstIndex !== null) return plan.firstIndex;
    const leave = input.candidates.findIndex((candidate) => candidate.action === "leave");
    if (leave === -1) {
      throw new Error("shop visit search found no plan and no leave candidate");
    }
    return leave;
  };
}

export async function createValueEvaluator(valueModelPath: string): Promise<StateEvaluator> {
  const bytes = readFileSync(valueModelPath);
  const ort = await import("onnxruntime-web");
  const session = await ort.InferenceSession.create(bytes);
  return async (contexts, rows) => {
    const input = new ort.Tensor("float32", contexts, [rows, SHOP_CONTEXT_FEATURES]);
    const { value } = await session.run({ context: input });
    return value.data as Float32Array;
  };
}

export async function createSearchShopAgent(
  valueModelPath: string,
  packPolicyModelPath: string,
  options: HeadlessShopAgentOptions = {},
): Promise<HeadlessShopAgent> {
  const evaluate = await createValueEvaluator(valueModelPath);
  return createHeadlessShopAgent(packPolicyModelPath, {
    ...options,
    chooseShopAction: searchChooser(evaluate),
  });
}
