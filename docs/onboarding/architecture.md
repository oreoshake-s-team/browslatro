# Architecture

How the pieces fit together: boot order, the state store, the React hooks that drive the
game loop, and how data flows from a click to a re-render.

## Boot order (`src/index.tsx`)

Read it first — it's short and tells you what exists before React renders anything:

```ts
import "./styles/tokens.css";    // design tokens (the dark theme's CSS custom properties)
import "./styles/buttons.css";   // shared .btn classes
import "./index.css";
import "./i18n";                 // i18next initializes synchronously (en/haw, typed keys)

enableDragDropTouch();           // HTML5 drag-and-drop polyfill for touch devices

restoreSnapshotIfPresent();      // load the saved run from localStorage into the store
subscribeAndAutoSave();          // every store change schedules a coalesced save

root.render(<App /> + <Telemetry />);
```

Two consequences worth internalizing: the store may already contain a **restored run**
before `App` mounts (the bootstrap effects in `App.tsx` check `didRestoreFromSnapshot()`
to avoid clobbering it), and i18n is ready before any component asks for a string.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  Components (src/components, src/App.tsx)                          │
│  Presentational + thin event handlers. Subscribe to store slices. │
├──────────────────────────────────────────────────────────────────┤
│  Hooks (src/hooks)                                                 │
│  Orchestration: sequencing, timers, multi-step flows.             │
├──────────────────────────────────────────────────────────────────┤
│  Store (src/store) — one Zustand store, 17 slices                 │
│  All mutable game state + synchronous compound actions.           │
├──────────────────────────────────────────────────────────────────┤
│  Pure rules (src/scoring, src/cards, src/items, src/run)          │
│  Plain functions. No React, no store, fully unit-testable.        │
└──────────────────────────────────────────────────────────────────┘
```

The golden rule: **push logic down.** If behavior can be a pure function over its inputs,
it belongs in the bottom layer with its own unit tests. The store holds state; hooks
coordinate; components render.

## The store: one Zustand store, 17 slices

`src/store/game.ts` builds a single store by spreading the slices together:

```ts
export const useGame = create<GameState>()((set, get, store) => ({
  ...createEconomySlice(set, get, store),
  ...createVouchersSlice(set, get, store),
  ...createJokersSlice(set, get, store),
  ...createScoringSlice(set, get, store),
  ...createActionsSlice(set, get, store),
  // economy, vouchers, stats, progression, consumables, jokers, shop, packs,
  // hand, scoring, devModifiers, deck, boss, run, actions, animations,
  // lastUsedConsumable
  resetGame: () => { /* calls each slice's reset */ },
}));
```

Each slice is a `StateCreator<GameState, [], [], ThatSlicesState>` in its own file.
`GameState` is the intersection of every slice's interface, so the store is one flat,
strongly-typed object — any slice can read any other slice via `get()`.

### Slice conventions

A typical slice exposes **state fields** plus **setters** that accept a value or an
updater function, via a small `resolve()` helper:

```ts
type Updater<T> = T | ((prev: T) => T);
setChips: (update) => set((s) => ({ chips: resolve(update, s.chips) })),
```

So callers write either `setChips(0)` or `setChips((c) => c + 10)`.

Two kinds of slices:

- **Data slices** (most) — fields + setters and nothing more. E.g. `scoring.ts` holds
  `chips`, `multiplier`, `roundScore`, the `scoringEvents` trace, and the animation
  cursors.
- **The actions slice** (`src/store/actions.ts`) — compound methods that read via `get()`
  and call other slices' setters to perform whole game actions: `buyShopOffer`,
  `handleWin`, `applySpectralEffect`, `rerollBoss`, `toggleCard`, … These live in the
  store (not a hook) because they're synchronous, timer-free, and reused across
  components.

### Why a single store?

The game is densely interconnected: buying a joker can change hand size, which changes
the deal, which changes scoring. A flat store means any action reaches any state with
`get()`. The cost is a large `GameState`; the mitigation is that components subscribe to
**narrow selectors** (`useGame((s) => s.money)`), so a change to one field re-renders
only its readers.

### The second store: preferences

UI preferences are deliberately *not* run state. `src/components/system/preferences.ts`
is a separate tiny Zustand store, backed directly by `localStorage`:
`highVisibility` (default **true**), `muted` (default **true**), and `animationSpeed`
(`slow | normal | fast | instant`). They survive across runs and never enter the save
snapshot.

## The hooks layer: orchestration

Anything **multi-step, time-based, or stateful across renders** lives in a hook:

| Hook | Responsibility |
| --- | --- |
| `usePlayHand` | Validate the played hand, compute the final score eagerly, kick off the animation. The heart of the game. |
| `useScoringPipeline` | The four staged animation sequences (cards → steel → hand-level jokers, plus gold). See [`animations.md`](./animations.md). |
| `useScoringStepSequence` | Reusable primitive: "walk an array one item every `stepMs`, calling `onStep`, then `onFinish`." |
| `useDiscardPipeline` | Discard → fly-out animation → draw-refill, plus on-discard joker effects and purple seals. |
| `useRoundLifecycle` | `startNewRound`, `startNewGame`, `loseGame`, `skipBlind` — resets the right slices in the right order; also blind-select joker events (Madness, Ceremonial Dagger…). |
| `useConsumableActions` | Using Tarot / Planet / Spectral cards from the tray. |
| `useTagDispatcher` | Resolving skip-tags into their effects. |
| `useOpenedPackPicker` | Picking cards/items out of an opened booster pack. |
| `useDragController` | Drag-to-reorder for the hand and joker row (with keyboard alternatives in the components). |
| `useDelayedRender` | Small utility for deferring expensive renders. |

Hooks lean heavily on **refs as continuations**: because an animation spans many renders,
`usePlayHand` stores "what to do when this sequence finishes" in a ref
(`pipeline.scoringFinalizeRef.current = …`) rather than a closure. Understand this before
editing the scoring flow — see [`animations.md`](./animations.md).

## Render flow: a click to a re-render

Take "play a hand":

1. **Component** — the Submit Hand button in `<Game>` calls `onSubmitHand`, wired in
   `App.tsx` to `usePlayHand`'s `submitHand`.
2. **`submitHand`** reads the selection + board from the store, detects the hand label
   (honoring joker hand-eval options), applies boss adjustments, computes the *entire*
   final score eagerly, updates joker state counters, and stashes "finalize"
   continuations in refs. It seeds the animation by writing `scoringCards` /
   `scoringIndex` into the store.
3. **`useScoringPipeline`** is subscribed to those fields; its step sequences fire
   `setTimeout`s, incrementing `chips`/`multiplier`, pushing `ScoringEvent`s, playing
   sounds, pulsing jokers.
4. **Components re-render** off the changing selectors — the sidebar score ticks, the
   trace grows.
5. The last sequence's `onFinish` calls the finalize continuation, which banks the round
   score and either opens the Round Won modal or decrements remaining hands (or loses
   the game — unless a Mr. Bones-style joker prevents death).

The takeaway: **the store is the message bus.** Hooks write cursors into it; other hooks
and components react. Coordination happens through store fields and finalize refs, never
by one hook calling another's internals.

## App composition (`src/App.tsx`)

`App.tsx` is the wiring harness. It:

- pulls slices via selectors and instantiates the orchestration hooks, threading their
  results into `<Game>` and `<Sidebar>`,
- runs first-mount bootstrap effects (build the deck, deal, pick ante-1 vouchers/boss),
  each guarded by `if (didRestoreFromSnapshot()) return;`,
- computes the animation step duration (`getScoringStepMs`) from the user's speed
  preference and `prefers-reduced-motion`, and sets the `--animation-speed` CSS custom
  property so CSS animations scale with the same knob,
- conditionally renders the overlay screens (`RoundWonModal`, `NewRunScreen`,
  `BlindSelectScreen`, pack pickers, joker-grant acknowledgements), mostly
  `lazy()`-loaded behind a `LazyChunkErrorBoundary`.

Keep `App.tsx` about *wiring*. New game logic belongs in a hook or a pure module.
