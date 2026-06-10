# Deep dive: the scoring pipeline

Scoring is the hardest part of Browslatro and the place you'll spend the most time. This
document walks the whole path — from "which cards count" to the final floored integer —
and explains the **two-pass design** (compute once, animate again) that everything else
depends on.

## The core formula

Every played hand resolves to:

```
finalScore = floor( totalChips × totalMult )

totalChips = handBaseChips
           + Σ scoring-card rank chips
           + Σ card-enhancement chips (Bonus, Stone, …)
           + Σ Joker additive chips (hand-level + per-card)
           + card-edition chips (Foil)
           + dev chip bonus

totalMult  = ( handBaseMult
             + Σ card-enhancement +mult (Mult card, Lucky procs)
             + Σ Joker additive mult (hand-level + per-card)
             + card-edition +mult (Holographic)
             + dev mult bonus )
           × Π all the ×mult factors
             ( Glass cards, Steel held, Polychrome, Joker ×mult, dev ×factor )
```

Order matters enormously: **additive bonuses are summed first, then the whole sum is
multiplied by the product of every `×mult`.** A single `×3` Joker applied to a mult of 40
is worth far more than `+3`. Getting the add-vs-multiply boundary right is the essence of
"is the score correct?"

### A worked example (verified in the running app)

Play `K♦ 10♠ 10♥ 4♠ 4♥` with no Jokers or enhancements:

- Label: **Two Pair** → base `20 chips × 2 mult` (Lv 1).
- Scoring cards: `10♠ 10♥ 4♠ 4♥` — the King is a kicker and does **not** score.
- Chips: `20 + 10 + 10 + 4 + 4 = 48`; mult stays `2`.
- `finalScore = floor(48 × 2) = 96`.

The sidebar's Scoring Trace shows exactly this:
`Hand 1: Two Pair (Lv 1)` / `+20 Chips, +2 Mult` / `+10 Chips (10♠ rank)` / … — one line
per contribution, in animation order.

## Stage 0 — what even counts as a hand

`src/scoring/handEvaluator.ts`

- `detectHandLabel(cards)` returns the poker hand label (`"Pair"`, `"Flush House"`, …).
  It first strips **Stone** cards (they have no rank/suit for detection but always score),
  then checks flush/straight/grouping in priority order. Balatro's extended hands —
  `Five of a Kind`, `Flush House`, `Flush Five` — are detected above the standard hands.
- `HAND_TYPE_CONTAINS` / `handContains(played, requires)` encode poker **containment**:
  a Full House "contains" a Pair and a Three of a Kind. Jokers that fire "on a Pair" use
  this so they also fire on a Full House. This is the lookup behind every
  `on-hand-type-*` Joker.
- `evaluateHand(cards)` maps the label to its base `{ chips, multiplier }` from
  `HANDS` in `src/constants.ts`.

> Hand base values are **leveled** by Planet cards at runtime. The live values come from
> the store's `handStats[label]`, not the static `HANDS` constant — `HANDS` is just the
> level-1 baseline.

## Stage 1 — which cards score

`src/scoring/scoring.ts` → `getScoringCards(cards, label, options)`

Not every played card contributes chips. In a Pair, only the two paired cards score; the
kickers don't. `getScoringCards` returns exactly the contributing cards, preserving card
identity (so per-card effects fire on the right cards):

- "Made" hands that use all five cards (Straight, Flush, Full House, Straight/Royal Flush,
  Five/Flush variants) → all non-Stone cards score.
- Grouping hands (Four/Three of a Kind, Two Pair, Pair) → only the grouped cards.
- High Card → just the single highest card.
- **Stone cards always score**, regardless of label, and are merged back in by id.
- `allCardsScore: true` (granted by the **Splash** Joker, via
  `allCardsScoreFromJokers(jokers)`) overrides all of the above — every played card scores.

### Per-card chip/mult helpers

```ts
getCardChips(card)     // rank chips + enhancement chip delta
getCardMultDelta(card) // enhancement +mult (e.g. Mult enhancement)
getCardMultTimes(card) // enhancement ×mult (e.g. Glass = ×2)
```

Rank chips: 2–10 face value, J/Q/K = 10, A = 11 (`RANK_CHIPS`). Enhancement deltas come
from `applyCardEnhancement` in `src/cards/enhancements.ts`.

### `scoreHand()` is the *reference* scorer, not the real one

`scoreHand(cards)` at the bottom of `src/scoring/scoring.ts` computes
`floor((handChips + cardChips) × (handMult + cardMultDelta) × cardMultTimes)`. It knows
**only** about cards + enhancements — no Jokers, seals, editions, steel, boss, or dev
bonuses. Treat it as a clean unit-testable baseline. The *actual* in-game score is
assembled in `usePlayHand` (Stage 3).

