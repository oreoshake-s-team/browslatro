import {
  applyOfferToState as realApplyOfferToState,
  bestShopChoice as realBestShopChoice,
  rolloutValue as realRolloutValue,
  type PostShopState,
  type RolloutOptions,
} from "./shopRolloutExpert";
import {
  shopItemSnapshot,
  type AdviceFeedbackEvent,
  type RunEventRecord,
} from "./runEvents";

export interface ShopGateConfig {
  readonly minScoreFraction: number;
}

export const DEFAULT_SHOP_GATE: ShopGateConfig = { minScoreFraction: 0.25 };

export interface ShopGateDeps {
  readonly bestShopChoice: typeof realBestShopChoice;
  readonly rolloutValue: typeof realRolloutValue;
  readonly applyOfferToState: typeof realApplyOfferToState;
}

const realDeps: ShopGateDeps = {
  bestShopChoice: realBestShopChoice,
  rolloutValue: realRolloutValue,
  applyOfferToState: realApplyOfferToState,
};

function isShopFeedback(
  record: RunEventRecord,
): record is RunEventRecord & AdviceFeedbackEvent {
  return record.kind === "advice-feedback";
}

export async function isShopCorrectionJustified(
  record: RunEventRecord,
  opts: RolloutOptions,
  config: ShopGateConfig = DEFAULT_SHOP_GATE,
  deps: ShopGateDeps = realDeps,
): Promise<boolean> {
  if (!isShopFeedback(record)) return true;
  const { decision, correctedIndex } = record;
  if (decision.context !== "shop" || decision.rollout === undefined) return true;
  if (correctedIndex === null) return true;
  const corrected = decision.candidates[correctedIndex];
  if (corrected === undefined || corrected.action === "reroll") return true;

  const { rollout } = decision;
  const state: PostShopState = {
    jokers: rollout.jokers,
    money: decision.state.money,
    handStats: rollout.handStats,
    deck: rollout.deck,
  };
  const ante = decision.state.ante;
  const seed = record.runSeed;
  const { bestValue, leaveValue } = await deps.bestShopChoice(
    ante,
    rollout.offers,
    state,
    opts,
    seed,
  );
  if (bestValue <= 0) return true;

  let correctedValue: number;
  if (corrected.action === "leave") {
    correctedValue = leaveValue;
  } else {
    const offer = rollout.offers.find(
      (o) => shopItemSnapshot(o, o.price).id === corrected.item.id,
    );
    if (offer === undefined) return true;
    const post = deps.applyOfferToState(offer, state);
    if (post === null) return true;
    correctedValue = await deps.rolloutValue(ante, post, opts, seed + 1);
  }
  return correctedValue >= bestValue * config.minScoreFraction;
}

export async function gateShopCorrections(
  records: ReadonlyArray<RunEventRecord>,
  opts: RolloutOptions,
  config: ShopGateConfig = DEFAULT_SHOP_GATE,
  deps: ShopGateDeps = realDeps,
): Promise<ReadonlyArray<RunEventRecord>> {
  const kept: RunEventRecord[] = [];
  for (const record of records) {
    if (await isShopCorrectionJustified(record, opts, config, deps)) {
      kept.push(record);
    }
  }
  return kept;
}
