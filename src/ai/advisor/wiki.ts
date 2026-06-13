import type { Stake } from "../../items/stakes";
import { getStakeSpec } from "../../items/stakes.js";
import {
  INTEREST_CAP,
  INTEREST_RATE_PER,
  REMAINING_HAND_BONUS,
} from "../../scoring/payout.js";
import type { ModelState } from "../modelState";

export interface WikiEntry {
  readonly key: string;
  readonly kind: "joker" | "boss" | "combo" | "strategy" | "stake";
  readonly title: string;
  readonly text: string;
}

export interface ComboWikiEntry {
  readonly key: string;
  readonly title: string;
  readonly jokers: ReadonlyArray<string>;
  readonly text: string;
}

/**
 * Reference content in this module is adapted (condensed and reworded) from
 * community sources, each table under its own source's terms:
 *
 * 1. JOKER_WIKI and BOSS_WIKI — merged from two community-maintained wikis:
 *    - Balatro Wiki: https://balatrowiki.org/
 *      (CC BY-NC-SA 3.0, https://creativecommons.org/licenses/by-nc-sa/3.0/)
 *    - Balatro Fandom Wiki: https://balatrogame.fandom.com/wiki/Balatro_Wiki
 *      (CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/)
 *    As a derivative, the entry text in those two tables is shared under
 *    CC BY-NC-SA 3.0, the more restrictive of the two, and may be used for
 *    non-commercial purposes only.
 *
 * 2. COMBO_WIKI, ECONOMY_WIKI, and STAKE_WIKI — adapted from
 *    "Balatro Beginner Bguide" by calderracrusade:
 *    https://steamcommunity.com/sharedfiles/filedetails/?id=3197193231
 *    Used under the author's stated terms: "Feel free to use, translate,
 *    or repost this guide, so long as you give credit and allow others to
 *    do the same." The adapted text in those tables is shared under the
 *    same terms.
 */
const CONTAINS_HAND_JOKERS: Readonly<Record<string, string>> = {
  "jolly-joker": "a Pair",
  "zany-joker": "Three of a Kind",
  "mad-joker": "Two Pair",
  "crazy-joker": "a Straight",
  "droll-joker": "a Flush",
  "sly-joker": "a Pair",
  "wily-joker": "Three of a Kind",
  "clever-joker": "Two Pair",
  "devious-joker": "a Straight",
  "crafty-joker": "a Flush",
};

function containsHandNote(hand: string): string {
  return `Triggers whenever the played hand contains ${hand} — stronger hands that include it still count, so a Full House triggers Pair, Two Pair, and Three of a Kind bonuses alike.`;
}

