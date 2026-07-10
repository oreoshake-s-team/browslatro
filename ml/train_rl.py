"""Self-play REINFORCE for the shop policy.

Reads self-play records (shop/pack RunEventRecords augmented with a ``return``
field — the final outcome of the game the decision belonged to) and updates the
CandidateScorer by policy gradient: increase the log-probability of sampled
actions that beat the baseline return, decrease it for those below.

This is the outcome-based counterpart to the supervised rollout teacher: there
is no "correct" label, only the realised return of the action that was actually
sampled, so leaving / rerolling are rewarded exactly when they led to a better
game.

Stabilizers (an unguarded signed-advantage cross-entropy diverges: negative
advantages drive the chosen log-prob to -inf and collapse the policy):
  * value baseline + standardized, tail-clamped advantages (``--adv-clip``);
  * a log-prob floor (``--logp-floor``) bounding the per-decision update;
  * an entropy bonus (``--entropy-coef``) keeping the policy stochastic.

``--init <onnx>`` warm-starts the scorer from an existing shop policy (its ONNX
initializers are named like the torch state_dict, so the load is by-name). This
is what makes *on-policy* iteration possible: warm-start from the policy that
generated the self-play data so the gradient improves that policy in place.

With ``--init`` set, ``--ppo-clip`` adds a PPO trust region: the warm-started
model is also the behaviour policy, so each decision's old action-probability is
known, and clipping the new/old ratio keeps every round's update close to the
sampling policy. This is what stops on-policy iteration from overshooting and
oscillating between behaviour modes; ``--ppo-clip 0`` falls back to REINFORCE.
"""

import argparse
import json
import random

from encoding import (
    SHOP_CONTEXT_FEATURES,
    SHOP_INPUT_FEATURES,
    SHOP_INPUT_FEATURES_V2,
    encode_shop_decision,
    encode_shop_decision_v2,
)


def reward_to_go(total_return, blinds_cleared_before):
    """Future-only return for one decision: blinds cleared *after* it was made.

    Self-play shop records carry ``round`` = blinds already cleared when the
    decision happened (the headless run passes ``round: blindsCleared`` to
    ``buyAfterRound``), so the game's total return splits into a past the
    decision could not have caused and a future it could. Crediting only the
    future removes the variance of early luck from late decisions and stops
    early decisions in long runs from soaking up credit for blinds that were
    already banked before the shop even opened.
    """
    return max(0.0, float(total_return) - float(blinds_cleared_before))


def load_selfplay(paths, v2=False, use_reward_to_go=False):
    """Yields (candidate_vectors, sampled_index, game_return) per decision."""
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    decisions = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if "return" not in record:
                    continue
                inputs, chosen = encode(record)
                if not inputs or chosen < 0 or chosen >= len(inputs):
                    continue
                ret = (
                    reward_to_go(record["return"], record.get("round", 0))
                    if use_reward_to_go
                    else float(record["return"])
                )
                decisions.append((inputs, chosen, ret))
    return decisions


def load_selfplay_games(paths, v2=False):
    """Groups self-play decisions into ordered per-game sequences.

    A game is a contiguous run of records sharing a ``runSeed`` (the collector
    writes each game's decision buffer in order, and shard seed ranges are
    disjoint). Each game is ``{"return": R, "rounds": [...], "decisions":
    [(inputs, chosen), ...]}`` — exactly what within-run temporal credit needs.
    """
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    games = []
    current_seed = object()
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if "return" not in record:
                    continue
                inputs, chosen = encode(record)
                if not inputs or chosen < 0 or chosen >= len(inputs):
                    continue
                seed = record.get("runSeed")
                if seed != current_seed or not games:
                    games.append({"return": float(record["return"]), "rounds": [], "decisions": []})
                    current_seed = seed
                games[-1]["rounds"].append(float(record.get("round", 0)))
                games[-1]["decisions"].append((inputs, chosen))
    return games


def load_teacher_labels(paths, v2=False):
    """Yields (candidate_vectors, chosen_index) for LLM-teacher-labeled shops.

    Only records the shop-teacher generator marked ``teacherLabeled`` are used
    (the LLM was consulted on a contested shop and its pick is the label). These
    carry no ``return`` field, so ``load_selfplay`` ignores them — they train the
    policy only through the auxiliary distillation cross-entropy term, pulling it
    toward the teacher's choice on the states the teacher judged.
    """
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    labels = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if record.get("teacherLabeled") is not True:
                    continue
                inputs, chosen = encode(record)
                if not inputs or chosen < 0 or chosen >= len(inputs):
                    continue
                labels.append((inputs, chosen))
    return labels


