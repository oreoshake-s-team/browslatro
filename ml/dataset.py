"""JSONL dataset loading for the advisor policy network."""

import json
import sys

from encoding import (
    HAND_SLOTS,
    _encode_shop_candidate,
    _encode_shop_context,
    _shop_build_signals,
    encode_decision,
    encode_shop_decision,
    encode_shop_decision_v2,
)

DATASET_SCHEMA_VERSION = 1
SHOP_SCHEMA_VERSION = 4
SUPPORTED_SHOP_SCHEMA_VERSIONS = frozenset({2, 3, 4})

_SHOP_KINDS = frozenset({"purchase", "reroll", "pack-pick", "use"})


def load_decisions(path, weight=1.0):
    """Loads a JSONL file into (candidate_vectors, chosen_index) decisions.

    Skips records where the expert's action was not among the offered
    candidates (chosenIndex == -1), and decisions the fixed-size encoding
    cannot represent (hands wider than HAND_SLOTS, from hand-size jokers
    and vouchers in human play).
    """
    decisions = []
    unencodable = 0
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("kind") is not None:
                continue
            version = record["schemaVersion"]
            if version != DATASET_SCHEMA_VERSION:
                raise ValueError(
                    f"{path}:{line_number}: schemaVersion {version}, "
                    f"expected {DATASET_SCHEMA_VERSION}"
                )
            if len(record["state"]["hand"]) > HAND_SLOTS:
                unencodable += 1
                continue
            inputs, chosen = encode_decision(record)
            if chosen < 0 or not inputs:
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
    if unencodable:
        print(
            f"{path}: skipped {unencodable} decision(s) with hands wider "
            f"than {HAND_SLOTS} slots",
            file=sys.stderr,
        )
    return decisions


def load_all(paths, weight=1.0):
    """Concatenates decisions from several JSONL files.

    Lets the generated expert dataset and in-game human-play exports train
    together: each file is validated independently by load_decisions, and
    every decision carries the given training weight.
    """
    return [
        decision for path in paths for decision in load_decisions(path, weight)
    ]


def _iter_shop_records(path):
    """Yields validated schema-v2 shop RunEventRecords from a JSONL file.

    Skips blank lines and non-shop run events; raises on an unexpected schema
    version so a stale dataset fails loudly.
    """
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("kind") not in _SHOP_KINDS:
                continue
            version = record["schemaVersion"]
            if version not in SUPPORTED_SHOP_SCHEMA_VERSIONS:
                raise ValueError(
                    f"{path}:{line_number}: schemaVersion {version}, "
                    f"expected one of {sorted(SUPPORTED_SHOP_SCHEMA_VERSIONS)}"
                )
            yield record


def load_shop_decisions(path, weight=1.0, v2=False):
    """Loads shop/pack decisions from a JSONL file of schema-v2 RunEventRecords.

    Handles purchase, reroll, and pack-pick kinds. Skips unrecognised kinds and
    records where encoding produces no candidates or an invalid chosen index.
    v2 selects the use-aware encoding (SHOP_INPUT_FEATURES_V2) so human-play
    exports can train a model in the runtime (v2) encoding.
    """
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    decisions = []
    for record in _iter_shop_records(path):
        inputs, chosen = encode(record)
        if chosen < 0 or not inputs:
            continue
        decisions.append((inputs, chosen, record["runSeed"], weight))
    return decisions


def load_shop_decisions_split(paths, teacher_weight=5.0, v2=False):
    """Loads shop decisions, partitioned into (rollout, teacher) lists.

    Records the generator marked teacherLabeled (the Sonnet 4.6 teacher chose
    them on a contested shop) go to the teacher list at teacher_weight; they are
    meant to always train and never be held out for validation. Everything else
    is a rollout label at weight 1.0, split by seed as usual. Datasets with no
    teacher records yield an empty teacher list, so rollout-only data trains
    exactly as before.
    """
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    rollout = []
    teacher = []
    for path in paths:
        for record in _iter_shop_records(path):
            inputs, chosen = encode(record)
            if chosen < 0 or not inputs:
                continue
            if record.get("teacherLabeled") is True:
                teacher.append((inputs, chosen, record["runSeed"], teacher_weight))
            else:
                rollout.append((inputs, chosen, record["runSeed"], 1.0))
    return rollout, teacher


