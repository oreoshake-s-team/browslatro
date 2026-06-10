# Deep dive: the scoring animation

Browslatro's signature feel is the score *building up* — chips and mult ticking, cards
popping, Jokers pulsing, the trace scrolling. This document explains how that staged
animation is sequenced on top of the (already-computed) final score. Read
[`scoring-pipeline.md`](./scoring-pipeline.md) first; this picks up where it ends.

## The mental model

The eager pass in `usePlayHand` has already computed `finalScore`. The animation's job is
to **re-apply the same contributions, one at a time, on a timer**, mutating the store's
live `chips` / `multiplier` until they land on that final number — while emitting sounds,
`ScoringEvent`s (the trace), and visual "pulse" cues.

The animation is not one loop. It's **a chain of independent timed sequences**, each
responsible for one phase, wired together with continuation refs so phase N's completion
starts phase N+1.

## The primitive: `useScoringStepSequence`

`src/hooks/useScoringStepSequence.ts` — ~30 lines, and everything else is built on it.

```ts
useScoringStepSequence({
  items,        // the array to walk
  index,        // current cursor (lives in the store)
  setIndex,     // store setter to advance the cursor
  stepMs,       // delay between steps
  onStep,       // (item, index) => void  — apply this item's effect
  onFinish,     // () => void — called once when index passes the end
});
```

Internally it's a single `useEffect` keyed on `[items, index, setIndex, stepMs]`:

```ts
useEffect(() => {
  if (items.length === 0) return;
  if (index >= items.length) { onFinishRef.current(); return; }
  const timer = window.setTimeout(() => {
    onStepRef.current(items[index], index);
    setIndex((prev) => prev + 1);
  }, stepMs);
  return () => window.clearTimeout(timer);
}, [items, index, setIndex, stepMs]);
```

Key properties:

- **The cursor lives in the store, not the hook.** Advancing `index` re-runs the effect,
  which schedules the next step. This is what makes the sequence survive re-renders and
  stay in lockstep with the rendered UI.
- **`onStep`/`onFinish` are captured in refs** (`onStepRef.current = onStep` every render)
  so the latest closures are used without re-triggering the effect — only `items`/`index`/
  `stepMs` drive it.
- **`stepMs` can be 0.** `getScoringStepMs()` in `App.tsx` returns 0 when the OS requests
  reduced motion (and a user override can scale it), so the whole thing degrades to
  near-instant without special-casing.

## The four sequences

`src/hooks/useScoringPipeline.ts` instantiates **four** `useScoringStepSequence`s, each
walking a different array in the scoring slice and each with its own *finalize ref*:

| # | Phase | Items array | Cursor | Finalize ref |
| --- | --- | --- | --- | --- |
| 1 | Scoring cards | `scoringCards` | `scoringIndex` | `scoringFinalizeRef` |
| 2 | Gold held (round win) | `goldScoringIds` | `goldScoringIndex` | `goldFinalizeRef` |
| 3 | Steel held | `steelScoringIds` | `steelScoringIndex` | `steelFinalizeRef` |
| 4 | Hand-level Jokers | `handLevelSteps` | `handLevelIndex` | `handLevelFinalizeRef` |

Each sequence's `onStep` does the *incremental* version of one slice of the formula:

- **Cards (1)** is the busiest. For each scoring card it: adds rank chips; applies
  enhancement chips/`+mult`/`×mult`; rolls Glass destruction; rolls Lucky procs (mult +
  money); pays Gold seals; **re-runs the per-card Joker engine** (`applyPerCardJokers`) and
  applies its money/chips/mult/×mult; applies card editions; plays the `pop` sound; and
  **pulses** the Jokers that fired. Every one of these pushes a matching `ScoringEvent`.
- **Gold (2)** pays `GOLD_HELD_BONUS_PER_CARD` per gold card held, plays `gold`.
- **Steel (3)** multiplies mult by `STEEL_MULT_FACTOR` per steel card held.
- **Hand-level Jokers (4)** replays the pre-computed `handJokerResult.steps` (so the
  animation order matches the eager computation), applying each step's chips/mult/×mult/
  money and pulsing that Joker.

> Why re-run the per-card Joker engine in the animation instead of replaying pre-computed
> steps like the hand-level phase does? Because per-card effects include **random rolls**
> (Business Card money, suit-chance ×mult) that are deliberately resolved at animation
> time. The eager pass in `usePlayHand` doesn't try to predict those rolls — see the
> two-pass discussion in [`scoring-pipeline.md`](./scoring-pipeline.md). Hand-level steps
> are deterministic given context, so they're computed once and replayed.

## Continuations: how the phases chain

The phases must run **in order**: all scoring cards, *then* steel, *then* hand-level
Jokers, *then* finalize the hand. But each sequence only knows how to walk its own array.
They're glued together with the finalize refs, set up in `usePlayHand.submitHand`:

```ts
// after computing finalScore and seeding the card sequence…
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
// finally, start phase 1:
setScoringCards(scoring);
setScoringIndex(0);
```

So the chain is:

```
seed scoringCards
  → card sequence runs, onFinish calls scoringFinalizeRef
      → (if steel) seed steel, its onFinish = runHandLevel
          → seed hand-level steps, its onFinish = finalize
              → finalizeHandSubmission(finalScore, …)
```

`finalizeHandSubmission` commits `roundScore += finalScore`, clears the live
chips/mult/dev offsets, and then branches: if the round is won it may run the **gold**
sequence (phase 2) before opening the Round-Won modal; otherwise it decrements remaining
hands or calls `loseGame`.

Each sequence's own `onFinish` reads its finalize ref, **nulls it out first**, then calls
it — so a continuation never fires twice. Phases with no work (no steel, no hand-level
steps) short-circuit straight to the next continuation, so the chain is robust to empty
phases.

### Why refs instead of `async/await` or a state machine?

The sequencing is spread across renders and timers, and the "what comes next" depends on
data known only at `submitHand` time (how many steel cards, how many Joker steps). Storing
the next action in a ref lets `submitHand` *describe* the whole chain up front while the
store-driven sequences *execute* it across many renders. It's a deliberate, if unusual,
choice — internalize it before refactoring, because it's load-bearing.

## Live values vs. committed values

While scoring animates, the **live** `chips` and `multiplier` in the store are mid-flight
(partway to the final number). The Sidebar shows these live values (plus sticky dev
offsets) so the player sees them climb. Only when `finalizeHandSubmission` runs does the
score get *committed* into `roundScore` and the live chips/mult reset to 0 for the next
hand. So: `chips`/`multiplier` = "this hand, so far"; `roundScore` = "banked this round".

## Visual cues layered on top

- **Card highlight.** `useScoringPipeline` exposes `currentScoringId` /
  `currentGoldScoringId` / `currentSteelScoringId` (the id at the active cursor).
  `App.tsx` passes these into `<Game>`, and the matching card renders its "scoring" state.
- **Joker pulse.** `pulseJokers(firedIds)` bumps a per-Joker counter
  (`jokerPulseCounters`); the Joker component animates on counter change. This is how you
  see *which* Joker just contributed.
- **Sounds.** `play("pop" | "gold" | "win" | "lose")` from
  `src/components/system/sounds.ts`, fired inside `onStep`/finalize.
- **The "Nope!" animation.** A separate, simpler mechanism: `animations.ts` slice holds a
  `nopeTriggerKey` counter; `triggerNope()` increments it and `<NopeAnimation>` replays
  when the key changes. Used for rejected actions (e.g. a blocked play). It's the template
  for "fire-and-forget, key-bump-to-replay" animations.

## The discard animation (a parallel, simpler pipeline)

`src/hooks/useDiscardPipeline.ts` handles discard (and the post-play card fly-out) with a
different but related pattern — **count down a ref as cards finish their CSS transition**,
then refill:

1. `discardSelected` (or `submitHand`'s finalize) writes the ids into `discardingIds` and
   sets `pendingDiscardCountRef.current = N`. Cards in `discardingIds` get the fly-out CSS
   class.
2. As each card's transition ends, the component calls `handleCardDiscardEnd(card)`, which
   decrements the ref.
3. When the ref hits 0, `finalizeDiscard` removes the discarded cards and draws
   replacements (`drawCountForRefill`) — unless `skipDrawAfterDiscardRef` is set (true when
   the play *won* the round, so we don't refill into a finished blind).

Note the two refs that bridge play→discard: `skipDrawAfterDiscardRef` (don't redraw on a
winning play) and `pendingHandPlayResetRef` (bump `handPlaySignal` after the fly-out, which
nudges UI that keys off "a hand was just played"). On-discard Joker effects and purple-seal
Tarot creation also happen here, in `discardSelected`.

## Editing the animation safely — a checklist

1. Does your new contribution exist in **both** passes — eager (`usePlayHand`) and animated
   (the right `onStep`)? If not, the animated total won't match `finalScore`.
2. Is it applied on the correct side of the **add/multiply** boundary in both passes?
3. Does it emit a `ScoringEvent` so the trace reflects it? Update/extend a trace test.
4. If it's a *new phase*, you need: a new items array + cursor in the scoring slice, a new
   `useScoringStepSequence` in `useScoringPipeline`, a new finalize ref, and a link in the
   `submitHand` continuation chain. Place it at the correct point in the chain order.
5. Does it behave when `stepMs === 0` (reduced motion) and when its phase is empty?
6. Reset it: add it to `resetScoring()` (and the slice's `resetScoring`) so a new round
   starts clean.
</content>