export const JOKER_WIKI: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(CONTAINS_HAND_JOKERS).map(([id, hand]) => [
      id,
      containsHandNote(hand),
    ]),
  ),
  blueprint:
    "Copies the ability of the joker directly to its right. Jokers trigger left to right, and reordering changes what Blueprint copies.",
  brainstorm:
    "Copies the ability of your leftmost joker, effectively doubling that effect.",
  "four-fingers":
    "Flushes and Straights only need 4 matching cards. The fifth card is free to be anything, and near-misses become real hands — factor this into discard plans.",
  shortcut:
    "Straights may be made with gaps of one rank between cards (e.g. 2-3-5-7-8). Re-evaluate 'almost straights' before discarding them.",
  smeared:
    "Hearts and Diamonds count as one suit; Spades and Clubs count as one suit. Mixed red or mixed black flushes are real flushes.",
  splash:
    "Every played card scores, not just the ones forming the hand. Padding a play to five cards adds their chips for free.",
  pareidolia:
    "Every card counts as a face card — for face-triggered jokers and for boss effects that target faces alike.",
  "oops-all-6s":
    "All listed probabilities are doubled, so chance-based effects hit far more often than their face description suggests.",
  mime:
    "Abilities of cards held in hand trigger twice. Cards whose power comes from staying in hand are worth keeping out of plays.",
  hack: "Played 2s, 3s, 4s, and 5s trigger twice. Low-rank plays score better than they look.",
  dusk: "On the final hand of the round, every played card triggers twice. If you can plan it, save your biggest play for last.",
  "sock-and-buskin":
    "Played face cards trigger twice. Face-heavy plays gain more than their base values suggest.",
  "hanging-chad":
    "The first card used in scoring triggers extra times, so the leading scored card is worth more than the rest.",
  baron:
    "Kings held in hand each multiply Mult. Keep Kings in hand rather than playing them; the bonus applies while they stay there.",
  "raised-fist":
    "Adds double the rank of your lowest held card to Mult. Which cards you keep in hand changes the bonus — a high 'lowest card' is better.",
  photograph:
    "The first face card scored each hand multiplies Mult. Include at least one face card in scoring plays to collect it.",
  "joker-stencil":
    "Multiplies Mult per empty joker slot — its strength comes from keeping slots empty, not from the played hand.",
  "ride-the-bus":
    "Gains Mult for every consecutive hand without a scored face card and resets when one scores. Keeping faces out of scoring protects the streak.",
  "green-joker":
    "Gains Mult per hand played but loses Mult per discard. Each discard has a real cost here — discard only when it clearly upgrades the play.",
  supernova:
    "Adds the number of times the played hand type has been played this run to Mult. Repeating your signature hand type keeps this strong.",
  "half-joker":
    "Bonus Mult when the played hand has 3 or fewer cards — small plays get a real boost, so don't pad hands out of habit.",
  "delayed-gratification":
    "Pays per remaining discard at end of round, but only if you used none — a single discard zeroes it. Decide at round start whether this is a no-discard round.",
  "to-the-moon":
    "Extra interest for money held at end of round. Banked cash is worth more than marginal plays; avoid spending that drops you below the next interest step.",
  "golden-joker":
    "Pays at the end of every round, so it rewards surviving rounds — its value is time, not big plays.",
  "cloud-9":
    "Pays for every 9 in your full deck at end of round. Playing and discarding 9s is harmless — destroying or transforming them cuts the payout permanently.",
  rocket:
    "Pays every round and the payout grows each time you defeat a Boss Blind, so it compounds over a long run.",
  satellite:
    "Pays per unique Planet card used this run — varied Planets raise the payout faster than repeating one.",
  "credit-card":
    "Lets your money go negative, so you can buy now and repay later — but negative money earns no interest, so debt has a quiet cost.",
  egg: "Gains sell value at the end of every round — an investment that pays only when sold; the longer you can spare the slot, the better.",
  "gros-michel":
    "Has a random chance to be destroyed at the end of each round — enjoy it while it lasts, but don't build a long-term plan around it.",
  "glass-joker":
    "Gains permanent Mult every time a Glass card shatters — playing Glass cards aggressively feeds it.",
  "ceremonial-dagger":
    "Destroys the joker to its right when a Blind is selected, converting double its sell value into permanent Mult. Position the sacrifice deliberately before picking a blind.",
  madness:
    "Each Small or Big Blind you select feeds it Mult and destroys a random other joker — strong alone, dangerous beside jokers you want to keep.",
  "ice-cream":
    "Loses Chips with every hand played and melts at 0 — front-load its value with fewer, bigger hands while it lasts.",
  popcorn:
    "Loses Mult every round and is destroyed at 0 — early-run value only; spend it while it's hot.",
  ramen:
    "Loses X Mult for every card you discard and is destroyed at X1 — every discard has a direct price here; prefer plays over discards while it's alive.",
  seltzer:
    "Retriggers every played card for a limited number of hands — make those hands your biggest; don't waste its charges on small plays.",
  "turtle-bean":
    "Extra hand size that shrinks every round — exploit the bigger hand early; it's a temporary window, not a permanent upgrade.",
};

