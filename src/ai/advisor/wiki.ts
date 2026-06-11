import type { ModelState } from "../modelState";

export interface WikiEntry {
  readonly key: string;
  readonly kind: "joker" | "boss";
  readonly title: string;
  readonly text: string;
}

/**
 * Joker and boss strategy notes adapted (condensed and reworded) from the
 * community-maintained Balatro Wiki: https://balatrowiki.org/
 *
 * That material is licensed under CC BY-NC-SA 3.0
 * (https://creativecommons.org/licenses/by-nc-sa/3.0/). As a derivative,
 * the entry text in JOKER_WIKI and BOSS_WIKI below is shared under the
 * same license and may be used for non-commercial purposes only.
 */
export const JOKER_WIKI: Readonly<Record<string, string>> = {
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
};

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
  return entries;
}