## Stage 2 — the Joker scoring engines

`src/items/jokers/scoring/`

Jokers contribute through several engines, each a pure function that takes
`jokers + context` and returns an aggregate plus a list of **steps** (for animation/trace):

| Engine | File | When it fires | Returns |
| --- | --- | --- | --- |
| Hand-level | `handLevel.ts` | Once per played hand | additive chips/mult, ×mult, money, `steps` |
| Per-card | `perCard.ts` | Once per *scoring card* | additive chips/mult, ×mult, money, `steps` |
| On-discard | `onDiscard.ts` | When cards are discarded | money, destroyed-card ids |
| End-of-round | `endOfRound.ts` | When a blind is cleared | money |

`finalScore.ts` (`applyJokersToScoring`, `computeFinalScoreWithJokers`) composes
hand-level + per-card into a single `JokerScoringResult`. This combined helper is used by
unit tests and `scoreHand`-style flows; the live game inlines the same composition in
`usePlayHand` so it can interleave non-Joker contributions in the exact animation order.

### Effects are data; the engine is the switch

A Joker carries a `JokerEffect` — one member of a ~50-arm discriminated union in
`src/items/jokers/types.ts`. Each engine `switch`es over `effect.kind`, applies the math
for the arms it handles, and **explicitly `break`s on the arms it doesn't** (so the
`default: assertNeverEffect(effect)` exhaustiveness check still holds). That's why you'll
see long lists of bare `case "…":` falling through to `break` in both `handLevel.ts` and
`perCard.ts` — each engine ignores the kinds the *other* engine owns. See
[`jokers-and-content.md`](./jokers-and-content.md) for the full pattern.

A few representative arms:

- `additive-mult` → `+amount` mult, always.
- `on-hand-type-x-mult` → `×amount` if `handContains(playedLabel, requires)`.
- `stencil` (Joker Stencil) → `×(empty joker slots)`.
- `per-suit-mult` (per-card) → `+amount` for each scored card of a suit.
- `x-mult-on-face-scored` (per-card) → `×amount` on the *first* scored face card only,
  gated by `context.firstFaceAlreadyScored`.
- `per-held-rank`, `held-lowest-rank-mult`, `x-mult-when-held-suits-all-in` → read cards
  *still held in hand* via `context.heldInHandCards`.

### Joker editions piggyback on the hand-level engine

At the end of every hand-level iteration, `handLevel.ts` also applies the Joker's
**edition**: Foil `+50` chips, Holographic `+10` mult, Polychrome `×1.5` mult (constants
in `src/items/jokers/constants.ts`). `negative` adds a slot, not score, so it's skipped
here.

### Context is everything

The engines are pure, so all the situational inputs arrive through `HandLevelContext`
(see `scoring/types.ts`): `playedHandLabel`, `playedCardCount`, `scoredCards`,
`heldInHandCards`, `remainingDiscards`, `remainingHands`, `money`, `fullDeck`,
`remainingDeck`, `baseDeckSize`, and an injectable `rng`. `usePlayHand` assembles this
context from the store before calling the engines.

## Stage 3 — assembling the real score (`usePlayHand.submitHand`)

`src/hooks/usePlayHand.ts` is where everything converges. Reading `submitHand` top to
bottom is the best way to understand scoring. The sequence:

1. **Resolve the played cards** in display order, intersected with the selection.
2. **Boss penalties** — some bosses charge money per card played; some *block* certain
   hand labels (`bossBlocksHandLabel`) and the play is rejected outright.
3. **Detect label**, then **boss-adjust** the hand entry (`bossAdjustHandEntry`) — a boss
   can change a hand's chips/mult/level. Some bosses force an exact card count; playing the
   wrong count "zeroes" the hand (`psychicZeroed` → chips & mult set to 0).
4. **Pick scoring cards** with `getScoringCards`, then **expand red-seal retriggers**
   (`expandRedSealRetriggers` duplicates red-sealed cards so they score twice), then
   **drop boss-debuffed cards** (`debuffedHandIds`).
5. **Sum card chips** over the scoring cards.
6. **Run the hand-level Joker engine** with full context (only *active* Jokers —
   `jokers.filter(isJokerActive)` excludes perished ones).
7. **Loop the per-card Joker engine** over each scoring card, accumulating additive
   mult/chips and a *product* of per-card ×mults, threading `firstFaceAlreadyScored`.
   Card enhancement `+mult` is folded in here too.
8. **Steel held cards** — cards with the Steel enhancement *still in hand* (not played)
   give a `×` multiplier (`steelHeldMultiplier`).