export const BOSS_WIKI: Readonly<Record<string, string>> = {
  "the-wall":
    "No special rule — just a much larger score target. Favor your highest-scoring plays and spend discards aggressively to assemble them.",
  "the-needle":
    "You get a single hand for the whole blind. Discards still work, so use them to sculpt the one biggest hand before committing.",
  "the-water":
    "No discards this round. Playing is the only way to cycle cards, so weigh each play partly as a draw.",
  "the-manacle":
    "Reduced hand size means fewer combinations to choose from. Take solid mid-strength plays rather than waiting for perfect ones.",
  "the-psychic":
    "Hands must contain exactly 5 cards or they score 0. Pad your core combination to five; padding cards usually do not score, so their identity barely matters.",
  "the-tooth":
    "Every card you play costs $1. Smaller plays preserve money; only spread wide when the score is worth the cost.",
  "the-club":
    "All Club cards are debuffed: no chips, no ability triggers. They still count toward hand shape, but build value around the other suits.",
  "the-goad":
    "All Spade cards are debuffed: no chips, no ability triggers. They still count toward hand shape, but build value around the other suits.",
  "the-window":
    "All Diamond cards are debuffed: no chips, no ability triggers. They still count toward hand shape, but build value around the other suits.",
  "the-head":
    "All Heart cards are debuffed: no chips, no ability triggers. They still count toward hand shape, but build value around the other suits.",
  "the-plant":
    "Face cards are debuffed: no chips, no ability triggers. Lean on number cards for value.",
  "the-mouth":
    "Only one hand type may be played all round. Your first play locks the type — pick one you can repeat with the cards you expect to draw.",
  "the-eye":
    "Each hand type can only be played once this round. Sequence matters: spend your strongest type while it is available and keep fallback types in reserve.",
  "the-pillar":
    "Cards you played earlier this ante are debuffed. Fresh, unplayed cards score normally — prefer them.",
  "the-arm":
    "The played hand is scored one level lower. Leveled-up hands lose part of their payoff; raw chip-heavy plays lose less.",
  "the-flint":
    "Base Chips and Mult are halved, so weak flat plays fall off badly. Joker mult and card bonuses matter more than the hand's base value.",
  "the-house":
    "Your first hand is dealt face down. Build around the cards you can identify; face-down identities are hidden.",
  "the-fish":
    "Cards drawn after each played hand arrive face down. Plan around your known cards — face-down draws are unknowable until later.",
  "the-wheel":
    "Some dealt cards arrive face down. Treat them as unknown and do not count them toward planned combinations.",
  "the-mark":
    "All face cards are dealt face down, so a face-down card under this boss is a face card of unknown rank and suit.",
  "the-hook":
    "Two random held cards are discarded after every hand you play. Do not bank on keeping combo pieces across plays — use strong cards before they are eaten.",
  "the-serpent":
    "You always draw exactly 3 cards after a play or discard, regardless of how many you used. Big plays shrink your hand; small plays and discards can grow it.",
  "the-ox":
    "Playing your most-played hand type drops your money to $0. Avoid that type unless it is the only way to survive — losing savings also kills interest.",
  "violet-vessel":
    "A showdown blind with no special rule, just a massively larger score target. Commit your biggest scoring engine and spend discards freely to assemble it.",
  "verdant-leaf":
    "Every card is debuffed — scoring nothing — until you sell a Joker. Sell one early to lift the debuff, then play normally with whatever engine remains.",
  "amber-acorn":
    "Your Jokers are flipped face down and shuffled at the start of the blind. They still apply their effects — only your view of which is which is scrambled, so rely on what you remember rather than reading the tiles.",
  "crimson-heart":
    "One random Joker is disabled each hand and re-rolls after every play. Avoid leaning on a single must-fire Joker — spread your value so a disabled slot does not sink the hand.",
};

export const COMBO_WIKI: ReadonlyArray<ComboWikiEntry> = [
  {
    key: "lucky-cat-engine",
    title: "Lucky Cat engine",
    jokers: ["lucky-cat"],
    text: "Lucky Cat grows its X Mult every time a Lucky card successfully triggers. Keep Lucky cards in scoring positions; retrigger jokers (Hack, Dusk, Sock and Buskin, Hanging Chad) and doubled odds from Oops! All 6s multiply the growth chances.",
  },
  {
    key: "photochad",
    title: "Photograph + Hanging Chad",
    jokers: ["photograph", "hanging-chad"],
    text: "Photograph multiplies Mult when the first face card scores, and Hanging Chad retriggers the first scored card. Arrange the play so the first scoring card is a face card and the retriggers re-apply Photograph's multiplier on the same card.",
  },
  {
    key: "steel-hand-engine",
    title: "Steel Kings held in hand",
    jokers: ["mime", "baron", "steel-joker"],
    text: "Mime retriggers abilities of cards held in hand and Baron multiplies Mult per held King, so Steel Kings kept in hand stack multipliers without being played. Red Seals retrigger them again, and Steel Joker grows with every Steel card in the deck. Play few cards; keep the engine in hand.",
  },
  {
    key: "obelisk-rotation",
    title: "Obelisk rotation",
    jokers: ["obelisk"],
    text: "Obelisk multiplies Mult for each consecutive hand that is not your most-played hand type, and playing the favorite resets it. Level a signature hand early, then deliberately rotate through other hand types to keep the streak alive.",
  },
  {
    key: "deck-thinning",
    title: "Deck thinning",
    jokers: ["erosion", "trading-card"],
    text: "A deck below its starting size draws its strong cards more often, and Erosion adds Mult for every missing card. Trading Card turns a single-card first discard into money and removes the card — trimming junk one discard at a time.",
  },
  {
    key: "deck-duplication",
    title: "Deck duplication",
    jokers: ["hologram", "dna"],
    text: "Hologram grows its X Mult every time a playing card is added to your deck, and DNA permanently copies a single-card first hand. Duplicating strong enhanced cards concentrates the deck and feeds Hologram at the same time.",
  },
  {
    key: "copy-chain",
    title: "Copy chaining",
    jokers: ["blueprint", "brainstorm"],
    text: "Copies resolve through other copies. Put Blueprint leftmost with your strongest joker directly to its right: Blueprint copies that joker, and Brainstorm copies leftmost Blueprint and resolves through to the same target — three jokers acting as one.",
  },
  {
    key: "burnt-leveling",
    title: "Burnt Joker leveling",
    jokers: ["burnt-joker"],
    text: "Burnt Joker upgrades the level of the first discarded poker hand each round. Shape the round's first discard to match your signature hand type and it levels up for free before you ever play it.",
  },
  {
    key: "economy-engine",
    title: "Economy engine",
    jokers: [
      "golden-joker",
      "rocket",
      "egg",
      "business-card",
      "to-the-moon",
      "delayed-gratification",
    ],
    text: "End-of-round payout jokers compound with interest the longer money stays banked. With Delayed Gratification, discards have a real price — it pays out only if none were used this round — so either discard with purpose or not at all.",
  },
];