def _iter_feedback_records(path):
    """Yields advice-feedback RunEventRecords from a JSONL file, skipping others.

    Raises on an unexpected schema version so a stale dataset fails loudly rather
    than KeyError-ing on a changed record shape downstream.
    """
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("kind") != "advice-feedback":
                continue
            version = record.get("schemaVersion")
            if version not in SUPPORTED_SHOP_SCHEMA_VERSIONS:
                raise ValueError(
                    f"{path}:{line_number}: advice-feedback schemaVersion {version}, "
                    f"expected one of {sorted(SUPPORTED_SHOP_SCHEMA_VERSIONS)}"
                )
            yield record


def _encode_hand_label(record, index):
    decision = record["decision"]
    return encode_decision(
        {
            "state": decision["state"],
            "candidates": decision["candidates"],
            "chosenIndex": index,
        }
    )


def _encode_shop_label(record, index, v2=False):
    decision = record["decision"]
    state = decision.get("state", {})
    hand_stats = decision.get("rollout", {}).get("handStats", {})
    flat = {
        "money": record["money"],
        "ante": record["ante"],
        "round": record["round"],
        "jokers": state.get("jokers", []),
        "handLevels": {hand: info.get("level", 1) for hand, info in hand_stats.items()},
        "consumablesHeld": len(state.get("consumables", [])),
        "deckEnhancements": {},
        "picksRemaining": 0,
    }
    sig = _shop_build_signals(flat)
    ctx = _encode_shop_context(flat, sig)
    money = record["money"]
    inputs = []
    for candidate in decision["candidates"]:
        action = candidate["action"]
        if action == "buy":
            item = candidate["item"]
            inputs.append(
                ctx
                + _encode_shop_candidate(
                    item["itemType"],
                    item["cost"],
                    money,
                    sig,
                    category=item.get("category", "other"),
                    attributes=item.get("attributes"),
                    voucher_features=item.get("voucherFeatures"),
                    advances_hands=item.get("advancesHands"),
                )
            )
        elif action == "reroll":
            inputs.append(
                ctx + _encode_shop_candidate(None, candidate["cost"], money, sig, is_reroll=True)
            )
        else:
            inputs.append(ctx + _encode_shop_candidate(None, 0, money, sig, is_leave=True))
    if v2:
        inputs = [row + [0.0] for row in inputs]
    return inputs, index


DEFAULT_MIN_SCORE_FRACTION = 0.25


def _hand_correction_justified(candidates, chosen_index, min_score_fraction):
    """Mirrors isLabelJustified in scripts/labelDisagreements.ts.

    A human downvote is an opinion, not truth. A corrected play is trusted only
    if it scores at least min_score_fraction of the best available play; discards
    (no score to compare) always pass, as does a state with no scoring play.
    """
    if not 0 <= chosen_index < len(candidates):
        return False
    chosen = candidates[chosen_index]
    if chosen.get("action") != "play":
        return True
    play_scores = [c["score"] for c in candidates if c.get("action") == "play"]
    best = max(play_scores) if play_scores else 0
    if best <= 0:
        return True
    return chosen["score"] >= best * min_score_fraction


