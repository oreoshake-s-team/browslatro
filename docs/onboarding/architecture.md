# Architecture

This document explains how the pieces fit together: the state store, the React hooks that
drive the game loop, and how data flows from a click to a re-render.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  Components (src/components, src/App.tsx)                          │
│  Presentational + thin event handlers. Subscribe to store slices. │
├──────────────────────────────────────────────────────────────────┤
│  Hooks (src/hooks)                                                 │
│  Orchestration: sequencing, timers, multi-step flows.             │
│  usePlayHand, useScoringPipeline, useDiscardPipeline,             │
│  useRoundLifecycle, useConsumableActions, useTagDispatcher …      │
├──────────────────────────────────────────────────────────────────┤
│  Store (src/store)  — one Zustand store, ~20 slices               │
│  Holds all mutable game state + simple action methods.            │
├──────────────────────────────────────────────────────────────────┤
│  Pure rules (src/scoring, src/cards, src/items, src/run)          │
│  Plain functions. No React, no store, fully unit-testable.        │
└──────────────────────────────────────────────────────────────────┘
```

The golden rule: **push logic down.** If a piece of behavior can be expressed as a pure
function over its inputs, it belongs in the bottom layer with its own unit tests. The
store holds state; hooks coordinate; components render.

## The store: one Zustand store, many slices

`src/store/game.ts` builds a single store by spreading ~20 **slices** together:

```ts
export const useGame = create<GameState>()((set, get, store) => ({
  ...createEconomySlice(set, get, store),
  ...createVouchersSlice(set, get, store),
  ...createJokersSlice(set, get, store),
  ...createScoringSlice(set, get, store),
  ...createActionsSlice(set, get, store),
  // …~20 in total
  resetGame: () => { /* calls each slice's reset */ },
}));
```

Each slice is a `StateCreator<GameState, [], [], ThatSlicesState>` living in its own file
(`economy.ts`, `jokers.ts`, `scoring.ts`, `boss.ts`, `actions.ts`, …). `GameState` is the
intersection of every slice's interface, so the whole store is one flat, strongly-typed
object — any slice can read any other slice's state via `get()`.

### Slice conventions

A typical slice exposes **state fields** + **setters** that accept either a value or an
updater function. The pattern (from `src/store/scoring.ts`) is:

```ts
type Updater<T> = T | ((prev: T) => T);
function resolve<T>(u: Updater<T>, prev: T): T {
  return typeof u === "function" ? (u as (p: T) => T)(prev) : u;
}

setChips: (update) => set((s) => ({ chips: resolve(update, s.chips) })),
```

So callers can write either `setChips(0)` or `setChips((c) => c + 10)`.

Two kinds of slices:

- **Data slices** (most of them) — hold fields + setters and nothing more. e.g.
  `scoring.ts` holds `chips`, `multiplier`, `roundScore`, and the animation cursors.
- **The actions slice** (`src/store/actions.ts`) — a big slice of *compound* methods that
  read via `get()` and call other slices' setters to perform whole game actions:
  `buyShopOffer`, `handleWin`, `applySpectralEffect`, `rerollBoss`, `toggleCard`, etc.
  These live in the store (rather than a hook) because they're synchronous, don't need
  timers, and are reused across components.

### Why a single store?

The game is densely interconnected: buying a Joker can change hand size, which changes the
deal, which changes scoring. A single flat store means any action can reach any state with
`get()` without prop-drilling or context gymnastics. The cost is that `GameState` is large;
the mitigation is that components subscribe to *narrow selectors* (`useGame((s) => s.money)`),
so a change to one field only re-renders the components that read it.

## The hooks layer: orchestration

Anything that is **multi-step, time-based, or stateful across renders** lives in a hook,
not the store. The major ones:

| Hook | Responsibility |
| --- | --- |
| `usePlayHand` | Validate the played hand, compute the final score eagerly, then kick off the animation. The heart of the game. |
| `useScoringPipeline` | Owns the four staged animation sequences (cards → steel → hand-level Jokers, plus gold). See [`animations.md`](./animations.md). |
| `useScoringStepSequence` | A tiny reusable generic: "walk an array one item every `stepMs` via `setTimeout`, calling `onStep`, then `onFinish`." |
| `useDiscardPipeline` | The discard → fly-out animation → draw-refill flow, plus on-discard Joker effects and purple seals. |
| `useRoundLifecycle` | `startNewRound`, `startNewGame`, `loseGame`, `skipBlind` — resets the right slices in the right order. |
| `useConsumableActions` | Using Tarot/Planet/Spectral cards from the consumable tray. |
| `useTagDispatcher` | Resolving skip-tags into their effects. |
| `useOpenedPackPicker` | Picking cards/items out of an opened booster pack. |
| `useDragController` | Drag-to-reorder for the hand and Joker row. |

Hooks lean heavily on **refs as continuations**. Because the animation runs over many
renders, `usePlayHand` stores "what to do when this sequence finishes" in a ref
(`pipeline.scoringFinalizeRef.current = …`) rather than a closure. This is the single most
important pattern to understand before editing the scoring flow — see
[`animations.md`](./animations.md).

## Render flow: a click to a re-render

Take "play a hand":

1. **Component** — the Play button in `<Game>` calls `onSubmitHand`, wired in `App.tsx` to
   `usePlayHand`'s `submitHand`.
2. **`submitHand` (usePlayHand)** reads the current selection + board from the store,
   detects the hand label, applies boss adjustments, computes the *entire* final score
   eagerly, and stashes the "finalize" continuations in refs. It then seeds the animation
   by writing `scoringCards` / `scoringIndex` into the store.
3. **`useScoringPipeline`** is subscribed to those fields. Its `useScoringStepSequence`
   effects fire `setTimeout`s, incrementing `chips`/`multiplier` and pushing
   `ScoringEvent`s one step at a time, playing sounds, pulsing Jokers.
4. **Components re-render** off the changing `chips`/`multiplier`/`scoringEvents`
   selectors, so the Sidebar score ticks up and the trace grows.
5. When the last sequence's `onFinish` runs, it calls the finalize continuation, which
   commits the round score and either opens the Round-Won modal or decrements remaining
   hands (or triggers `loseGame`).

The takeaway: **the store is the message bus.** Hooks write cursors into it; other hooks
and components react. No hook calls another hook's internals directly — they coordinate
through store fields and the finalize refs.

## App composition (`src/App.tsx`)

`App.tsx` is the wiring harness. It:

- pulls the slices it needs via selectors,
- instantiates the orchestration hooks and threads their results into `<Game>` and
  `<Sidebar>`,
- runs the **first-mount bootstrap** effects (build the deck, deal the opening hand, pick
  ante-1 vouchers/boss, etc.) — each guarded by `if (didRestoreFromSnapshot()) return;` so
  a restored save isn't clobbered (see [`patterns.md`](./patterns.md#persistence)),
- and conditionally renders the modal/overlay screens (`RoundWonModal`, `NewRunScreen`,
  `BlindSelectScreen`, pack pickers, Joker-grant acknowledgements), most of them
  `lazy()`-loaded behind a `LazyChunkErrorBoundary`.

Keep `App.tsx` about *wiring*. New game logic should land in a hook or a pure module, not
here.
</content>