export const ECONOMY_WIKI = `Money compounds between rounds: every $${INTEREST_RATE_PER} held earns $1 interest (capped at $${INTEREST_CAP}, reached at $${INTEREST_CAP * INTEREST_RATE_PER} banked), and each unused hand pays $${REMAINING_HAND_BONUS}. Win in as few hands as possible and avoid spending that drops you below the next $${INTEREST_RATE_PER} step — early money snowballs into better shop options.`;

export const STAKE_WIKI: Readonly<Partial<Record<Stake, string>>> = {
  red: "Small Blind pays no reward money, so early cash comes from interest and unused hands — efficient wins matter more than usual.",
  green:
    "Required score scales faster per ante, so targets outpace a slow build — prioritize raw scoring power earlier than feels natural.",
  black:
    "Shop jokers can roll Eternal (cannot be sold or destroyed), so a lineup mistake is harder to undo — and all lower-stake pressures still apply.",
  blue: "One fewer discard per round on top of lower-stake effects. Each discard is scarcer — spend one only when it clearly upgrades the play.",
  purple:
    "Required score scales even faster, cumulative with Green Stake. Stay ahead of the curve: survival hands now need real scoring behind them.",
  orange:
    "Shop jokers may roll Perishable (debuffed after a few rounds). Favor jokers that pay off fast and expect parts of the engine to expire.",
  gold: "Jokers may roll Rental ($1 to buy, drains $3 each round) on top of every lower-stake effect. Economy carries the early game; late game, accept Rentals that raise the final score.",
};

export interface JokerRef {
  readonly id: string;
  readonly name: string;
}

export function retrieveJokerWikiEntries(
  jokers: ReadonlyArray<JokerRef>,
): ReadonlyArray<WikiEntry> {
  const entries: WikiEntry[] = [];
  const seen = new Set<string>();
  for (const joker of jokers) {
    const text = JOKER_WIKI[joker.id];
    if (text === undefined || seen.has(joker.id)) continue;
    seen.add(joker.id);
    entries.push({ key: joker.id, kind: "joker", title: joker.name, text });
  }
  const present = new Set(jokers.map((joker) => joker.id));
  for (const combo of COMBO_WIKI) {
    if (combo.jokers.some((id) => present.has(id))) {
      entries.push({
        key: combo.key,
        kind: "combo",
        title: combo.title,
        text: combo.text,
      });
    }
  }
  return entries;
}

export function retrieveShopWikiEntries(
  jokers: ReadonlyArray<JokerRef>,
): ReadonlyArray<WikiEntry> {
  return [
    ...retrieveJokerWikiEntries(jokers),
    {
      key: "economy",
      kind: "strategy",
      title: "Economy",
      text: ECONOMY_WIKI,
    },
  ];
}

export function retrieveWikiEntries(state: ModelState): ReadonlyArray<WikiEntry> {
  const entries: WikiEntry[] = [];
  const seen = new Set<string>();
  for (const joker of state.jokers) {
    const text = JOKER_WIKI[joker.id];
    if (text === undefined || seen.has(joker.id)) continue;
    seen.add(joker.id);
    entries.push({ key: joker.id, kind: "joker", title: joker.name, text });
  }
  const boss = state.blind.boss;
  if (boss !== null) {
    const text = BOSS_WIKI[boss.id];
    if (text !== undefined) {
      entries.push({ key: boss.id, kind: "boss", title: boss.name, text });
    }
  }
  const inPlay = new Set(state.jokers.map((joker) => joker.id));
  for (const combo of COMBO_WIKI) {
    if (combo.jokers.some((id) => inPlay.has(id))) {
      entries.push({
        key: combo.key,
        kind: "combo",
        title: combo.title,
        text: combo.text,
      });
    }
  }
  if (state.money >= INTEREST_RATE_PER) {
    entries.push({
      key: "economy",
      kind: "strategy",
      title: "Economy",
      text: ECONOMY_WIKI,
    });
  }
  const stakeText = STAKE_WIKI[state.stake];
  if (stakeText !== undefined) {
    entries.push({
      key: state.stake,
      kind: "stake",
      title: getStakeSpec(state.stake).name,
      text: stakeText,
    });
  }
  return entries;
}
