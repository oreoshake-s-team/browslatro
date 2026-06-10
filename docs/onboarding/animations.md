# Deep dive: the scoring animation

Browslatro's signature feel is the score *building up* — chips and mult ticking, cards
popping, jokers pulsing, the trace scrolling. This explains how that staged animation is
sequenced on top of the already-computed final score. Read
[`scoring-pipeline.md`](./scoring-pipeline.md) first; this picks up where it ends.

## The mental model

The eager pass in `usePlayHand` has already computed `finalScore`. The animation's job is
to **re-apply the same contributions, one at a time, on a timer**, mutating the store's
live `chips` / `multiplier` until they land on that number — while emitting sounds,
`ScoringEvent`s (the trace), and visual pulse cues.

It is not one loop. It's **a chain of independent timed sequences**, each owning one
phase, glued together with continuation refs so phase N's completion starts phase N+1.

## The primitive: `useScoringStepSequence`

`src/hooks/useScoringStepSequence.ts` — ~30 lines that everything else builds on:

```ts
useScoringStepSequence({
  items,        // the array to walk
  index,        // current cursor (lives in the store)
  setIndex,     // store setter to advance it
  stepMs,       // delay between steps
  onStep,       // (item, index) => apply this item's effect
  onFinish,     // called once when the cursor passes the end
});
```

Internally: a single `useEffect` keyed on `[items, index, setIndex, stepMs]` that
schedules one `setTimeout` per step, calls `onStep`, increments the cursor (which re-runs
the effect), and calls `onFinish` when the cursor passes the end.

Key properties:

- **The cursor lives in the store, not the hook.** Advancing it re-runs the effect, so the
  sequence survives re-renders and stays in lockstep with the rendered UI.
- **`onStep`/`onFinish` are captured in refs** each render, so the freshest closures run
  without re-triggering the effect.
- **`stepMs` can be 0** — the whole pipeline degrades to near-instant without
  special-casing (see "Speed control" below).

## The four sequences

`src/hooks/useScoringPipeline.ts` instantiates four sequences, each walking a different
array in the scoring slice, each with its own *finalize ref*:

| # | Phase | Items array | Cursor | Finalize ref |
| --- | --- | --- | --- | --- |
| 1 | Scoring cards | `scoringCards` | `scoringIndex` | `scoringFinalizeRef` |
| 2 | Gold held (round win) | `goldScoringIds` | `goldScoringIndex` | `goldFinalizeRef` |
| 3 | Steel held | `steelScoringIds` | `steelScoringIndex` | `steelFinalizeRef` |
| 4 | Hand-level jokers | `handLevelSteps` | `handLevelIndex` | `handLevelFinalizeRef` |

Each `onStep` applies the *incremental* version of one slice of the formula:

- **Cards (1)** is the busiest. Per scoring card: rank chips; enhancement
  chips/`+mult`/`×mult`; Glass destruction roll; Lucky procs (mult + money); Gold seal
  payouts; **a re-run of the per-card joker engine** (`applyPerCardJokers`) applying its
  money/chips/mult/×mult; card editions; a `pop` sound; and a **pulse** for each joker
  that fired. Every contribution pushes a matching `ScoringEvent`.
- **Gold (2)** pays the held-gold bonus per card, with the `gold` sound.
- **Steel (3)** multiplies mult by the steel factor per held steel card.
- **Hand-level jokers (4)** replays the pre-computed `handJokerResult.steps` so the
  animation order matches the eager computation exactly — applying each step's
  chips/mult/×mult/money and pulsing that joker.

> Why re-run the per-card engine live instead of replaying steps like phase 4 does?
> Because per-card effects include **random rolls** (Lucky cards, Bloodstone, Business
> Card) that are deliberately resolved at animation time; the eager pass doesn't predict
> them. Hand-level steps are deterministic given their context, so they're computed once
> and replayed. See the two-pass section of
> [`scoring-pipeline.md`](./scoring-pipeline.md).

## Continuations: how the phases chain

Phases must run in order — cards, *then* steel, *then* hand-level jokers, *then*
finalize — but each sequence only knows its own array. `usePlayHand.submitHand` wires the
chain up front through the finalize refs:

```ts
pipeline.scoringFinalizeRef.current = () => {
  if (heldSteelIds.length === 0) { runHandLevel(); return; }
  pipeline.steelFinalizeRef.current = runHandLevel;   // steel → hand-level
  setSteelScoringIds(heldSteelIds);
  setSteelScoringIndex(0);
};
function runHandLevel() {
  if (handJokerResult.steps.length === 0) { finalize(); return; }
  pipeline.handLevelFinalizeRef.current = finalize;   // hand-level → finalize
  setHandLevelSteps(handJokerResult.steps);
  setHandLevelIndex(0);
}
setScoringCards(scoring);   // start phase 1
setScoringIndex(0);
```

So the chain is:

```
seed scoringCards
  → card sequence runs, onFinish calls scoringFinalizeRef
      → (if steel) seed steel; its onFinish = runHandLevel
          → (if joker steps) seed hand-level; its onFinish = finalize
              → finalizeHandSubmission(finalScore, …)
```