def collect_aux_labels(args):
    """Gathers every offline distillation channel into one ``(inputs, chosen,
    coef)`` pool.

    The RL trainer's outcome signal is realized ``return``; these channels have
    no return, so they can only enter the fine-tune as an auxiliary
    cross-entropy that pulls the warm-started policy toward a human/LLM choice
    on the states they cover. Folding them here — rather than training a
    standalone supervised model on them — is what keeps human and LLM shop
    signal *adding to* the RL incumbent instead of trying to replace it (see
    docs/ai-advisor/ml-pipeline.md, "Enhance the incumbent, never replace it").
    Each source keeps its own coefficient so a noisier channel can be trusted
    less. `load_shop_decisions` (raw human shop decisions) and
    `load_feedback_corrections`/`_agreements` are the same shop-context loaders
    the supervised trainer uses, so a label is encoded identically here.
    """
    from dataset import (
        load_feedback_agreements,
        load_feedback_corrections,
        load_shop_decisions,
    )

    labels = []
    for inputs, chosen in load_teacher_labels(args.teacher, v2=args.v2):
        labels.append((inputs, chosen, args.teacher_coef))
    for path in args.human:
        for inputs, chosen, _seed, _weight in load_shop_decisions(path, v2=args.v2):
            labels.append((inputs, chosen, args.human_coef))
    for inputs, chosen, _seed, _weight in load_feedback_corrections(
        args.corrections, "shop", v2=args.v2
    ):
        labels.append((inputs, chosen, args.corrections_coef))
    for inputs, chosen, _seed, _weight in load_feedback_agreements(
        args.agreements, "shop", v2=args.v2
    ):
        labels.append((inputs, chosen, args.agreements_coef))
    return labels


def game_rewards(rounds, total_return):
    """Per-decision rewards from within-run blind counts.

    ``rounds`` is blinds-cleared at each decision; the reward of decision t is
    the blinds banked before the next decision (0 between decisions in the same
    shop visit), and the last decision earns everything that followed it.
    """
    rewards = []
    for t in range(len(rounds) - 1):
        rewards.append(rounds[t + 1] - rounds[t])
    rewards.append(max(0.0, float(total_return) - rounds[-1]))
    return rewards


def gae_advantages(rewards, values, lam):
    """Generalized advantage estimation over one game (gamma = 1).

    TD residuals ``d_t = r_t + V(s_{t+1}) - V(s_t)`` (terminal V = 0) are mixed
    with decay ``lam``: A_t = d_t + lam * A_{t+1}. lam=0 is pure one-step TD
    (each decision credited only by its own marginal state improvement); lam=1
    telescopes back to the Monte-Carlo form (reward-to-go minus V(s_t)).
    """
    advantages = [0.0] * len(rewards)
    running = 0.0
    for t in range(len(rewards) - 1, -1, -1):
        next_value = values[t + 1] if t + 1 < len(values) else 0.0
        delta = rewards[t] + next_value - values[t]
        running = delta + lam * running
        advantages[t] = running
    return advantages


def warm_start(model, onnx_path, device, torch):
    """Load named initializers from an onnx shop policy into ``model``.

    The exported scorer's ONNX initializers are named like the torch state_dict
    (``layers.0.weight`` ...), so the load is by-name. Raises if any parameter is
    missing or shape-mismatched so a stale/incompatible checkpoint fails loudly
    rather than silently warm-starting from a random init.
    """
    import onnx
    from onnx import numpy_helper

    state = model.state_dict()
    loaded = 0
    for tensor in onnx.load(onnx_path).graph.initializer:
        if tensor.name not in state:
            continue
        weights = torch.tensor(
            numpy_helper.to_array(tensor), dtype=torch.float32, device=device
        )
        if weights.shape != state[tensor.name].shape:
            raise SystemExit(
                f"--init shape mismatch for {tensor.name}: "
                f"{tuple(weights.shape)} vs {tuple(state[tensor.name].shape)}"
            )
        state[tensor.name] = weights
        loaded += 1
    if loaded != len(state):
        raise SystemExit(
            f"--init only matched {loaded}/{len(state)} parameters in {onnx_path}"
        )
    model.load_state_dict(state)
    return loaded


