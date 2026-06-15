# Wiki Retrieval — Grounding the Advisor

**File:** [`src/ai/advisor/wiki.ts`](../../src/ai/advisor/wiki.ts) · **Test:** `src/ai/advisor/wiki.test.ts`

The prompted advisor is [grounded](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) with short, curated [Balatro](https://balatrowiki.org/) notes so its coaching is anchored to how the mechanics actually work, not just the model's parametric memory. This is a deliberately **simple exact-key lookup**, not a vector store: every relevant entity in the current decision contributes one canned note.

- [Why exact-key, not embeddings](#why-exact-key-not-embeddings)
- [The knowledge bases](#the-knowledge-bases)
- [Retrieval functions](#retrieval-functions)
- [Graceful degradation](#graceful-degradation)
- [Licensing & attribution](#licensing--attribution)

---

## Why exact-key, not embeddings

Every game entity already has a **stable string id** (`"blueprint"`, `"the-wall"`, `"red"`). The advisor only needs notes for the handful of entities present in *this* decision (the jokers in hand/shop, the current boss, the active stake). So retrieval is a dictionary lookup keyed by id — no embeddings, no similarity search, no index to maintain, and zero chance of retrieving an irrelevant note. The cost is coverage: an entity with no entry simply contributes nothing (see [graceful degradation](#graceful-degradation)).

The retrieved notes are emitted as `WikiEntry { key, kind, title, text }` (with `kind ∈ "joker" | "boss" | "combo" | "strategy" | "stake"`) and laid into the [user message](./llm-advisor.md#the-per-context-user-message) as reference material.

---

## The knowledge bases

| Table | Type | Keyed by | When included |
| --- | --- | --- | --- |
| `JOKER_WIKI` | `Record<string,string>` | [joker](https://balatrowiki.org/w/Jokers) id | for each joker in hand/shop/pack/owned |
| `BOSS_WIKI` | `Record<string,string>` | [boss blind](https://balatrowiki.org/w/Blinds#Boss_Blinds) id | on a boss round |
| `COMBO_WIKI` | `ComboWikiEntry[]` | a list of joker ids | when **any** listed joker is owned |
| `ECONOMY_WIKI` | computed strategy text | — | hand context once money matters |
| `STAKE_WIKI` | `Partial<Record<Stake,string>>` | [stake](https://balatrowiki.org/w/Stakes) id | when an entry exists for the active stake |

Notes on the tables:

- **`JOKER_WIKI`** has both hand-coded entries (e.g. *blueprint:* "Copies the ability of the joker directly to its right. Jokers trigger left to right, and reordering changes what Blueprint copies.") and a generated block: a `CONTAINS_HAND_JOKERS` map produces uniform "triggers whenever the played hand contains X" notes for the Jolly/Zany/Mad/… family, so those parallel jokers get parallel, consistent advice.
- **`COMBO_WIKI`** captures multi-joker synergies (e.g. a "lucky-cat-engine"). A combo entry is included when *any* of its `jokers` ids is present in the player's lineup — so it surfaces emerging synergies, not just complete ones.
- **`ECONOMY_WIKI`** is **computed from the live payout constants** (`INTEREST_RATE_PER`, `INTEREST_CAP`, `REMAINING_HAND_BONUS` from [`src/scoring/payout.ts`](../../src/scoring/payout.ts)), so the [interest](https://balatrowiki.org/w/Economy) advice can never drift from the actual game numbers — the same "numbers come from the engine" discipline as the [scoring side](./engine-plumbing.md#simulateplay--deterministic-scoring).
- **`STAKE_WIKI`** is a `Partial` record: only some stakes have a note, and the rest fall through to [graceful degradation](#graceful-degradation).

---

## Retrieval functions

Each [advice context](./llm-advisor.md#request-shapes) calls the retriever matching what the model can see:

- `retrieveWikiEntries(state: ModelState)` — **hand context.** Looks up the owned jokers, the boss (if a boss round), matching combos, the economy note (once money is relevant), and the stake note. The broadest retriever.
- `retrieveShopWikiEntries(jokers)` — **shop context.** Joker notes for the shop offers + owned jokers, plus the economy strategy (shop is where economy decisions happen).
- `retrieveJokerWikiEntries(jokers)` — **pack context.** Joker notes + matching combos, deduplicated and in order.

All three deduplicate entries (a joker that's both owned and offered contributes one note) and preserve a stable order.

---

## Graceful degradation

Coverage is curated, not exhaustive, and the design **never fails on a missing key**:

- An unknown joker/boss/stake id → its lookup returns `undefined` → the entry is simply **skipped**. No placeholder, no error, no hallucinated note.
- A new joker can be added to the game with **no wiki entry at all**; the advisor still works, it just won't volunteer a tip about that joker.

This is what makes wiki coverage an *additive*, low-risk surface — expanding it (tracked in `#1077`) only ever adds grounding, never breaks a request.

---

## Licensing & attribution

The reference text is **adapted (condensed and reworded)** from community sources, and the licensing is tracked per-table in the `wiki.ts` header. This matters because it constrains how the project as a whole may be used.

1. **`JOKER_WIKI` and `BOSS_WIKI`** — merged from two community wikis:
   - [Balatro Wiki](https://balatrowiki.org/) — [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)
   - [Balatro Fandom Wiki](https://balatrogame.fandom.com/wiki/Balatro_Wiki) — [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)

   As a derivative, the entry text in these two tables is shared under **CC BY-NC-SA 3.0** — the more restrictive of the two — and may be used for **non-commercial purposes only**. The `NC` ([NonCommercial](https://creativecommons.org/licenses/by-nc-sa/3.0/)) clause is the binding constraint and the reason Browslatro is positioned as an educational, non-commercial project; the `SA` ([ShareAlike](https://en.wikipedia.org/wiki/Share-alike)) clause requires derivatives to carry the same license.

2. **`COMBO_WIKI`, `ECONOMY_WIKI`, and `STAKE_WIKI`** — adapted from the [Balatro Beginner guide by calderracrusade](https://steamcommunity.com/sharedfiles/filedetails/?id=3197193231), used under the author's stated terms: *"Feel free to use, translate, or repost this guide, so long as you give credit and allow others to do the same."* The adapted text is shared under those same terms.

When adding wiki content, keep the table-by-table provenance intact and only add material whose license is compatible with non-commercial ShareAlike use.
