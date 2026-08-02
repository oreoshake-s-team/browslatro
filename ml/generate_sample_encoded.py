"""Regenerates tests/fixtures/sample-encoded.json from sample.jsonl.

src/ai/encode.test.ts checks the TypeScript encoder's output against this
file line-for-line, so it is the Python-side half of the cross-language
golden-vector guard described in docs/ai-advisor/running-locally.md's
"Changing the encoding" ritual. Whenever encode_state/encode_candidate
(or their TS mirrors) change, re-run this from ml/:

    python3 generate_sample_encoded.py

then run both `yarn test src/ai/encode.test.ts` and
`python3 -m unittest discover -s ml/tests` to confirm the two encoders
still agree.
"""

import json
import os

from encoding import encode_decision

FIXTURES = os.path.join(os.path.dirname(__file__), "tests", "fixtures")
SAMPLE = os.path.join(FIXTURES, "sample.jsonl")
OUT = os.path.join(FIXTURES, "sample-encoded.json")


def main():
    golden = []
    with open(SAMPLE, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            inputs, chosen_index = encode_decision(record)
            golden.append({"chosenIndex": chosen_index, "inputs": inputs})
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(golden, handle, indent=2)
        handle.write("\n")
    print(f"Wrote {len(golden)} golden decisions to {OUT}")


if __name__ == "__main__":
    main()