def normalized_advantages(returns, clip):
    """Standardize returns against the mean baseline, then clamp the tails.

    The constant mean is the value baseline: advantage = return - E[return].
    Clamping bounds how large a single high/low-return decision can push the
    policy, which (together with the log-prob floor and the entropy bonus in the
    loss) keeps REINFORCE from collapsing to a degenerate deterministic policy.
    """
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / len(returns)
    std = max(var ** 0.5, 1e-6)
    return [max(-clip, min(clip, (r - mean) / std)) for r in returns]


def value_baseline_advantages(returns, values, clip):
    """Per-decision advantage against a *learned* state-value baseline.

    ``advantage = return - V(state)``, then standardized and clamped like
    ``normalized_advantages``. Unlike the constant mean baseline, ``V(state)``
    accounts for how hard each state is (an ante-5 shop expects a higher return
    than an ante-1 shop), so a decision is credited by how much its run beat the
    *expectation for that state* rather than the global average — the causal
    credit signal the flat baseline can't provide. Pure/torch-free so the
    normalization matches the training loop and stays unit-testable.
    """
    residuals = [r - v for r, v in zip(returns, values)]
    mean = sum(residuals) / len(residuals)
    var = sum((a - mean) ** 2 for a in residuals) / len(residuals)
    std = max(var ** 0.5, 1e-6)
    return [max(-clip, min(clip, (a - mean) / std)) for a in residuals]


def pearson(xs, ys):
    """Pearson correlation, torch-free; 0.0 when either side is constant.

    Used to report how well the trained V(context) tracks realized
    reward-to-go — the quality gate for using V as a search evaluator.
    """
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    if var_x <= 0 or var_y <= 0:
        return 0.0
    return cov / ((var_x ** 0.5) * (var_y ** 0.5))


def clipped_surrogate(ratio, advantage, clip):
    """PPO surrogate for one decision: ``min(r*A, clamp(r, 1±clip)*A)``.

    ``ratio`` is the new/old action-probability ratio. Clipping the ratio keeps
    each round's update inside a trust region around the policy that generated
    the self-play, which is what stops the on-policy iteration from overshooting
    and oscillating between behaviour modes. The reference for the torch loop;
    kept pure so it is unit-testable without torch.
    """
    clamped = max(1.0 - clip, min(1.0 + clip, ratio))
    return min(ratio * advantage, clamped * advantage)


def clipped_surrogate_torch(ratio, advantage, clip):
    """Vectorized ``clipped_surrogate`` for tensors — must match the pure
    reference elementwise (pinned by a unit test), so the tested math is the
    trained math."""
    import torch

    return torch.min(
        ratio * advantage,
        torch.clamp(ratio, 1.0 - clip, 1.0 + clip) * advantage,
    )


def masked_log_probs(logits, mask):
    """Row-wise log-softmax over a ragged, padded candidate batch.

    Padded candidates (``mask`` False) are set to -inf before the softmax, so
    ``exp(-inf)=0`` leaves them out of the denominator — identical to scoring
    each decision on its own ragged candidate set.
    """
    import torch

    return torch.nn.functional.log_softmax(logits.masked_fill(~mask, float("-inf")), dim=1)


