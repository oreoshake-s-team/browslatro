# Deep dive: the scoring pipeline

Scoring is the hardest part of Browslatro and where you'll spend the most time. This
walks the whole path — from "which cards count" to the final floored integer — and
explains the **two-pass design** (compute once, animate again) that everything else
depends on.

## The core formula

Every played hand resolves to:

```
finalScore = floor( totalChips × totalMult )

totalChips = handBaseChips
           + Σ scoring-card rank chips (+ permanent bonusChips, e.g. from Hiker)
           + Σ card-enhancement chips (Bonus, Stone, …)
           + Σ joker additive chips (hand-level + per-card)
           + card-edition chips (Foil)
           + dev chip bonus

totalMult  = ( handBaseMult
             + Σ card-enhancement +mult (Mult cards, Lucky procs)
             + Σ joker additive mult (hand-level + per-card)
             + card-edition +mult (Holographic)
             + dev mult bonus )
           × Π all the ×mult factors
             ( Glass, Steel held, Polychrome, joker ×mult, dev ×factor )
```

Order matters enormously: **additive bonuses are summed first, then the whole sum is
multiplied by the product of every `×mult`.** A `×3` joker applied to a mult of 40 is
worth far more than `+3`. Getting the add-vs-multiply boundary right is the essence of
"is the score correct?"

### A worked example (verified in the running app)

Play `K♦ 10♠ 10♥ 4♠ 4♥` with no jokers or enhancements:

- Label: **Two Pair** → base `20 chips × 2 mult` (Lv 1).
- Scoring cards: `10♠ 10♥ 4♠ 4♥` — the King is a kicker and does **not** score.
- Chips: `20 + 10 + 10 + 4 + 4 = 48`; mult stays `2`.
- `finalScore = floor(48 × 2) = 96`.

The sidebar's Scoring Trace shows exactly this, one line per contribution, in animation
order: `Hand 1: Two Pair (Lv 1)` / `+20 Chips, +2 Mult` / `+10 Chips (10♠ rank)` / …

## Stage 0 — what counts as a hand

`src/scoring/handEvaluator.ts`

- `detectHandLabel(cards, options)` returns the poker label (`"Pair"`, `"Flush House"`,
  …). Stone cards are invisible to detection (but always score). The `HandEvalOptions`
  parameter is how jokers bend the rules: Four Fingers (4-card flushes/straights),
  Shortcut (gapped straights), Smeared Joker (suit merging) — assembled by
  `handEvalOptionsFromJokers(jokers)` in `src/items/jokers/collection.ts`.
- `handContains(played, requires)` encodes poker **containment** (a Full House contains a
  Pair). Every `on-hand-type-*` joker checks containment, not equality.
- Base `{ chips, multiplier }` per label comes from `HANDS` in `src/constants.ts` —
  but those are only the **level-1** values. Live values come from the store's
  `handStats[label]`, leveled up by Planet cards (and, mid-hand, by Space Joker's
  upgrade roll).

## Stage 1 — which cards score

`src/scoring/scoring.ts` → `getScoringCards(cards, label, options)`

Not every played card contributes. In a Pair only the paired cards score; kickers don't.
`getScoringCards` returns exactly the contributing cards, preserving identity:

- Five-card "made" hands (Straight, Flush, Full House, Straight/Royal Flush,
  Five/Flush variants) → all non-Stone cards score.
- Grouping hands (Four/Three of a Kind, Two Pair, Pair) → only the grouped cards.
- High Card → the single highest card.
- **Stone cards always score** and are merged back in by id.
- `allCardsScore: true` (Splash, via `allCardsScoreFromJokers`) overrides everything.

Per-card value helpers: `getCardChips` (rank chips + enhancement chips + permanent
`bonusChips`), `getCardMultDelta`, `getCardMultTimes`. Rank chips: 2–10 face value,
J/Q/K = 10, A = 11.

> **`scoreHand()` is the reference scorer, not the real one.** It knows only cards +
> enhancements — no jokers, seals, editions, steel, boss, or dev bonuses. The actual
> in-game score is assembled in `usePlayHand` (Stage 3).

## Stage 2 — the joker engines

`src/items/jokers/scoring/` — each a pure function over `(jokers, context)`:

