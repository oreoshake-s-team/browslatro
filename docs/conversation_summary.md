# Conversation Summary for Claude Code

> Generated: 2026-05-27  
> Purpose: Context handoff for Claude Code — covers recent conversations in this project.

---

## Project Context: Balatro Clone in React

The primary ongoing project is a **Balatro-inspired card game clone** built with React 19 and **strict TypeScript**. The codebase has matured from a chat-only architecture into a working game with a shop, run loop, boss blinds, booster packs, editions/seals, scoring trace, and dev modifiers. Source is split into focused subfolders under `src/`: `cards/`, `scoring/`, `items/`, `components/`, `dev/`.

---

## 1. Card Data Model

**File reference:** `src/cards/types.ts`, `src/cards/deck.ts`.

```ts
type Card = {
  id: number;
  rank: Rank;                  // '2'–'10', 'J', 'Q', 'K', 'A'
  suit: Suit;                  // 'spades' | 'hearts' | 'diamonds' | 'clubs'
  enhancement: Enhancement;    // null | 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'
  edition: Edition;            // null | 'foil' | 'holographic' | 'polychrome' | 'negative'
  seal: Seal;                  // null | 'gold' | 'red' | 'blue' | 'purple'
  debuffed: boolean;
};
```

**Decisions made:**
- Use stable numeric `id` (not array index) — required for React keys, animations, drag-and-drop targeting.
- Plain objects, not class instances — easier to clone and serialize for save states.
- **Do not** store chip/mult values on the card; derive them in the scoring pipeline from `rank + enhancement + edition`.
- Maintain separate arrays: `deck`, `hand`, `discard`, `played` — not a single array with a `location` field.
- Fresh decks no longer auto-apply rank-based enhancements (#182).

```ts
const RANK_CHIPS: Record<Rank, number> = { '2': 2, '3': 3, /* ... */ 'A': 11 };
const getBaseChips = (card: Card): number =>
  card.enhancement === 'stone' ? 50 : RANK_CHIPS[card.rank];
```

---

## 2. Scoring Pipeline

Scoring order mirrors real Balatro:

1. Hand evaluation → base chips + mult from hand type
2. Per scoring card (left to right): card chips → card edition → joker `onCardScored` hooks → red seal retrigger
3. Cards held in hand: steel card effects → joker `onCardHeld` hooks
4. Hand-level jokers fire after the per-card AND held-in-hand phases (#201)
5. Per-joker pass left to right → joker edition applied
6. `Math.floor(chips * mult)`

**Scoring trace overlay** (#284, #292, #295, #298): on slow scoring speed the HUD emits a step-by-step trace of chip/mult deltas — covering enhancement events (Phase B), joker events (Phase C), and finalized totals (Phase D). The trace was later moved into the sidebar and made scrollable (#371). Per-card Lucky procs render an inline indicator (#377).

**Key principle:** Keep the pipeline pure and side-effect-free. `buildHandContext(jokers)` pre-computes joker flags so each helper doesn't re-iterate.

---

## 3. Joker Effect System

Jokers use an event-hook model keyed by lifecycle events:

```ts
const JOKER_DEFINITIONS = {
  'greedy-joker': {
    onCardScored: (ctx, card) => {
      if (getEffectiveSuit(card, ctx) === 'diamonds') ctx.mult += 3;
    },
  },
  'hiker': {
    onCardScored: (ctx, card) => {
      card.chips = (card.chips ?? 0) + 5;
      ctx.chips += 5;
    },
  },
};
```

Lifecycle events covered: `onCardScored`, `onCardHeld`, `onHandPlayed`, `onDiscard`, `onRoundEnd`, `onBlindSelected`.

**Copying jokers** (Blueprint, Brainstorm) execute another joker's `onJokerTriggered` handler rather than their own.

**Editions** (#254): jokers can roll Foil, Holographic, Polychrome, or Negative — applied as a final pass after the joker's main effect.

**Rarity tags + mutations** (#256): jokers carry a rarity tag and a small mutation API used by spectrals such as Familiar/Grim/Incantation (#356).

**Selling:** drag the joker onto the deck or shift-click (#227). A hover tooltip surfaces the joker's effect, edition, and sell value (#376). Photograph triggers per-face-card during scoring (#215).

---

## 4. Hand Evaluation

- **Flush:** needs Smeared Joker support (hearts↔diamonds, spades↔clubs), Four Fingers (4-card flush), Wild cards.
- **Straight:** handles Ace-low (A-2-3-4-5), Shortcut joker (allow 1 gap), Four Fingers (4-card straight).
- Use `getEffectiveSuit(card, ctx)` to centralise wild/smeared logic.

**Important:** Run the hand evaluator on every select/deselect for preview display — keep it pure so it's cheap. Use separate call sites for preview vs. final scoring.

The HUD shows the current hand's level next to its label (#244). Secret-hand planets stay hidden in the shop until that hand is played (#197).

---

## 5. Shop & Booster Packs

The shop renders inline in the hand slot (#373), in two rows: Reroll + 2 random-kind item slots, then voucher + pack slots (#297, #181). Per-kind offers carry distinct styling (#196).

**Booster packs:**
- Arcana (#268) — open with on-the-spot enhancement preview against your current hand (#303)
- Buffoon (#272) — jokers
- Spectral (#283)
- Celestial (#247) — pick planets into consumables; two Celestial slots can be emitted (#243)
- Standard (#289)

**Shop mechanics:**
- Reroll replaces sold offers (#305) and preserves pack offers, only re-rolling item offers (#375)
- Overstock voucher buys expand the current shop immediately (#316)
- A voucher in the shop must not satisfy its own upgrade's prereq (#299)

---

## 6. Blinds, Bosses & Tags

**Blind-selection screen** at run start and between rounds (#255); Small or Big can be skipped (#259).

**Boss blinds** rolled out in phases:
- #248 — catalog + per-ante pick + HUD wiring
- #253 — score-only / round-start bosses
- #257 — suit and face debuff bosses
- #266 — round-state restriction bosses

A dev override on the blind-select screen pins a specific boss (#333). The Psychic boss now gates Submit instead of zero-scoring wrong card counts (#336).

**Tags:** the Investment tag is granted on skipped blinds and paid out after the next boss (#262).

---

## 7. Consumables, Seals & Spectrals

- **Consumables** drag to use on jokers, drag to deck to sell (#193).
- **Seals** (Gold/Red/Blue/Purple) infrastructure (#229) — Red seal retriggers in the scoring pipeline.
- **Spectrals** added (#203, #238, #356): Talisman, Deja Vu, Trance, Medium, Familiar, Grim, Incantation.
- **Tarots:** Temperance and Wheel of Fortune (#338).
- **Hand-size modifier** is run-scoped (#249).
- **Round-end payout** awards $1 per remaining hand (#188); the remaining-hands bonus no longer inflates the interest wallet (#364).

The Vouchers tab on the Run Info panel lists purchased vouchers (#184).

---

## 8. Run Modifiers (Dev)

A dev-only **Apply Modifiers** panel adjusts run state in-place:
- Chips/mult bumps fold into the played hand's score (#307, #325)
- Packs +1 / −1 to next-shop pack slot count (#291)
- Vouchers +1 / −1 (#296)
- Force Probabilities to 100% (#365)
- Boss override on the blind-select screen (#333)

A confirmation prompt guards "new game" (#275).

---

## 9. React UI Patterns Established

### Score Pop Animation (No `useEffect` needed)

Changing `key` remounts the element and replays the CSS animation. The sidebar Money value bounces on change via this pattern (#344).

```tsx
<span key={score} className="score-bounce">{score}</span>
```

```css
@keyframes bounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); color: #fbbf24; }
  100% { transform: scale(1); }
}
```

### Drag-and-Drop

Native HTML5 drag is polyfilled on touch devices (#327). Consumables and jokers share the drag-to-deck-to-sell pattern (#193, #227).

---

## 10. React Fundamentals Covered (Reference)

These were discussed and can be treated as team knowledge:

### `useEffect` — when to use
- Only for synchronizing with **things outside React**: DOM manipulation, subscriptions, timers, fetch, third-party libraries.
- **Do not** use for derived state, resetting state on prop change (use `key` instead), or responding to events.
- One-shot audio (`audio.play()`) does **not** need cleanup — it fires and finishes. Ongoing subscriptions, intervals, and event listeners do.

### `useSyncExternalStore`
- The correct primitive for subscribing to external stores (Zustand, Redux use it internally).
- Fixes the "tearing" problem in React's concurrent renderer.
- Selector pattern: `useStore(s => s.theme)` — avoid returning new object/array references from selectors; use shallow equality or `useMemo` when needed.

### CSS Layout
- `flexbox`: one-dimensional (row or column). Use for nav bars, centering, button rows.
- `grid`: two-dimensional. Use for page layouts.
- `position` values: `static` → `relative` (nudge + positioning context) → `absolute` (out of flow, relative to nearest positioned ancestor) → `fixed` (viewport) → `sticky` (hybrid).

---

## 11. Source Layout

| Folder | Description |
|--------|-------------|
| `src/cards/` | Card types, deck construction, enhancements, seals, held-in-hand effects |
| `src/scoring/` | Scoring pipeline, hand evaluator, payout, scoring trace, reordering |
| `src/items/` | Jokers, planets, tarots, spectrals, vouchers, packs, bosses, tags, shop |
| `src/components/` | UI: `cards/`, `consumables/`, `game/`, `hud/`, `jokers/`, `options/`, `shop/`, `system/` |
| `src/dev/` | Dev-only modifiers (chance override, etc.) |

The `src/` root was reorganized into these subfolders in #219.

---

## 12. What's Still Open

- Save-state serialization
- Multiplayer
- The card-id counter is module-level — will need revisiting for save/load or multiplayer

---

## Notes for Claude Code

- The project is React 19 + **strict TypeScript** (no `any`).
- Tooling: **Yarn Berry with PnP** (not npm). Run `yarn typecheck` and `yarn test` before opening PRs.
- Animations: CSS `key` trick preferred for score/money pops; no Framer Motion dependency in the tree.
- All scoring code should remain **pure functions** — no side effects, easy to unit test.
- Card IDs use a module-level counter (`let cardIdCounter = 0`) — this will need to be revisited for save/load or multiplayer.
