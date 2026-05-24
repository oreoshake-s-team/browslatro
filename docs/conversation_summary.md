# Conversation Summary for Claude Code

> Generated: 2026-05-23  
> Purpose: Context handoff for Claude Code — covers recent conversations in this project.

---

## Project Context: Balatro Clone in React

The primary ongoing project is a **Balatro-inspired card game clone** built with React and JavaScript. Multiple conversations have established the core architecture. Key decisions are documented below.

---

## 1. Card Data Model

**File reference:** no file created yet — architecture established in chat.

```javascript
// Card factory — plain objects with stable IDs
const createCard = ({ rank, suit, enhancement = null, edition = null, seal = null }) => ({
  id: ++cardIdCounter,
  rank,      // '2'–'10', 'J', 'Q', 'K', 'A'
  suit,      // 'spades' | 'hearts' | 'diamonds' | 'clubs'
  enhancement, // null | 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'
  edition,     // null | 'foil' | 'holographic' | 'polychrome' | 'negative'
  seal,        // null | 'gold' | 'red' | 'blue' | 'purple'
  debuffed: false,
});
```

**Decisions made:**
- Use stable numeric `id` (not array index) — required for React keys, animations, drag-and-drop targeting.
- Plain objects, not class instances — easier to clone and serialize for save states.
- **Do not** store chip/mult values on the card; derive them in the scoring pipeline from `rank + enhancement + edition`.
- Maintain separate arrays: `deck`, `hand`, `discard`, `played` — not a single array with a `location` field.

```javascript
const RANK_CHIPS = { '2':2,'3':3,...,'A':11 };
const getBaseChips = (card) => card.enhancement === 'stone' ? 50 : RANK_CHIPS[card.rank];
```

---

## 2. Scoring Pipeline

Scoring order mirrors real Balatro:

1. Hand evaluation → base chips + mult from hand type
2. Per scoring card (left to right): card chips → card edition → joker `onCardScored` hooks → red seal retrigger
3. Cards held in hand: steel card effects → joker `onCardHeld` hooks
4. Jokers fire left to right → joker edition applied
5. `Math.floor(chips * mult)`

```javascript
const scoreHand = (playedCards, heldCards, jokers, handType) => {
  const ctx = {
    chips: HAND_TYPES[handType].chips,
    mult: HAND_TYPES[handType].mult,
    playedCards, heldCards, jokers, handType,
    scoringCards: getScoringCards(playedCards, handType),
  };
  // stages as above...
  return Math.floor(ctx.chips * ctx.mult);
};
```

**Key principle:** Keep the pipeline pure and side-effect-free. `buildHandContext(jokers)` pre-computes all joker flags so each helper doesn't need to iterate jokers repeatedly.

---

## 3. Joker Effect System

Jokers use an event-hook model keyed by lifecycle events:

```javascript
const JOKER_DEFINITIONS = {
  'greedy-joker': {
    onCardScored: (ctx, card) => {
      if (getEffectiveSuit(card, ctx) === 'diamonds') ctx.mult += 3;
    }
  },
  'hiker': {
    onCardScored: (ctx, card) => { card.chips = (card.chips || 0) + 5; ctx.chips += 5; }
  },
  // ...
};
```

Lifecycle events covered: `onCardScored`, `onCardHeld`, `onHandPlayed`, `onDiscard`, `onRoundEnd`, `onBlindSelected`.

**Copying jokers** (Blueprint, Brainstorm) work by executing another joker's `onJokerTriggered` handler rather than their own, delegating to the target joker's definition at the time of evaluation.

---

## 4. Hand Evaluation

- **Flush:** needs Smeared Joker support (hearts↔diamonds, spades↔clubs), Four Fingers (4-card flush), Wild cards.
- **Straight:** handles Ace-low (A-2-3-4-5), Shortcut joker (allow 1 gap), Four Fingers (4-card straight).
- Use a `getEffectiveSuit(card, ctx)` helper to centralise wild/smeared logic.

**Important:** Run hand evaluator on every select/deselect for preview display — keep it pure so it's cheap. Use separate call sites for preview vs. final scoring.

---

## 5. React UI Patterns Established

### Animated List Sorting (`SortableHorizontalList.jsx`)

A horizontal drag-and-drop sortable list was built using native HTML5 drag API (no Framer Motion dependency). File output: `/mnt/user-data/outputs/SortableHorizontalList.jsx`.

For **animated re-ordering** when a sort value changes programmatically, the recommended pattern is Framer Motion layout animations:

```jsx
import { motion, AnimatePresence } from "framer-motion";
// key={item.id} + layout prop = FLIP animation on sort change
```

Two requirements: stable `key` (not index) + `layout` prop on `motion.li`.

### Score Pop Animation (No `useEffect` needed)

Balatro-style score bounce uses the `key` trick — changing `key` remounts the element and replays the CSS animation:

```jsx
<span key={score} className="score-bounce">{score}</span>
```

```css
@keyframes bounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); color: #fbbf24; }
  100% { transform: scale(1); }
}
```

For floating "+N" particles, maintain an array in state; push on score event, remove `onAnimationEnd`.

---

## 6. React Fundamentals Covered (Reference)

These were discussed and can be treated as team knowledge:

### `useEffect` — when to use
- Only for synchronizing with **things outside React**: DOM manipulation, subscriptions, timers, fetch, third-party libraries.
- **Do not** use for derived state, resetting state on prop change (use `key` instead), or responding to events.
- One-shot audio (`audio.play()`) does **not** need cleanup — it fires and finishes. Ongoing subscriptions, intervals, and event listeners do.

### `useSyncExternalStore`
- The correct primitive for subscribing to external stores (Zustand, Redux use it internally).
- Fixes the "tearing" problem in React's concurrent renderer.
- Requires: `subscribe(listener)` returning unsubscribe, `getSnapshot()` that is pure and returns stable references (referential equality = no re-render).
- Selector pattern: `useStore(s => s.theme)` — avoid returning new object/array references from selectors; use `shallow` equality or `useMemo` when needed.

### CSS Layout
- `flexbox`: one-dimensional (row or column). Use for nav bars, centering, button rows.
- `grid`: two-dimensional. Use for page layouts.
- `position` values: `static` → `relative` (nudge + positioning context) → `absolute` (out of flow, relative to nearest positioned ancestor) → `fixed` (viewport) → `sticky` (hybrid).

---

## 7. Files Created

| File | Description |
|------|-------------|
| `SortableHorizontalList.jsx` | Horizontal drag-and-drop sortable list, native HTML5 drag API, editorial aesthetic |

---

## 8. What's Been Discussed But Not Implemented

- Consumables system (Tarots reshape deck, Planets level up hand types, Spectrals)
- Run/blind/shop loop
- Save state serialization
- Full joker roster implementation

---

## Notes for Claude Code

- The project is React + JavaScript (no TypeScript mentioned).
- No state management library chosen yet — architecture discussions leaned toward hand-rolled `useSyncExternalStore` stores or Zustand.
- Animations: Framer Motion is available/preferred for list animations; CSS `key` trick preferred for score animations.
- All scoring code should remain **pure functions** — no side effects, easy to unit test.
- Card IDs use a module-level counter (`let cardIdCounter = 0`) — this will need to be revisited for save/load or multiplayer.