def load_feedback_corrections(paths, context, weight=5.0, min_score_fraction=None, v2=False):
    """Re-encodes advice-feedback corrections into weighted training labels.

    Only corrections carrying a correctedIndex (the candidate the human would
    pick instead) are trainable; bare downvotes (correctedIndex is None) are
    eval-only and skipped. context selects "hand" or "shop" decisions, which
    encode to different-length vectors for their respective policies. Re-encoding
    reuses the same encoders the live decisions train on, so a correction is just
    another label.

    When min_score_fraction is set, hand corrections pass through the quality
    gate (_hand_correction_justified) so a human's mistake is not distilled into
    the policy. Shop corrections carry no per-candidate score, so the score gate
    does not apply to them (a rollout-based shop gate is a separate step).
    """
    decisions = []
    for path in paths:
        for record in _iter_feedback_records(path):
            if record.get("verdict", "bad") != "bad":
                continue
            if record.get("correctedIndex") is None:
                continue
            decision = record.get("decision", {})
            if decision.get("context") != context:
                continue
            if context == "hand":
                if len(decision["state"]["hand"]) > HAND_SLOTS:
                    continue
                if min_score_fraction is not None and not _hand_correction_justified(
                    decision["candidates"], record["correctedIndex"], min_score_fraction
                ):
                    continue
                inputs, chosen = _encode_hand_label(record, record["correctedIndex"])
            elif context == "shop":
                inputs, chosen = _encode_shop_label(record, record["correctedIndex"], v2=v2)
            else:
                continue
            if not inputs or chosen < 0 or chosen >= len(inputs):
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
    return decisions


def load_feedback_agreements(paths, context, weight=1.0, min_score_fraction=None, v2=False):
    """Re-encodes explicit advisor agreements into weighted positive labels.

    Only explicit thumbs-up records (verdict "good", source "explicit") train;
    implicit auto-agreement records (source "auto-agreement") are eval/telemetry
    only and skipped here, so the policy is not flooded with confirmations of its
    own picks. The label is the recommendationIndex the human confirmed. context
    selects "hand" or "shop". When min_score_fraction is set, hand agreements pass
    the same quality gate as corrections so a weak recommendation is not distilled.
    """
    decisions = []
    for path in paths:
        for record in _iter_feedback_records(path):
            if record.get("verdict") != "good":
                continue
            if record.get("source") != "explicit":
                continue
            index = record.get("recommendationIndex")
            if index is None:
                continue
            decision = record.get("decision", {})
            if decision.get("context") != context:
                continue
            if context == "hand":
                if len(decision["state"]["hand"]) > HAND_SLOTS:
                    continue
                if min_score_fraction is not None and not _hand_correction_justified(
                    decision["candidates"], index, min_score_fraction
                ):
                    continue
                inputs, chosen = _encode_hand_label(record, index)
            elif context == "shop":
                inputs, chosen = _encode_shop_label(record, index, v2=v2)
            else:
                continue
            if not inputs or chosen < 0 or chosen >= len(inputs):
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
    return decisions


def build_training_set(train, *extra_sources):
    """Appends extra decision sources to the generated training split.

    The generated split from split_by_seed is already (inputs, chosen, weight)
    tuples. Each extra source — in-game human play, distilled LLM teacher
    labels — is a list of (inputs, chosen, seed, weight) tuples from load_all;
    the seed is dropped here so these decisions always train and are never held
    out for validation. Sources are independent: pass each at its own weight.
    """
    combined = list(train)
    for source in extra_sources:
        combined.extend(
            (inputs, chosen, weight) for inputs, chosen, _, weight in source
        )
    return combined


def split_by_seed(decisions, validation_fraction=0.2):
    """Deterministic train/validation split keyed on the run seed.

    Splitting by seed keeps all decisions from one game on the same side,
    preventing leakage between nearly-identical consecutive states.
    """
    if not 0 < validation_fraction < 1:
        raise ValueError(f"validation_fraction must be in (0, 1), got {validation_fraction}")
    seeds = sorted({seed for _, _, seed, _ in decisions})
    holdout = max(1, int(len(seeds) * validation_fraction)) if seeds else 0
    validation_seeds = set(seeds[-holdout:]) if holdout else set()
    train = [(i, c, w) for i, c, s, w in decisions if s not in validation_seeds]
    validation = [(i, c, w) for i, c, s, w in decisions if s in validation_seeds]
    return train, validation