9. **Compose** `totalXMult = handJokerXMult × enhancementXMult × perCardXMult × steelMult`,
   then `chips = handChips + cardChips + jokerChips + perCardChips` and
   `mult = (handMult + jokerMult + perCardMult) × totalXMult`.
10. **Apply dev offsets** (`devChipsBonus`, `devMultBonus`, `devMultFactor` — sticky manual
    bumps from the dev panel) and `floor` to get `finalScore`.

At this point the **final number already exists**. Everything after is presentation.

## The two-pass design — why the score is computed twice

Here's the crux. `submitHand` computes `finalScore` eagerly (Stage 3) because the game
needs to know *immediately* whether the round is won (to decide whether to draw new cards,
open the modal, etc.). But the player must *watch* the score build up card-by-card,
Joker-by-Joker.

So the same contributions are applied **a second time, incrementally**, by the animation
pipeline (`useScoringPipeline`, see [`animations.md`](./animations.md)). The animation
seeds `chips = handBaseChips` and `mult = handBaseMult × enhancementXMult`, then each
animation step nudges them upward until — if all the math agrees — they land on
`finalScore`.

Consequences you must respect when editing scoring:

- **Any contribution you add in `usePlayHand` (eager) must have a matching incremental
  application in the animation, and vice-versa.** A mismatch shows up as the animated
  score not matching the "real" score. This is the #1 class of scoring bug.
- The eager pass and the animated pass must apply contributions in a **consistent order**
  relative to the add/multiply boundary, or the floored result drifts.
- Randomized effects (Lucky procs, Misprint, Business Card) are rolled in the **animated**
  pass and the money/score they produce is applied there — so the eager `finalScore`
  deliberately does *not* try to predict those random rolls. (Money is a wallet side
  effect, not part of the floored hand score, which keeps this honest.)

## Stage 4 — the scoring trace

`src/scoring/scoringTrace.ts`

Every contribution emits a `ScoringEvent` — a tagged union (`hand-base`, `chips-delta`,
`mult-delta`, `mult-times`, `money-delta`, `card-destroyed`, `boss-adjustment`). These
accumulate in the store's `scoringEvents` and render as the human-readable breakdown in
the sidebar's always-visible **Scoring Trace** panel (with an EXPAND button that opens
`ScoringTraceModal`): "+11 Chips (A♠ rank)", "×1.5 Mult (Photograph on K♥)", and money
events grouped under a "Money won" section ("+$3 (Small Blind reward)", …).

- `formatScoringEvent` turns an event into its display string.
- `groupEventsByHand` / `partitionByCategory` organize them for the Round-Won modal.

The trace is **assertable**: there are dedicated tests (`src/App.scoringTrace*.test.tsx`,
`src/scoring/scoringTrace.test.ts`) that play a hand and check the exact sequence of
trace strings. If you add a scoring contribution, you almost certainly need to (a) emit a
matching `ScoringEvent` and (b) update or add a trace test.

## Stage 5 — payout & end of round

`src/scoring/payout.ts` + `usePlayHand.finalizeHandSubmission` + `actions.ts → handleWin`

When the accumulated `roundScore` meets the blind's `requiredScore`
(`requiredChipsForBlind`, `src/scoring/anteScaling.ts`), the round is won. The win path
layers on the economy:

- **Remaining-hands bonus** — leftover hands pay out (`REMAINING_HAND_BONUS` each).
- **Gold enhancement held** — gold cards still in hand pay `GOLD_HELD_BONUS_PER_CARD`
  (animated as its own gold sequence).
- **End-of-round Jokers** (`applyEndOfRoundJokers`) — e.g. money per remaining discard.
- **Blue seals held** create the played hand's Planet card.
- Then `handleWin` adds the **blind reward** + **interest** (`calculateInterest`, capped by
  vouchers) and advances blind/ante, rerolls the shop, picks the next boss, etc.

## Where to look when scoring is wrong

| Symptom | Start here |
| --- | --- |
| Wrong base for a hand type | `constants.ts` HANDS, store `handStats`, Planet leveling |
| Wrong cards counted | `getScoringCards`, red-seal expansion, `debuffedHandIds`, Splash |
| A Joker does nothing / too much | the relevant `case` in `handLevel.ts` / `perCard.ts`; check the engine split |
| Animated score ≠ final score | mismatch between `usePlayHand` (eager) and `useScoringPipeline` (animated) |
| Trace string wrong/missing | the `pushScoringEvent` call sites + `formatScoringEvent` |
| Boss not applying | `bossAdjustHandEntry`, `bossBlocksHandLabel`, `bossRequiredCardCount` |
| Money wrong at round end | `payout.ts`, `finalizeHandSubmission`, `handleWin` |
</content>