| Engine | File | When | Returns |
| --- | --- | --- | --- |
| Hand-level | `handLevel.ts` | Once per played hand | additive chips/mult, ×mult, money, `steps` |
| Per-card | `perCard.ts` | Once per *scoring card* | additive chips/mult, ×mult, money, `steps` |
| Retriggers | `retriggers.ts` | Before per-card scoring | scoring cards expanded to `1 + extra` copies |
| Copy | `copy.ts` | Per equipped joker | the resolved effect (Blueprint/Brainstorm) |
| Scored-card mutation | `scoredCardMutations.ts` | After a hand is played | permanent enhancement changes |
| Consumable creators | `consumableCreators.ts` | After a hand is played | Tarots/Spectrals to spawn, card to destroy |
| On-discard | `onDiscard.ts` | When cards are discarded | money, destroyed-card ids |
| End-of-round | `endOfRound.ts` | When a blind is cleared | money |

Key mechanics:

- **Effects are data; the engine is the switch.** Each joker carries one arm of the
  ~120-arm `JokerEffect` union; engines `switch` over `effect.kind` and end with
  `assertNeverEffect` so the compiler flags unhandled kinds. Handled arms emit a
  **step** (`{ jokerId, jokerName, additiveMult?, additiveChips?, xMultFactor?,
  moneyEarned? }`) used by both the animation and the trace.
- **Copy resolution.** The hand-level and retrigger engines read each joker's effect
  through `resolveJokerEffect(jokers, i)` — Blueprint copies its right neighbor,
  Brainstorm the leftmost joker, chains resolve with cycle detection.