def masked_entropy(log_probs, mask):
    """Per-decision entropy that ignores padded candidates.

    Padded log-probs are -inf, so ``p * log p`` would be ``0 * -inf = nan`` (and
    its gradient nan). Replacing the *log-prob* factor with 0 at padded positions
    keeps both the value and the gradient finite while leaving real candidates
    untouched.
    """
    return -(log_probs.exp() * log_probs.masked_fill(~mask, 0.0)).sum(dim=1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("datasets", nargs="+")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--entropy-coef", type=float, default=0.01)
    parser.add_argument("--adv-clip", type=float, default=3.0)
    parser.add_argument("--logp-floor", type=float, default=10.0)
    parser.add_argument(
        "--init",
        default=None,
        help="warm-start CandidateScorer from an existing shop-policy onnx",
    )
    parser.add_argument(
        "--ppo-clip",
        type=float,
        default=0.2,
        help="PPO trust-region clip; needs --init (the old policy). 0 disables (plain REINFORCE)",
    )
    parser.add_argument(
        "--v2",
        action="store_true",
        help="use the use-aware shop encoding (79 features) for a v11+ policy",
    )
    parser.add_argument(
        "--teacher",
        action="append",
        default=[],
        help="JSONL of LLM-teacher-labeled shop decisions (teacherLabeled). Folds "
        "in as an auxiliary cross-entropy toward the teacher's contested-shop picks",
    )
    parser.add_argument("--teacher-coef", type=float, default=1.0)
    parser.add_argument(
        "--human",
        action="append",
        default=[],
        help="JSONL of human-play exports; raw human shop decisions "
        "(purchase/reroll/pack-pick/use) fold in as an auxiliary cross-entropy "
        "toward the human's actual pick",
    )
    parser.add_argument("--human-coef", type=float, default=1.0)
    parser.add_argument(
        "--corrections",
        action="append",
        default=[],
        help="JSONL of human-play exports; advice-feedback shop corrections fold in "
        "as an auxiliary cross-entropy toward the human's corrected pick",
    )
    parser.add_argument("--corrections-coef", type=float, default=1.0)
    parser.add_argument(
        "--agreements",
        action="append",
        default=[],
        help="JSONL of human-play exports; explicit shop thumbs-up agreements fold "
        "in as an auxiliary cross-entropy toward the confirmed pick",
    )
    parser.add_argument("--agreements-coef", type=float, default=1.0)
    parser.add_argument(
        "--value-baseline",
        action="store_true",
        help="learn a state-value baseline V(s) for per-decision advantage "
        "(advantage = return - V(s)) instead of the constant mean baseline",
    )
    parser.add_argument(
        "--value-coef",
        type=float,
        default=0.5,
        help="weight of the value-network MSE loss when --value-baseline is set",
    )
    parser.add_argument(
        "--reward-to-go",
        action="store_true",
        help="credit each decision with only the blinds cleared AFTER it "
        "(return - record.round) instead of the whole game return",
    )
    parser.add_argument(
        "--gae",
        type=float,
        default=None,
        metavar="LAMBDA",
        help="within-run TD/GAE decision-level advantage (lambda in [0,1]; "
        "0 = pure one-step TD, 1 = Monte-Carlo); requires --value-baseline",
    )
    parser.add_argument("--out", default="advisor-shop-policy-rl.onnx")
    parser.add_argument(
        "--value-out",
        default=None,
        help="also export the trained value network V(context) to this onnx path "
        "(requires --value-baseline); reports V's correlation with realized "
        "reward-to-go so downstream search can judge the estimator's quality",
    )
    args = parser.parse_args()

    if args.gae is not None and not args.value_baseline:
        raise SystemExit("--gae requires --value-baseline (V(s) supplies the TD residuals)")
    if args.value_out is not None and not args.value_baseline:
        raise SystemExit("--value-out requires --value-baseline (there is no V(s) to export)")

    import copy

    import torch

    from train import CandidateScorer, resolve_device

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    features = SHOP_INPUT_FEATURES_V2 if args.v2 else SHOP_INPUT_FEATURES
    game_spans = []
    if args.gae is not None:
        games = load_selfplay_games(args.datasets, v2=args.v2)
        samples = []
        for game in games:
            game_spans.append((len(samples), game["rounds"], game["return"]))
            for (inputs, chosen), rnd in zip(game["decisions"], game["rounds"]):
                samples.append((inputs, chosen, reward_to_go(game["return"], rnd)))
        print(f"GAE lambda={args.gae}: within-run decision-level credit over {len(games)} games")
    else:
        samples = load_selfplay(args.datasets, v2=args.v2, use_reward_to_go=args.reward_to_go)
        if args.reward_to_go:
            print("reward-to-go credit: return = blinds cleared after each decision")
    if not samples:
        raise SystemExit("no self-play decisions with a return field")
    const_adv = normalized_advantages([d[2] for d in samples], args.adv_clip)

    aux_labels = collect_aux_labels(args)
    if aux_labels:
        print(
            f"{len(aux_labels)} auxiliary distillation labels "
            f"(teacher coef {args.teacher_coef}, human coef {args.human_coef}, "
            f"corrections coef {args.corrections_coef}, agreements coef {args.agreements_coef})"
        )

    device = resolve_device(args.device)
    model = CandidateScorer(features, args.hidden).to(device)
    if args.init:
        loaded = warm_start(model, args.init, device, torch)
        print(f"warm-started {loaded} tensors from {args.init}")

    import torch.nn as nn

    class ValueNet(nn.Module):
        def __init__(self, context_features, hidden):
            super().__init__()
            self.layers = nn.Sequential(
                nn.Linear(context_features, hidden // 2),
                nn.ReLU(),
                nn.Linear(hidden // 2, 1),
            )

        def forward(self, ctx):
            return self.layers(ctx).squeeze(-1)

    value_net = (
        ValueNet(SHOP_CONTEXT_FEATURES, args.hidden).to(device)
        if args.value_baseline
        else None
    )

    use_ppo = bool(args.init) and args.ppo_clip > 0
    # Each decision has a ragged candidate set, so a minibatch is padded to the
    # batch's max candidate count and the padding is masked to -inf before the
    # softmax (exp(-inf)=0, so it contributes nothing). This is numerically
    # equivalent to scoring each decision on its own, but runs as one batched
    # forward instead of a Python loop over decisions.
    def pad_batch(batch_idx):
        rows = [samples[j] for j in batch_idx]
        max_n = max(len(inp) for inp, _, _ in rows)
        feats = len(rows[0][0][0])
        size = len(rows)
        x = torch.zeros((size, max_n, feats), dtype=torch.float32, device=device)
        mask = torch.zeros((size, max_n), dtype=torch.bool, device=device)
        chosen = torch.empty(size, dtype=torch.long, device=device)
        ret = torch.empty(size, dtype=torch.float32, device=device)
        for b, (inp, ch, r) in enumerate(rows):
            n = len(inp)
            x[b, :n] = torch.tensor(inp, dtype=torch.float32, device=device)
            mask[b, :n] = True
            chosen[b] = ch
            ret[b] = r
        return x, mask, chosen, ret

    def chosen_log_probs(log_probs, chosen):
        return log_probs.gather(1, chosen.unsqueeze(1)).squeeze(1)

    def pad_aux_batch(batch_idx):
        rows = [aux_labels[j] for j in batch_idx]
        max_n = max(len(inp) for inp, _, _ in rows)
        feats = len(rows[0][0][0])
        size = len(rows)
        x = torch.zeros((size, max_n, feats), dtype=torch.float32, device=device)
        mask = torch.zeros((size, max_n), dtype=torch.bool, device=device)
        chosen = torch.empty(size, dtype=torch.long, device=device)
        coef = torch.empty(size, dtype=torch.float32, device=device)
        for b, (inp, ch, cf) in enumerate(rows):
            n = len(inp)
            x[b, :n] = torch.tensor(inp, dtype=torch.float32, device=device)
            mask[b, :n] = True
            chosen[b] = ch
            coef[b] = cf
        return x, mask, chosen, coef

    aux_order = list(range(len(aux_labels)))
    aux_cursor = 0

    old_logps = None
    if use_ppo:
        old_model = copy.deepcopy(model).to(device)
        old_model.eval()
        old_logps = [0.0] * len(samples)
        with torch.no_grad():
            for i in range(0, len(samples), args.batch_size):
                batch = list(range(i, min(i + args.batch_size, len(samples))))
                x, mask, chosen, _ = pad_batch(batch)
                lp = chosen_log_probs(masked_log_probs(old_model(x), mask), chosen)
                for k, j in enumerate(batch):
                    old_logps[j] = float(lp[k])
        print(f"PPO trust region clip={args.ppo_clip} (old policy = {args.init})")
    else:
        print("plain REINFORCE (no --init / --ppo-clip 0)")

    indexed = list(range(len(samples)))
    params = list(model.parameters())
    if value_net is not None:
        params += list(value_net.parameters())
        print(f"value baseline: V(s) over {SHOP_CONTEXT_FEATURES} context features (coef {args.value_coef})")
    optimizer = torch.optim.Adam(params, lr=args.lr)
    print(f"{len(samples)} self-play decisions on {device}")

    def epoch_value_predictions():
        assert value_net is not None
        values = [0.0] * len(samples)
        with torch.no_grad():
            for i in range(0, len(samples), args.batch_size):
                batch = list(range(i, min(i + args.batch_size, len(samples))))
                x, _, _, _ = pad_batch(batch)
                v = value_net(x[:, 0, :SHOP_CONTEXT_FEATURES])
                for k, j in enumerate(batch):
                    values[j] = float(v[k])
        return values

    def epoch_value_baseline_advantages():
        return value_baseline_advantages(
            [d[2] for d in samples], epoch_value_predictions(), args.adv_clip
        )

    def epoch_gae_advantages():
        values = epoch_value_predictions()
        raw = [0.0] * len(samples)
        for start, rounds, total_return in game_spans:
            rewards = game_rewards(rounds, total_return)
            game_values = values[start : start + len(rounds)]
            for k, adv in enumerate(gae_advantages(rewards, game_values, args.gae)):
                raw[start + k] = adv
        return normalized_advantages(raw, args.adv_clip)

    for epoch in range(args.epochs):
        if args.gae is not None:
            epoch_adv = epoch_gae_advantages()
        elif value_net is not None:
            epoch_adv = epoch_value_baseline_advantages()
        else:
            epoch_adv = None
        random.shuffle(indexed)
        total = 0.0
        total_entropy = 0.0
        total_value = 0.0
        total_distill = 0.0
        for i in range(0, len(indexed), args.batch_size):
            batch = indexed[i : i + args.batch_size]
            optimizer.zero_grad()
            x, mask, chosen, ret = pad_batch(batch)
            log_probs = masked_log_probs(model(x), mask)
            chosen_logp = chosen_log_probs(log_probs, chosen)
            entropy = masked_entropy(log_probs, mask)
            value_loss = torch.zeros((), device=device)
            if value_net is not None:
                values = value_net(x[:, 0, :SHOP_CONTEXT_FEATURES])
                value_loss = torch.nn.functional.mse_loss(values, ret)
                assert epoch_adv is not None
                adv = torch.tensor([epoch_adv[j] for j in batch], dtype=torch.float32, device=device)
            else:
                adv = torch.tensor([const_adv[j] for j in batch], dtype=torch.float32, device=device)
            if use_ppo:
                old_lp = torch.tensor([old_logps[j] for j in batch], dtype=torch.float32, device=device)
                ratio = torch.exp(chosen_logp - old_lp)
                surrogate = clipped_surrogate_torch(ratio, adv, args.ppo_clip)
                per_decision = -surrogate - args.entropy_coef * entropy
            else:
                clamped = chosen_logp.clamp(min=-args.logp_floor)
                per_decision = -adv * clamped - args.entropy_coef * entropy
            loss = per_decision.sum()
            distill = torch.zeros((), device=device)
            if aux_labels:
                if aux_cursor >= len(aux_order):
                    random.shuffle(aux_order)
                    aux_cursor = 0
                ab = aux_order[aux_cursor : aux_cursor + args.batch_size]
                aux_cursor += len(ab)
                ax, amask, achosen, acoef = pad_aux_batch(ab)
                alp = chosen_log_probs(masked_log_probs(model(ax), amask), achosen)
                distill = (-acoef * alp).mean()
            (loss / len(batch) + args.value_coef * value_loss + distill).backward()
            optimizer.step()
            total += float(loss)
            total_entropy += float(entropy.sum())
            total_value += float(value_loss) * len(batch)
            total_distill += float(distill)
        n = len(samples)
        value_msg = f" value_mse={total_value / n:.4f}" if value_net is not None else ""
        steps = (len(indexed) + args.batch_size - 1) // args.batch_size
        distill_msg = f" distill={total_distill / steps:.4f}" if aux_labels else ""
        print(
            f"epoch {epoch + 1}: loss={total / n:.4f} entropy={total_entropy / n:.4f}"
            f"{value_msg}{distill_msg}"
        )

    model.eval()
    example = torch.zeros((2, features), dtype=torch.float32, device=device)
    torch.onnx.export(
        model,
        (example,),
        args.out,
        input_names=["candidates"],
        output_names=["logits"],
        dynamic_axes={"candidates": {0: "n"}, "logits": {0: "n"}},
        opset_version=18,
        external_data=False,
    )
    print(f"exported {args.out} (shop encoding, {features} features)")

    if args.value_out is not None and value_net is not None:
        value_net.eval()
        predicted = [0.0] * len(samples)
        with torch.no_grad():
            for i in range(0, len(samples), args.batch_size):
                batch = list(range(i, min(i + args.batch_size, len(samples))))
                x, _, _, _ = pad_batch(batch)
                v = value_net(x[:, 0, :SHOP_CONTEXT_FEATURES])
                for k, j in enumerate(batch):
                    predicted[j] = float(v[k])
        targets = [s[2] for s in samples]
        corr = pearson(predicted, targets)
        value_example = torch.zeros((2, SHOP_CONTEXT_FEATURES), dtype=torch.float32, device=device)
        torch.onnx.export(
            value_net,
            (value_example,),
            args.value_out,
            input_names=["context"],
            output_names=["value"],
            dynamic_axes={"context": {0: "n"}, "value": {0: "n"}},
            opset_version=18,
            external_data=False,
        )
        print(
            f"exported {args.value_out} (value net, {SHOP_CONTEXT_FEATURES} context features, "
            f"corr(V, target)={corr:.3f} over {len(samples)} decisions)"
        )


if __name__ == "__main__":
    main()
