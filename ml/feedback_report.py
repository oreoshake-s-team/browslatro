"""Suggestion-quality report over the explicit advice-feedback corpus.

Reads advice-feedback RunEventRecords from the human-play JSONL exports and
summarises bad-pick rejections by advisorKind x context. This is the "human
rejected the pick" signal that complements the top-1 agreement metric in
evaluate_real_play.py -- and the scoreboard for whether the local policy is
gaining on the LLM baseline.

No model files required. Run from ml/:

    python3 feedback_report.py --data 'data/human-play/*.jsonl'
"""

import argparse
import glob
import json
from collections import defaultdict

ADVICE_FEEDBACK_KIND = "advice-feedback"

# Maps a run-event kind (or None for a bare hand DatasetRecord) to the advice
# context whose suggestions cover that decision, so rejection counts can be
# read against the volume of decisions actually made in the same context.
_CONTEXT_BY_KIND = {
    None: "hand",
    "purchase": "shop",
    "reroll": "shop",
    "pack-pick": "pack",
    "blind-skip": "blind",
}


def _iter_records(paths):
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                yield json.loads(line)


def load_feedback_events(paths):
    """Returns the advice-feedback records across the given JSONL files."""
    return [
        record
        for record in _iter_records(paths)
        if record.get("kind") == ADVICE_FEEDBACK_KIND
    ]


def summarize_feedback(events):
    """Groups advice-feedback events by (advisorKind, context).

    Each cell counts total downvotes, corrected (correctedIndex is not None, a
    trainable label) and bare (correctedIndex is None, eval-only) rejections.
    """
    summary = defaultdict(lambda: {"downvotes": 0, "corrected": 0, "bare": 0})
    for event in events:
        advisor = event.get("advisorKind", "unknown")
        context = event.get("decision", {}).get("context", "unknown")
        cell = summary[(advisor, context)]
        cell["downvotes"] += 1
        if event.get("correctedIndex") is None:
            cell["bare"] += 1
        else:
            cell["corrected"] += 1
    return dict(summary)


def count_context_decisions(paths):
    """Counts decisions actually made per context, as a rejection-rate proxy.

    Derived from the record kind (a bare hand DatasetRecord -> hand, purchase /
    reroll -> shop, etc.). advice-feedback and other non-decision events are not
    counted. The result is a proxy denominator -- impressions are not logged.
    """
    totals = defaultdict(int)
    for record in _iter_records(paths):
        kind = record.get("kind")
        if kind == ADVICE_FEEDBACK_KIND:
            continue
        context = _CONTEXT_BY_KIND.get(kind)
        if context is not None:
            totals[context] += 1
    return dict(totals)


def format_report(summary, totals):
    """Renders the summary as a text table."""
    if not summary:
        return "No advice-feedback events found."
    header = (
        f"{'advisor':<8} {'context':<6} {'bad':>4} {'corrected':>9} "
        f"{'bare':>4} {'corr%':>6} {'per-100-decisions':>18}"
    )
    lines = [header]
    for advisor, context in sorted(summary):
        cell = summary[(advisor, context)]
        bad = cell["downvotes"]
        corr = cell["corrected"]
        pct = (100.0 * corr / bad) if bad else 0.0
        total = totals.get(context, 0)
        rate = f"{100.0 * bad / total:.1f}" if total else "n/a"
        lines.append(
            f"{advisor:<8} {context:<6} {bad:>4} {corr:>9} "
            f"{cell['bare']:>4} {pct:>5.0f}% {rate:>18}"
        )
    lines.append("")
    lines.append("per-100-decisions is a proxy (vs logged decisions of that")
    lines.append("context); impressions are not logged.")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", action="append", default=[])
    args = parser.parse_args()
    patterns = args.data or ["data/human-play/*.jsonl"]
    paths = sorted({p for pattern in patterns for p in glob.glob(pattern)})
    summary = summarize_feedback(load_feedback_events(paths))
    totals = count_context_decisions(paths)
    print(format_report(summary, totals))


if __name__ == "__main__":
    main()