- **State.** Scaling jokers read their accumulated `joker.state` counter at score time
  (e.g. Green Joker's `+1 Mult per hand played`); the counters are *written* by the
  lifecycle reducers in `state.ts`, never by the engines. See
  [`jokers-and-content.md`](./jokers-and-content.md).
- **Editions** piggyback on the hand-level pass: Foil `+50` chips, Holographic `+10`
  mult, Polychrome `×1.5`.
- **Context is everything.** Engines are pure; situational inputs arrive via
  `HandLevelContext` (`playedHandLabel`, `scoredCards`, `heldInHandCards`,
  `remainingDiscards`/`Hands`, `money`, `fullDeck`, `remainingDeck`, `handPlayCounts`,
  an injectable `rng`, …). `usePlayHand` assembles it from the store.

## Stage 3 — assembling the real score (`usePlayHand.submitHand`)

`src/hooks/usePlayHand.ts` is where everything converges; reading `submitHand` top to
bottom is the best way to learn scoring. The current sequence:

1. **Resolve played cards** in display order ∩ selection (empty submission → score 0).
2. **Boss taxes & blocks** — money penalty per card; some bosses *block* hand labels
   (play rejected); The Ox-style bosses can zero the wallet.
3. **Detect the label** with joker eval options; record hand-play counts/history.
4. **Space Joker roll** (`handPlayUpgradeRolls`) may level the played hand *before*
   scoring; then **boss-adjust** the hand entry (`bossAdjustHandEntry`), including the
   forced-card-count zeroing (`psychicZeroed`).
5. **Pick scoring cards** → **expand retriggers** (`expandScoringRetriggers`: red seals
   plus Hack / Sock and Buskin / Dusk / Hanging Chad / Seltzer — each card emitted
   `1 + extra` times) → drop **boss-debuffed** cards (`debuffedHandIds`).
6. **Apply scored-card mutations** (`applyScoredCardMutations`): Midas Mask turns played
   faces Gold, Vampire eats enhancements — persisted into `cardEnhancementsById`, and
   the eaten count feeds Vampire's state counter.
7. **Side effects of playing**: consumable creators spawn Tarots/Spectrals (8 Ball,
   Séance, Sixth Sense, Superposition, Vagabond — Sixth Sense may destroy the played 6);
   DNA copies the first card on the round's first hand; Hiker stamps permanent
   `bonusChips` onto every scored card.
8. **Update joker state** (`applyHandPlayedToJokerStates`) — Green Joker grows, Ice
   Cream melts, Popcorn-style jokers deplete (and may self-destruct).
9. **Run the engines**: `applyHandLevelJokers` once (active jokers only —
   `isJokerActive` excludes perished ones), `applyPerCardJokers` per scoring card,
   threading `firstFaceAlreadyScored`; collect per-card enhancement `+mult` along the
   way.
10. **Steel held cards** still in hand contribute `×1.5` each (`steelHeldMultiplier`).
11. **Compose**: `totalXMult = handJokerXMult × enhancementXMult × perCardXMult ×
    steelMult`; sum the chips; apply dev offsets; `floor` → `finalScore`.

At this point the final number exists. Everything after is presentation (Stage 4) and
payout (Stage 5). On a loss path, `consumeDeathPreventer` gives Mr. Bones-style jokers a
chance to save the run (the joker is consumed).

## The two-pass design — why the score is computed twice

`submitHand` computes `finalScore` eagerly because the game must know *immediately*
whether the round is won. But the player must *watch* the score build. So the same
contributions are applied a **second time, incrementally**, by `useScoringPipeline`
(see [`animations.md`](./animations.md)): the animation seeds `chips = handBaseChips`
and `mult = handBaseMult × enhancementXMult`, then each step nudges them until — if the
two passes agree — they land on `finalScore`.

Rules to respect when changing scoring:

- **Every contribution must exist in both passes.** Eager-only → the animated total
  undershoots; animated-only → the banked score is wrong. This is the #1 scoring-bug
  class.
- Both passes must respect the same **add-vs-multiply boundary** and ordering, or the
  floored result drifts.
- **Random per-card effects** (Lucky procs, Bloodstone, Business Card) are rolled in the
  *animated* pass; the eager pass doesn't try to predict them. Money is a wallet side
  effect, not part of the floored hand score, which keeps this honest.

## Stage 4 — the scoring trace

`src/scoring/scoringTrace.ts`

Every contribution emits a `ScoringEvent` — a tagged union (`hand-base`, `chips-delta`,
`mult-delta`, `mult-times`, `money-delta`, `card-destroyed`, `boss-adjustment`). Events
accumulate in the store's `scoringEvents` and render in the sidebar's always-visible
**Scoring Trace** panel (`ScoringTrace.tsx`, with an EXPAND button opening
`ScoringTraceModal`): "+10 Chips (10♠ rank)", "+2 Mult (Green Joker)", money grouped
under its own section.

The trace is **assertable**: `src/App.scoringTrace*.test.tsx` play hands and check the
exact sequence of trace strings. If you add a scoring contribution, emit a matching
`ScoringEvent` and update/add a trace test.

## Stage 5 — payout & end of round

`src/scoring/payout.ts` + `usePlayHand.finalizeHandSubmission` + `actions.handleWin`

When `roundScore` meets `requiredChipsForBlind` (`src/scoring/anteScaling.ts` — scaled
by ante, blind, boss, and stake), the win path layers on the economy:

- **Remaining-hands bonus** ($ per unused hand) and **gold cards held** (paid per card,
  with its own animation phase).
- **End-of-round jokers** (`applyEndOfRoundJokers`) — Golden Joker money, Delayed
  Gratification, Rocket/Satellite-style payouts.
- **Blue seals held** create the played hand's Planet card.
- `handleWin` then adds the **blind reward + interest** (`calculateInterest`, capped by
  vouchers, multiplied by To the Moon), advances blind/ante, ticks perishable/rental
  stickers, rolls the next shop, and picks the next boss.

## Where to look when scoring is wrong

| Symptom | Start here |
| --- | --- |
| Wrong base for a hand type | `constants.ts` HANDS, store `handStats`, Planet leveling, Space Joker |
| Wrong cards counted | `getScoringCards`, `expandScoringRetriggers`, `debuffedHandIds`, Splash, eval options |
| A joker does nothing / too much | its `case` in `handLevel.ts` / `perCard.ts`; copy resolution; `isJokerActive`; its state reducer |
| Animated score ≠ final score | mismatch between `usePlayHand` (eager) and `useScoringPipeline` (animated) |
| Trace line wrong/missing | the `pushScoringEvent` call sites + `formatScoringEvent` |
| Boss effect not applying | `bossAdjustHandEntry`, `bossBlocksHandLabel`, `bossRequiredCardCount`, `applyBossFaceDown` |
| Money wrong at round end | `payout.ts`, `finalizeHandSubmission`, `handleWin` |
| Scaling joker stuck | its reducer in `state.ts` and the lifecycle call site that should fire it |