`finalizeHandSubmission` banks `roundScore += finalScore`, clears the live chips/mult and
dev offsets, and branches: on a win it may run the **gold** phase before opening the
Round Won modal; otherwise it decrements remaining hands or loses the game (after the
Mr. Bones death-prevention check).

Each sequence's `onFinish` reads its finalize ref, **nulls it first**, then calls it — a
continuation can never fire twice. Empty phases short-circuit to the next continuation,
so the chain is robust.

### Why refs instead of `async/await` or a state machine?

The sequencing spans renders and timers, and "what comes next" depends on data known only
at `submitHand` time (how many steel cards, how many joker steps). Storing the next
action in a ref lets `submitHand` *describe* the whole chain up front while the
store-driven sequences *execute* it across many renders. Unusual, deliberate, and
load-bearing — internalize it before refactoring.

## Speed control & reduced motion

One knob controls everything. `getScoringStepMs` in `App.tsx`:

1. If the user picked a speed in Options (`animationSpeed` in the preferences store:
   `slow ×2 / normal ×1 / fast ×0.5 / instant ×0`), the base `SCORING_STEP_MS` (500ms) is
   scaled by that multiplier.
2. Otherwise, `prefers-reduced-motion` forces `0`.

The same multiplier is also written to the **`--animation-speed` CSS custom property** on
the `.App` root, so pure-CSS animations (card lifts, pulses) scale in sync with the JS
timers. New CSS animations should multiply their durations by it; there are layout tests
in `src/styles/` enforcing motion conventions.

## Live values, selection preview, and input locking

- While scoring animates, the store's `chips`/`multiplier` are mid-flight; the Sidebar
  shows them climbing. Only `finalizeHandSubmission` banks the result into `roundScore`
  and resets them. So: `chips`/`multiplier` = "this hand, so far"; `roundScore` =
  "banked".
- The same fields double as the **selection preview**: before any play, `toggleCard` (in
  the actions slice) sets them to the boss-adjusted base entry for the selected hand —
  select two pairs and the sidebar immediately shows "Two Pair, 20 × 2".
- While a sequence is in flight the game **locks input**: Submit Hand and Discard are
  disabled via `isScoring`, and `toggleCard` ignores clicks while
  `scoringIndex < scoringCards.length` (and during discard fly-outs). Gate any new
  interaction the same way, or players can mutate state mid-animation.

## Visual & audio cues layered on top

- **Card highlight.** The pipeline exposes `currentScoringId` / `currentGoldScoringId` /
  `currentSteelScoringId` (the id at the active cursor); `App.tsx` passes them into
  `<Game>` and the matching card renders its scoring state.
- **Joker pulse.** `pulseJokers(firedIds)` bumps per-joker counters
  (`jokerPulseCounters`); the joker tile animates on counter change — that's how you see
  *which* joker just contributed.
- **Sounds.** `play("pop" | "gold" | "win" | "lose")` from
  `src/components/system/sounds.tsx`, fired inside `onStep`/finalize. Muted by default
  (preferences store).
- **The "Nope!" animation** is the template for fire-and-forget effects: the animations
  slice holds a `nopeTriggerKey` counter; `triggerNope()` increments it and
  `<NopeAnimation>` replays on key change. Used for rejected actions (e.g. Wheel of
  Fortune missing).

## The discard pipeline (a parallel, simpler pattern)

`src/hooks/useDiscardPipeline.ts` handles discards (and the post-play card fly-out) with
**a count-down ref over CSS transitions** instead of timers:

1. `discardSelected` (or `submitHand`'s finalize) writes ids into `discardingIds` and
   sets `pendingDiscardCountRef.current = N`; those cards get the fly-out CSS class.
2. Each card's transition end calls `handleCardDiscardEnd(card)`, decrementing the ref.
3. At zero, `finalizeDiscard` removes the cards and draws replacements
   (`drawCountForRefill`) — unless `skipDrawAfterDiscardRef` is set (a winning play
   doesn't refill into a finished blind).

`discardSelected` also fires on-discard joker effects (money, Trading Card destruction),
purple-seal Tarot creation, and the discard-driven state reducers
(`applyDiscardToJokerStates` — Ramen shrinks, Castle and Hit the Road grow).

## Editing the animation safely — a checklist

1. Does your contribution exist in **both** passes — eager (`usePlayHand`) and animated
   (the right `onStep`)? Same add-vs-multiply boundary in both?
2. Does it emit a `ScoringEvent`? Update or add a trace test.
3. New *phase*? You need: an items array + cursor in the scoring slice, a
   `useScoringStepSequence` in `useScoringPipeline`, a finalize ref, a link in the
   `submitHand` chain at the right position, and a `resetScoring()` entry.
4. Does it behave at `stepMs === 0` (instant / reduced motion) and when its phase is
   empty?
5. If it animates in CSS, does it scale with `--animation-speed` and respect
   forced-colors/reduced-motion (see `src/styles/`)?
