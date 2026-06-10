# Conversation Summary for Claude Code

> Generated: 2026-06-07  
> Purpose: Context handoff for Claude Code — covers recent conversations in this project.

---

## Project Context: Balatro Clone in React

The primary ongoing project is a **Balatro-inspired card game clone** built with React 24 and **strict TypeScript**. The codebase has matured from a chat-only architecture into a working game with a shop, run loop, boss blinds, booster packs, editions/seals, scoring trace, and dev modifiers. Source is split into focused subfolders under `src/`: `cards/`, `scoring/`, `items/`, `components/`, `dev/`.

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
- Foil/Holographic/Polychrome editions on playing cards (#550) — same `Edition` field as jokers, scored via per-card edition pass in the pipeline.
- Card identity persists per-instance (#651): the same `id` survives across rounds so animations, drag targeting, and serialization stay stable.

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

**Joker-state engine** (#808, #827): jokers can carry per-instance mutable state (chip counters for Runner / Square Joker / Wee Joker, money accumulators for Supernova / Spare Trousers). State lives on the joker instance and serializes with the run; lifecycle hooks read/write `joker.state` instead of module-level counters.

**Stickers** (Eternal / Perishable / Rental): orthogonal modifiers attached to a joker that survive across rounds (#725 infra, #728 badges). Eternal jokers can't be sold or destroyed and survive Hex/Ankh (#736); Perishable jokers tick a round counter and become debuffed (#759); Rental jokers drain $3 at end of round (#802). Buffoon-pack tiles display E/P/R sticker badges (#805). Stake tiers roll stickers on shop/pack jokers — Black Stake → Eternal, Orange Stake → 30% Perishable (#792), Gold Stake → 30% Rental (#815).

The joker module was split into `src/items/jokers/` submodules (constants, types, editions, scoring helpers) over multi-phase refactors (#660, #663, #668, #670, #673, #676 — closes #655).

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
- The full deck is replenished when the shop is displayed (#415)
- Joker tags replace a shop slot rather than adding one (#664)

**Voucher catalog:** the initial easy-to-wire batch of 12 vouchers (#285) plus targeted additions: Clearance Sale + Liquidation discounts (#599), Magic Trick + Illusion (buyable playing cards, #817), Planet Merchant + Tycoon (planet weight 2× / 4×, #819), Tarot Merchant + Tycoon (tarot weight 2× / 4×, #796), Omen Globe (1-in-5 tarot rolls become Spectral, #769), Director's Cut + Retcon (reroll Boss Blind for $10, #726), Telescope + Observatory (#739), Hone + Glow Up (edition odds, #730), Hieroglyph + Petroglyph (Ante delta with hand/discard penalty, #683).

---

## 6. Blinds, Bosses & Tags

**Blind-selection screen** at run start and between rounds (#255); Small or Big can be skipped (#259).

**Boss blinds** rolled out in phases:
- #248 — catalog + per-ante pick + HUD wiring
- #253 — score-only / round-start bosses
- #257 — suit and face debuff bosses
- #266 — round-state restriction bosses
- #273 — face-down draw bosses
- #816 — The Hook (discards 2 random held cards after each played hand)

A dev override on the blind-select screen pins a specific boss (#333). The Psychic boss now gates Submit instead of zero-scoring wrong card counts (#336). The Mouth's locked hand type renders in the Round HUD (#662).

**Tags** were expanded into a full system after the initial Investment tag (#262):

- A per-blind tag offer rolls on Small or Big skip (#443), with rich hover/focus tooltips on the blind-select screen (#541).
- Effects dispatch through one of three categories (#433, #454):
  - **Immediate:** Handy / Garbage / Speed (#454), Economy (double money up to $40, #457), D6 (#450 next-shop modifier queue).
  - **Open-pack:** Charm, Ethereal (#462), and free-pack tags — Standard / Meteor / Buffoon (#464), Coupon (free cards + booster packs, #468).
  - **Next-shop / next-round:** Uncommon + Rare (free joker, #474), Voucher (extra voucher, #476), Top-up (up to 2 Common Jokers, #480), Boss (reroll boss, #484), Orbital (upgrade a random hand by 3 levels, #487), Juggle (+3 hand size next round, #489), Edition tags — Negative / Foil / Holographic / Polychrome (#492), Double tag (duplicate the next selected tag, #496).
- Skip-tag rewards hide the BlindSelectScreen while the reward UI is active (#674). Orbital pre-rolls and names the hand it will upgrade (#600). Next-shop / next-round / duplicate-next tags are removed from `pendingTags` after their effect fires (#546). Coupon persists through reroll; edition tags reliably fire and are visualized on shop offers (#522).
- Per-run stat counters track hands, discards, and skips (#438).

---

## 7. Consumables, Seals & Spectrals

- **Consumables** drag to use on jokers, drag to deck to sell (#193).
- **Seals** (Gold/Red/Blue/Purple) infrastructure (#229) — Red seal retriggers in the scoring pipeline.
- **Spectrals** added (#203, #238, #356): Talisman, Deja Vu, Trance, Medium, Familiar, Grim, Incantation. Later additions: Cryptid — duplicate 1 selected card (#431), Wraith — random Rare Joker, money to $0 (#427), Hex + Ankh (#547), Aura (#583), Ectoplasm — add Negative to a random joker, -1 hand size (#499), Ouija — convert hand to a random rank, -1 hand size (#500), The Soul — create a Legendary Joker (#501). Pack-picked spectrals apply inline (#372) and Cryptid in a Spectral pack now applies to a selected preview card (#648). Black Hole and The Soul are hidden-rarity: they don't appear in the regular spectral pool and replace a slot at 0.3% each (#830).
- **Tarots:** Temperance and Wheel of Fortune (#338); Strength (#638), The Hanged Man (#626), suit-conversion Star / Moon / Sun / World (#692), The Emperor (#784), The High Priestess (#795), Judgement (#770), Death — left card becomes a copy of the right (#738), The Fool — copy the last Tarot or Planet used (#813). Wheel of Fortune misses show a "Nope!" animation (#493).
- **Hand-size modifier** is run-scoped (#249).
- **Round-end payout** awards $1 per remaining hand (#188); the remaining-hands bonus no longer inflates the interest wallet (#364). End-of-round joker payouts surface in the Round Won breakdown (#785).

The Vouchers tab on the Run Info panel lists purchased vouchers (#184).

---

## 8. Decks

Deck-variant infrastructure (#597) lets a run start from a non-standard composition or with passive modifiers. Each deck is a small spec applied at run start; identifying decorators render on the tile (#799).

- **Red Deck** — +1 discard per round (#597, integration coverage #685)
- **Yellow Deck** — extra starting money (#597)
- **Blue Deck** — +1 hand per round (#688)
- **Green Deck** — $2 per remaining hand + discard at round end, no interest (#820)
- **Black Deck** — +1 joker slot, -1 hand each round (#771)
- **Checkered Deck** — 26 Spades + 26 Hearts (#794)
- **Abandoned Deck** — start with no face cards, 40-card deck (#783)

---

## 9. Stakes

Stake tiers (#586) layer global difficulty modifiers on top of a run; the new-run screen ships a stake picker (#589).

- **Red Stake** — Small Blind gives no reward money (#593)
- **Blue Stake** — −1 discard per round (#737)
- **Green Stake** — per-ante chip requirement scaling (#686)
- **Black Stake** — shop/pack jokers roll Eternal (#732)
- **Purple Stake** — escalating requirement (#781)
- **Orange Stake** — 30% Perishable roll on shop/pack jokers (#792)
- **Gold Stake** — 30% Rental roll on shop/pack jokers (#815)

Stake selection lives on the new-run screen and persists into the saved run snapshot.

---

## 10. State & Persistence

Game state was migrated to a single **Zustand store** (#460) with focused slices under `src/store/` (`run`, `economy`, `shop`, `packs`, `consumables`, `boss`, `vouchers`, `jokers`, `hand`, `deck`, `scoring`, `animations`, `devModifiers`, `stats`, `progression`, `lastUsedConsumable`). Orchestration that previously lived in `Game` moved into store actions (#507, #508, #509, #517, #525) and ad-hoc IIFEs were broken into custom hooks under `src/hooks/` (`useRoundLifecycle` #518, `usePlayHand` #512, `useDragController` #531, `useTagDispatcher` #516, `useOpenedPackPicker` #515, `useConsumableActions` #514, scoring pipeline + step-sequence hooks #510, #511, discard pipeline #513).

**Save / restore** (#718, closes #380): the full run snapshot serializes to `localStorage`, auto-saves on each meaningful state change, and restores on refresh. Lives under `src/save/` (`runSnapshot.ts`, `storage.ts`, `restore.ts`).

```
src/store/run.ts       // run-level state (ante, blind, deck variant, stake)
src/store/jokers.ts    // joker slots, stickers, state
src/save/runSnapshot.ts // serialize the entire run
src/save/restore.ts    // hydrate the store on boot
```

---

## 11. Run Modifiers (Dev)

A dev-only **Apply Modifiers** panel adjusts run state in-place:
- Chips/mult bumps fold into the played hand's score (#307, #325)
- Force Probabilities to 100% (#365)
- Boss override on the blind-select screen (#333)
- Add a specific pack to the next shop (#385)
- Specific-card pickers for Spectrals (#549), Tarots / Planets (#641), and Jokers (paginated grid, #754); ad-hoc pack-queue / hand-size / voucher controls were dropped in favor of these pickers (#641)
- Voucher picker to swap the currently offered voucher (#422)

A confirmation prompt guards "new game" (#275).

---

## 12. React UI Patterns Established

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

### Lazy-loaded chunks

Heavy modals and screens are code-split via `React.lazy` + `Suspense`: PackOpen / RoundWon / ScoringTrace / NopeAnimation (#645), the Run Information dialog (#644), `BlindSelectScreen` (#652), the Shop (#665), and `@vercel/analytics` + `@vercel/speed-insights` (#667). Lazy-chunk load failures show a reload prompt (#714), and a `LazyChunkSpinner` provides a shared Suspense fallback (#828).

---

## 13. React Fundamentals Covered (Reference)

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

## 14. Source Layout

| Folder | Description |
|--------|-------------|
| `src/cards/` | Card types, deck construction, enhancements, seals, held-in-hand effects |
| `src/scoring/` | Scoring pipeline, hand evaluator, payout, scoring trace, reordering |
| `src/items/` | Jokers, planets, tarots, spectrals, vouchers, packs, bosses, tags, shop, decks, stakes, consumables |
| `src/items/jokers/` | Joker submodules — constants, types, editions, scoring helpers (split out in #655) |
| `src/components/` | UI: `cards/`, `consumables/`, `game/`, `hud/`, `jokers/`, `options/`, `shop/`, `system/` |
| `src/store/` | Zustand store slices (#460) |
| `src/run/` | Round setup, immediate-effect actions, next-shop modifiers, run stats |
| `src/save/` | Run snapshot serialize / storage / restore (#718) |
| `src/hooks/` | Extracted custom hooks (round lifecycle, scoring pipeline, drag, etc.) |
| `src/test/` | Shared test helpers (`mulberry32`, `sequenceRng` — extracted in #800) |
| `src/dev/` | Dev-only modifiers (chance override, etc.) |

The `src/` root was reorganized into the original subfolders in #219; subsequent additions (`store/`, `run/`, `save/`, `hooks/`, `test/`) followed as state and persistence work matured.

---

## 15. What's Still Open

- Multiplayer
- The card-id counter is module-level — will need revisiting for multiplayer

---

## Notes for Claude Code

- The project is React 19 + **strict TypeScript** (no `any`).
- Tooling: **Yarn Berry with `nodeLinker: pnpm`** (not npm). Run `yarn typecheck` and `yarn test` before opening PRs.
- Animations: CSS `key` trick preferred for score/money pops; no Framer Motion dependency in the tree.
- All scoring code should remain **pure functions** — no side effects, easy to unit test.
- Card IDs use a module-level counter (`let cardIdCounter = 0`) — save/load reseeds it from the snapshot (#651, #718); multiplayer will still need revisiting.
