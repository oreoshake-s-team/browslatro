import type { en } from "./en";

type LocaleMessages = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

export const haw: LocaleMessages = {
  app: {
    titleMenu: "Browslatro — Papa koho nui",
    titleRun: "Browslatro — Ke holo nei ka pāʻani",
  },
  sidebar: {
    runInfo: "Run info",
    options: "Nā koho",
    help: "Kōkua",
    hands: "Nā lima",
    discards: "Nā kiola",
    money: "Kālā",
    ante: "Ante",
    round: "Round",
    roundScore: "Round score",
    scoreAtLeast: "E loaʻa ka helu: {{score}}",
    toEarn: "e loaʻa ai {{award}}",
    lockedTo: "Locked to:",
    viewOnGithub: "View on GitHub",
    githubAriaLabel: "View browslatro source code on GitHub (opens in new tab)",
  },
  hands: {
    highCard: "High Card",
    pair: "Pair",
    twoPair: "Two Pair",
    threeOfAKind: "Three of a Kind",
    straight: "Straight",
    flush: "Flush",
    fullHouse: "Full House",
    fourOfAKind: "Four of a Kind",
    straightFlush: "Straight Flush",
    royalFlush: "Royal Flush",
    fiveOfAKind: "Five of a Kind",
    flushHouse: "Flush House",
    flushFive: "Flush Five",
  },
  cardLabels: {
    enhancementBonus: "Bonus",
    enhancementMult: "Mult",
    enhancementWild: "Wild",
    enhancementGlass: "Aniani",
    enhancementSteel: "Kila",
    enhancementStone: "Pōhaku",
    enhancementGold: "Kula",
    enhancementLucky: "Laki",
    editionFoil: "Foil",
    editionHolographic: "Holographic",
    editionPolychrome: "Polychrome",
    editionNegative: "Negative",
    luckyOdds: "1 in {{n}}",
    extraChips: "+{{value}} extra Chips",
    valueInHand: "in hand",
    valueIfHeld: "if held",
    luckyOddsMult: "1/{{n}} +{{amount}}",
    luckyOddsMoney: "1/{{n}} +${{amount}}",
    editionBadgeFoil: "Foil",
    editionBadgeHolographic: "Holo",
    editionBadgePolychrome: "Poly",
    editionBadgeNegative: "Neg",
    sealGold: "Gold Seal",
    sealRed: "Red Seal",
    sealBlue: "Blue Seal",
    sealPurple: "Purple Seal",
  },
  scoringTrace: {
    title: "Scoring Trace",
    open: "Moʻo Helu",
    expand: "Expand",
    close: "Pani",
    handHeading: "Hand {{number}}: {{hand}} (Lv {{level}})",
    handTotal: "{{chips}} Chips × {{mult}} Mult = {{total}}",
  },
  cardPiles: {
    discardLabel: "Discard",
    discardedTitle: "Discarded Cards",
    remainingTitle: "Remaining Cards",
    sell: "Sell",
    bySuit: "By suit",
    byRank: "By rank",
    close: "Pani",
  },
  newRun: {
    title: "Start New Run",
    deck: "Deck",
    stake: "Stake",
    startingHands: "starting hands",
    startingDiscards: "starting discards",
    startRun: "Start Run →",
  },
  handScore: {
    preview: "{{chips}} chips × {{mult}} mult",
  },
  trays: {
    jokers: "Nā Joker",
    consumables: "Consumables",
  },
  options: {
    language: "ʻŌlelo",
    muteSounds: "Mute sounds",
    unmuteSounds: "Unmute sounds",
    enableHighVisibility: "Enable high visibility suits",
    disableHighVisibility: "Disable high visibility suits",
    enableDyslexicFont: "Use OpenDyslexic font",
    disableDyslexicFont: "Use default font",
    animationSpeed: "Animation speed",
    speedSlow: "Lohi",
    speedNormal: "Normal",
    speedFast: "Wikiwiki",
    speedInstant: "Instant",
    advisorKey: "Coach API key",
    advisorKeyReplace: "Replace",
    advisorKeyRemove: "Remove",
    advisorKeyRemoveConfirm: "Remove your saved API key from this browser?",
    newGame: "Pāʻani hou",
    newGameConfirm: "Start a new game? This will end your current run.",
    close: "Pani",
  },
  blinds: {
    smallBlind: "Small Blind",
    bigBlind: "Big Blind",
    bossBlind: "Boss Blind",
    anteHeading: "Ante {{ante}}",
    scoreAtLeast: "Score at least",
    payout: "Payout",
    skipReward: "Skip reward",
    play: "Play {{blind}} →",
    skip: "Skip",
    rerollBoss: "Reroll Boss (${{cost}})",
  },
  roundEnd: {
    wonTitle: "Round Won!",
    lostTitle: "Game Over",
    roundScore: "Round score",
    requiredScore: "Required score",
    beatBy: "Beat by",
    shortBy: "Short by",
    moneyWon: "Kālā i loaʻa",
    baseReward: "Base reward",
    interest: "Interest ($1 per ${{per}}, max ${{cap}}) on ${{wallet}}",
    goldCards: "Gold cards ({{count}} × ${{per}})",
    remainingHands: "Remaining hands ({{units}} × ${{per}})",
    remainingHandsAndDiscards:
      "Remaining hands + discards ({{units}} × ${{per}})",
    total: "Huina",
    continue: "Hoʻomau →",
    tryAgain: "E hoʻāʻo hou →",
  },
  gameWon: {
    title: "Lanakila!",
    subtitle: "You cleared Ante {{ante}}'s Boss Blind and finished the run.",
    finalAnte: "Final ante",
    finalMoney: "Final money",
    handsPlayed: "Hands played",
    blindsSkipped: "Blinds skipped",
    endlessMode: "Endless mode →",
    newRun: "Start a new run →",
  },
  runInfo: {
    title: "Run Information",
    handsTab: "Nā lima",
    vouchersTab: "Vouchers",
    deckTab: "Pā Kāleka & Pili",
    deckHeading: "Pā Kāleka",
    stakeLadderHeading: "Nā Pili",
    currentStakeMarker: "(kēia)",
    handHeader: "Hand",
    levelHeader: "Lvl",
    chipsTimesMult: "Chips × Mult",
    playedHeader: "Played",
    noVouchers: "No vouchers purchased yet.",
    close: "Pani",
  },
  help: {
    title: "Pehea e pāʻani ai",
    textGuides: "Text guides",
    videoTutorials: "Video tutorials",
    close: "Pani",
    wikiTutorial: "Balatro Wiki — Tutorial",
    steamBeginnerGuide: "Steam — A Beginner's Guide to Balatro",
    gameranxTips: "Gameranx — Beginner Tips & Tricks",
    videoCompleteBeginner: "Complete Beginner's Guide to Balatro",
    videoHowToPlay: "How to Play Balatro: Guide, Tutorial, Tips & Tricks",
    videoTutorialBeginners:
      "Tutorial: How to Play Balatro for Complete Beginners",
  },
  shop: {
    title: "Hale kūʻai",
    money: "Kālā: ${{amount}}",
    reroll: "Reroll (${{cost}})",
    buy: "Kūʻai mai (${{price}})",
    open: "Wehe (${{price}})",
    sold: "Ua kūʻai ʻia",
    slotsFull: "Slots full",
    free: "MANUAHI",
    nextRound: "Next Round →",
    voucherHeadingOne: "Voucher",
    voucherHeadingOther: "Vouchers",
    noVoucherThisAnte: "No voucher available this ante.",
    boosterPacks: "Booster Packs",
    finishPickingFirst: "Finish picking from the pack first",
    alreadyPurchasedAnte: "Already purchased this ante",
    alreadyPurchasedRound: "Already purchased this round",
    requiresVoucher: "Requires {{voucher}}",
    notEnoughMoney: "ʻAʻole lawa ke kālā",
    notEnoughMoneyReroll: "Not enough money to reroll",
    jokerSlotsFullMax: "Joker slots are full (max {{max}})",
    consumableSlotsFullMax: "Consumable slots are full (max {{max}})",
    kindJoker: "Joker",
    kindPlanet: "Planet",
    kindTarot: "Tarot",
    kindSpectral: "Spectral",
    kindCard: "Card",
    kindPack: "Pack",
    packOpenToPickOne: "Open to pick 1 card from {{options}} options",
    packOpenToPickMany: "Open to pick {{count}} cards from {{options}} options",
    addsPlayingCard: "Adds this playing card to your deck.",
    addsPlayingCardWith: "Adds this playing card with {{traits}} to your deck.",
  },
  pack: {
    pickOneToKeep: "Pick 1 card to keep",
    pickManyToKeep: "Pick {{total}} cards to keep ({{remaining}} left)",
    previewSelectedOne: "1 preview card selected — pick a tarot to apply",
    previewSelectedMany: "{{count}} preview cards selected — pick a tarot to apply",
    done: "Pau",
    skip: "Skip",
    pick: "Koho",
    sortLabel: "Sort:",
    sortRank: "Rank",
    sortSuit: "Suit",
    addToDeck: "Add to your deck",
    noPicksRemaining: "No picks remaining",
    consumableSlotsFull: "Consumable slots are full",
    jokerSlotsFull: "Joker slots are full",
    jokerSlotsFullSellHint: "Piha nā wahi pākiki — kūʻai aku i kahi pākiki no ka hoʻokaʻawale ʻana.",
    selectOneFirst: "Select 1 card in the preview hand first",
    tooManySelectedMaxOne: "Too many cards selected (max 1)",
    selectRangeFirst: "Select 1–{{max}} cards in the preview hand first",
    tooManySelectedMax: "Too many cards selected (max {{max}})",
  },
  hand: {
    sortManual: "Manual",
    manualOrderHint: "Manual order (drag a card to rearrange)",
  },
  consumables: {
    foolWillCreate: "Will create {{name}} ({{kind}})",
    foolCopyNone: "No card used yet — creates nothing",
  },
  game: {
    submitHand: "Submit Hand",
    bossVoidedMouth: "{{hand}} scored 0 — The Mouth locks you to {{locked}}",
    bossVoidedEye: "{{hand}} scored 0 — The Eye blocks repeat hand types",
    bossArmLowered: "The Arm lowered {{hand}} to level {{level}}",
  },
  admin: {
    enabled: "Hoʻohana luna",
    disabled: "Ua pau ka hoʻohana luna",
  },
  devMenu: {
    humanPlayLog: "Human play log",
    recordedDecisions_one: "{{count}} recorded decision",
    recordedDecisions_other: "{{count}} recorded decisions",
    exportLog: "Export log",
    kind_hand: "hands",
    kind_purchase: "purchases",
    kind_reroll: "rerolls",
    "kind_pack-pick": "pack picks",
    "kind_consumable-use": "consumables",
    "kind_joker-sell": "sells",
    "kind_blind-skip": "skips",
    clearLog: "Clear log",
  },
  advisor: {
    keyPlaceholder: "sk-ant-…",
    autopilot: "Kūkākūkā",
    suggestTitle: "Neʻe i koho ʻia",
    recommendation: "Neʻe i ʻōlelo ʻia",
    alternative: "Koho ʻē aʻe hoʻowalewale",
    concept: "Manaʻo nui",
    playCandidate: "Pāʻani {{hand}} ({{cards}}) — {{score}} helu",
    discardCandidate: "Kiola {{cards}}",
    buyCandidate: "Buy {{name}} for ${{cost}}",
    sellCandidate: "Kūʻai aku iā {{name}} no ${{value}}",
    useCandidate: "Use {{name}}",
    useDuringBlind: "Use this during the blind — it needs card targets you can't pick in the shop.",
    rerollCandidate: "Reroll the shop for ${{cost}}",
    leaveCandidate: "Leave the shop and bank your money",
    pickCandidate: "Pick {{name}}",
    skipCandidate: "Skip the remaining picks",
    suggestApply: "Do it",
    suggestDismiss: "Dismiss",
    suggestRetry: "Try again",
    suggestError: "The coach couldn't make a suggestion right now.",
    coachLabel: "Coach · local · instant",
    coachTip: "Coach tip",
    coachComputing: "Coaching…",
    coachHide: "Hide coach",
    askAiButton: "Ask AI (rate-limited)",
    askAiButtonByok: "Ask AI",
    aiThinking: "Asking the AI…",
    aiAgrees: "AI agrees ✓",
    aiSuggestsInstead: "AI suggests {{move}} instead",
    suggestShopButton: "Suggest a purchase",
    suggestPackButton: "Suggest a pick",
    autopilotApprove: "ʻApono i ka neʻe",
    autopilotStop: "Hoʻōki i ke kūkākūkā",
    autopilotAskAi: "Nīnau i ka AI",
    feedbackBadPick: "Bad pick",
    feedbackOpenLabel: "Flag this suggestion as a bad pick",
    feedbackPrompt: "Which would you pick instead?",
    feedbackSubmit: "Submit",
    feedbackPlayInstead: "E pāʻani i kēia",
    feedbackDoInstead: "E hana i kēia",
    feedbackJustBad: "Just bad, skip",
    feedbackCancel: "Cancel",
    feedbackRecorded: "Thanks — your feedback was recorded.",
    autopilotExplainError: "ʻAʻole hiki i ke kumu aʻo ke wehewehe i kēia neʻe i kēia manawa.",
    autopilotPlayProposal: "Pāʻani {{hand}}",
    autopilotDiscardProposal: "Kiola i nā kāleka i koho ʻia",
    downloadingModel: "Ke ho\u02bboiho nei i ke kumu a\u02bbo\u2026",
    noSuggestionAvailable:
      "No suggestion available \u2014 the coach can't see any face-up cards to suggest.",
    advisorUnavailable:
      "Coach unavailable \u2014 the suggestion model failed to load. Try again later.",
    thinking: "The coach is thinking\u2026",
    keyLabel: "Your Anthropic API key",
    keySave: "Save key",
    keyRejected:
      "Your API key was rejected \u2014 paste a valid key to keep unlimited coaching.",
    limitReached:
      "Free explanations are used up \u2014 the next one unlocks in about {{minutes}} min. Add your own key for unlimited coaching.",
    limitReachedNoEta:
      "Free explanations are used up for now. Add your own key for unlimited coaching.",
    keyStep1: "Create an Anthropic account at console.anthropic.com",
    keyStep2: "Add billing under Plans & billing",
    keyStep3: "Create a key under API Keys and paste it here",
    keyLink: "Get an API key \u2192",
    keyStorageTitle: "How your key is handled",
    keyStorageLocal:
      "Stored unencrypted in this browser's local storage \u2014 it stays until you remove it.",
    keyStorageProxy:
      "Each coaching request sends it to our server, which forwards it to Anthropic. It never goes straight from your browser to Anthropic.",
    keyStorageCaution:
      "Anyone who can use this browser or device can read it. Prefer a dedicated key with a low spend limit, remove it on shared machines, and revoke it from the Anthropic console if it's ever exposed.",
  },
  suits: {
    spades: "Spades",
    hearts: "Hearts",
    diamonds: "Diamonds",
    clubs: "Clubs",
  },
  a11y: {
    opensInNewTab: "wehe ma ka māka hou",
    faceDownCard: "Face-down card",
    stoneCard: "Stone card",
    cardName: "{{rank}} of {{suit}}",
    cardNameEnhanced: "{{rank}} of {{suit}} ({{enhancement}})",
    cardNameEnhancedValue: "{{rank}} of {{suit}} ({{enhancement}}, {{value}})",
    enhancementValueChips: "{{value}} chips",
    enhancementValueMult: "{{value}} Mult",
    enhancementValueMoney: "{{value}}",
    enhancementValueHeldInHand: "{{value}} while held in hand",
    enhancementValueHeldAtEndOfRound: "{{value}} if held at end of round",
    enhancementValueLucky:
      "{{multOdds}} for +{{mult}} Mult, {{moneyOdds}} for +${{money}}",
    cardWithDetail: "{{name}}, {{detail}}",
    cardDebuffed: "{{name}}, debuffed",
    cardNewlyDrawn: "{{name}}, newly drawn",
    cardForced: "{{name}}, koho paʻa — ʻaʻole hiki ke wehe",
    cardForcedAnnounce: "ʻO {{name}} kāu kāleka koho paʻa i kēia manawa.",
    cardLockedAttempt: "ʻAʻole hiki ke wehe i ka kāleka koho paʻa.",
    itemsForSale: "Items for sale",
    vouchersForAnte: "Vouchers for this ante",
    boosterPacksForSale: "Booster packs for sale",
    packsForSale: "Packs for sale",
    overrideVoucherDev: "Override offered voucher (dev)",
    rerollShopOffers: "Reroll shop offers for ${{cost}}",
    buyOffer: "{{label}}: {{name}}",
    packOptions: "Pack options",
    previewHand: "Preview hand",
    sortPreviewHand: "Sort preview hand",
    pickOption: "Pick {{name}}",
    pickOptionWith: "Pick {{name}} ({{stickers}})",
    tagsHeld: "Tags held",
    blindsForAnte: "Blinds for this ante",
    overrideBossDev: "Override boss for this ante (dev)",
    skipBlind: "Skip {{blind}} (no reward, no penalty)",
    rerollBossNotEnough: "Reroll Boss (${{cost}}) — not enough money",
    startingResources: "Starting resources for this run",
    deckVariant: "Deck variant",
    stakeDifficulty: "Stake difficulty",
    activeStakeEffects: "Active stake effects",
    jokerPickerPagination: "Joker picker pagination",
    prevJokerPage: "Previous joker page",
    nextJokerPage: "Next joker page",
    jokerStickers: "Joker stickers",
    stickerDebuffed: "{{name}} — debuffed",
    stickerRoundsLeft: "{{name}} — {{remaining}} of {{total}} rounds left",
    stickerInfo: "{{name}} — {{detail}}",
    grantedJokers: "Granted jokers",
    game: "Pāʻani",
    gameStatus: "Ke kūlana pāʻani",
    yourHand: "Kāu lima",
    sortHand: "Hoʻokaʻina i ka lima",
    manualOrder: "Manual order",
    moveLeft: "E hoʻoneʻe iā {{item}} i ka hema",
    moveRight: "E hoʻoneʻe iā {{item}} i ka ʻākau",
    movedTo: "Ua neʻe ʻo {{item}} i ke kūlana {{position}} o {{total}}",
    atStart: "Aia ʻo {{item}} ma ke kūlana mua",
    atEnd: "Aia ʻo {{item}} ma ke kūlana hope",
    equippedJokers: "Nā Joker i hoʻokomo ʻia",
    emptyJokerSlot: "Wahi joker hakahaka",
    faceDownJoker: "Joker huli i lalo, wahi {{position}} o {{total}}",
    jokerDebuffed: "Debuffed — ʻaʻole helu ʻia.",
    jokerDisabledByBoss: "Ua hoʻopau ʻia ʻo {{name}} i kēia lima.",
    jokerEdition: "{{name}} edition: {{description}}.",
    sellHint: "Shift-kaomi a kauō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    sellJoker: "E kūʻai aku iā {{name}} (${{value}} ka waiwai)",
    soldJoker: "Ua kūʻai ʻia ʻo {{name}} no ${{value}}",
    consumableSlots: "Nā wahi consumable",
    emptyConsumableSlot: "Wahi consumable hakahaka",
    consumableTile:
      "E hoʻohana iā {{name}} ({{kind}}). Shift-kaomi a kauō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    deckPile: "Pūʻulu kāleka ({{total}} kāleka i koe)",
    discardPile: "Pūʻulu kiola ({{total}} kāleka)",
    remainingCardsSummary: "Hōʻuluʻulu o nā kāleka i koe",
    scoringTraceLog: "Moʻo helu",
    closeScoringTrace: "E pani i ka moʻo helu",
    expandScoringTrace: "E hoʻonui i ka moʻo helu a piha ka pale",
    lockedTo: "Paʻa iā {{hand}}",
    runInfoSections: "Nā māhele ʻike holo",
    level: "Pae",
    handLevel: "{{hand}}, pae {{level}}",
    submitHand: "Submit Hand",
    submitHandWith:
      "Submit Hand: {{hand}}, {{chips}} chips times {{mult}} multiplier",
  },
  jokerNames: {
    "8-ball": "8 Ball", // needs translation
    "abstract-joker": "Abstract Joker", // needs translation
    "acrobat": "Acrobat", // needs translation
    "ancient-joker": "Ancient Joker", // needs translation
    "arrowhead": "Arrowhead", // needs translation
    "astronomer": "Astronomer", // needs translation
    "banner": "Banner", // needs translation
    "baron": "Baron", // needs translation
    "baseball-card": "Baseball Card", // needs translation
    "blackboard": "Blackboard", // needs translation
    "bloodstone": "Bloodstone", // needs translation
    "blue-joker": "Blue Joker", // needs translation
    "blueprint": "Blueprint", // needs translation
    "bootstraps": "Bootstraps", // needs translation
    "brainstorm": "Brainstorm", // needs translation
    "bull": "Bull", // needs translation
    "burglar": "Burglar", // needs translation
    "burnt-joker": "Burnt Joker", // needs translation
    "business-card": "Business Card", // needs translation
    "campfire": "Campfire", // needs translation
    "card-sharp": "Card Sharp", // needs translation
    "cartomancer": "Cartomancer", // needs translation
    "castle": "Castle", // needs translation
    "cavendish": "Cavendish", // needs translation
    "ceremonial-dagger": "Ceremonial Dagger", // needs translation
    "certificate": "Certificate", // needs translation
    "chaos-the-clown": "Chaos the Clown", // needs translation
    "clever-joker": "Clever Joker", // needs translation
    "cloud-9": "Cloud 9", // needs translation
    "constellation": "Constellation", // needs translation
    "crafty-joker": "Crafty Joker", // needs translation
    "crazy-joker": "Crazy Joker", // needs translation
    "credit-card": "Credit Card", // needs translation
    "delayed-gratification": "Delayed Gratification", // needs translation
    "devious-joker": "Devious Joker", // needs translation
    "diet-cola": "Diet Cola", // needs translation
    "dna": "DNA", // needs translation
    "drivers-license": "Driver's License", // needs translation
    "droll-joker": "Droll Joker", // needs translation
    "drunkard": "Drunkard", // needs translation
    "dusk": "Dusk", // needs translation
    "egg": "Egg", // needs translation
    "erosion": "Erosion", // needs translation
    "even-steven": "Even Steven", // needs translation
    "faceless-joker": "Faceless Joker", // needs translation
    "fibonacci": "Fibonacci", // needs translation
    "flash-card": "Flash Card", // needs translation
    "flower-pot": "Flower Pot", // needs translation
    "fortune-teller": "Fortune Teller", // needs translation
    "four-fingers": "Four Fingers", // needs translation
    "gift-card": "Gift Card", // needs translation
    "glass-joker": "Glass Joker", // needs translation
    "gluttonous-joker": "Gluttonous Joker", // needs translation
    "golden-joker": "Golden Joker", // needs translation
    "golden-ticket": "Golden Ticket", // needs translation
    "greedy-joker": "Greedy Joker", // needs translation
    "green-joker": "Green Joker", // needs translation
    "gros-michel": "Gros Michel", // needs translation
    "hack": "Hack", // needs translation
    "half-joker": "Half Joker", // needs translation
    "hallucination": "Hallucination", // needs translation
    "hanging-chad": "Hanging Chad", // needs translation
    "hiker": "Hiker", // needs translation
    "hit-the-road": "Hit the Road", // needs translation
    "hologram": "Hologram", // needs translation
    "ice-cream": "Ice Cream", // needs translation
    "joker-stencil": "Joker Stencil", // needs translation
    "jolly-joker": "Jolly Joker", // needs translation
    "juggler": "Juggler", // needs translation
    "loyalty-card": "Loyalty Card", // needs translation
    "luchador": "Luchador", // needs translation
    "lucky-cat": "Lucky Cat", // needs translation
    "lusty-joker": "Lusty Joker", // needs translation
    "mad-joker": "Mad Joker", // needs translation
    "madness": "Madness", // needs translation
    "mail-in-rebate": "Mail-In Rebate", // needs translation
    "marble-joker": "Marble Joker", // needs translation
    "matador": "Matador", // needs translation
    "merry-andy": "Merry Andy", // needs translation
    "midas-mask": "Midas Mask", // needs translation
    "mime": "Mime", // needs translation
    "misprint": "Misprint", // needs translation
    "mr-bones": "Mr. Bones", // needs translation
    "mystic-summit": "Mystic Summit", // needs translation
    "obelisk": "Obelisk", // needs translation
    "odd-todd": "Odd Todd", // needs translation
    "onyx-agate": "Onyx Agate", // needs translation
    "oops-all-6s": "Oops! All 6s", // needs translation
    "pareidolia": "Pareidolia", // needs translation
    "photograph": "Photograph", // needs translation
    "plus-four-mult": "Joker", // needs translation
    "popcorn": "Popcorn", // needs translation
    "raised-fist": "Raised Fist", // needs translation
    "ramen": "Ramen", // needs translation
    "red-card": "Red Card", // needs translation
    "reserved-parking": "Reserved Parking", // needs translation
    "ride-the-bus": "Ride the Bus", // needs translation
    "riff-raff": "Riff-Raff", // needs translation
    "rocket": "Rocket", // needs translation
    "rough-gem": "Rough Gem", // needs translation
    "runner": "Runner", // needs translation
    "satellite": "Satellite", // needs translation
    "scary-face": "Scary Face", // needs translation
    "scholar": "Scholar", // needs translation
    "seance": "Séance", // needs translation
    "seeing-double": "Seeing Double", // needs translation
    "seltzer": "Seltzer", // needs translation
    "shoot-the-moon": "Shoot the Moon", // needs translation
    "shortcut": "Shortcut", // needs translation
    "showman": "Showman", // needs translation
    "sixth-sense": "Sixth Sense", // needs translation
    "sly-joker": "Sly Joker", // needs translation
    "smeared": "Smeared Joker", // needs translation
    "smiley-face": "Smiley Face", // needs translation
    "sock-and-buskin": "Sock and Buskin", // needs translation
    "space-joker": "Space Joker", // needs translation
    "spare-trousers": "Spare Trousers", // needs translation
    "splash": "Splash", // needs translation
    "square-joker": "Square Joker", // needs translation
    "steel-joker": "Steel Joker", // needs translation
    "stone-joker": "Stone Joker", // needs translation
    "stuntman": "Stuntman", // needs translation
    "supernova": "Supernova", // needs translation
    "superposition": "Superposition", // needs translation
    "swashbuckler": "Swashbuckler", // needs translation
    "the-duo": "The Duo", // needs translation
    "the-family": "The Family", // needs translation
    "the-idol": "The Idol", // needs translation
    "the-order": "The Order", // needs translation
    "the-tribe": "The Tribe", // needs translation
    "the-trio": "The Trio", // needs translation
    "throwback": "Throwback", // needs translation
    "to-do-list": "To Do List", // needs translation
    "to-the-moon": "To the Moon", // needs translation
    "trading-card": "Trading Card", // needs translation
    "troubadour": "Troubadour", // needs translation
    "turtle-bean": "Turtle Bean", // needs translation
    "vagabond": "Vagabond", // needs translation
    "vampire": "Vampire", // needs translation
    "walkie-talkie": "Walkie Talkie", // needs translation
    "wee-joker": "Wee Joker", // needs translation
    "wily-joker": "Wily Joker", // needs translation
    "wrathful-joker": "Wrathful Joker", // needs translation
    "zany-joker": "Zany Joker", // needs translation
  },
  jokerDescriptions: {
    "8-ball": "{{prob}} chance for each played {{rank}} to create a {{cardType}} card when scored{{room}}", // needs translation
    "abstract-joker": "{{mult}} Mult for each {{card}} card", // needs translation
    "acrobat": "{{xmult}} Mult on {{timing}} of round", // needs translation
    "ancient-joker": "Each played card with {{suit}} gives {{xmult}} Mult when scored, suit changes at end of round", // needs translation
    "arrowhead": "Played cards with Spade suit give {{chips}} Chips when scored", // needs translation
    "astronomer": "All {{cardType}} cards and {{packType}} in the shop are {{cost}}", // needs translation
    "banner": "{{chips}} Chips for each remaining {{resource}}", // needs translation
    "baron": "Each {{rank}} held in hand gives {{xmult}} Mult", // needs translation
    "baseball-card": "{{rarity}} Jokers each give {{xmult}} Mult", // needs translation
    "blackboard": "{{xmult}} Mult if all cards held in hand are Spades or Clubs", // needs translation
    "bloodstone": "{{prob}} chance for played cards with Heart suit to give {{xmult}} Mult when scored", // needs translation
    "blue-joker": "{{chips}} Chips for each remaining card in {{deck}}", // needs translation
    "blueprint": "Copies ability of {{target}} to the right", // needs translation
    "bootstraps": "{{mult}} Mult for every {{money}} you have", // needs translation
    "brainstorm": "Copies the ability of leftmost {{target}}", // needs translation
    "bull": "{{chips}} Chips for each {{money}} you have", // needs translation
    "burglar": "When {{blind}} is selected, gain {{hands}} Hands and {{discards}}", // needs translation
    "burnt-joker": "Upgrade the level of the first {{action}} poker hand each round", // needs translation
    "business-card": "Played {{cardType}} cards have a {{prob}} chance to give {{money}} when scored", // needs translation
    "campfire": "This Joker gains {{xmult}} Mult for each card {{action}}, resets when {{blind}} is defeated", // needs translation
    "card-sharp": "{{xmult}} Mult if played {{hand}} has already been played this round", // needs translation
    "cartomancer": "Create a {{cardType}} card when {{trigger}} is selected {{room}}", // needs translation
    "castle": "This Joker gains {{chips}} Chips per discarded {{suit}} card, suit changes every round", // needs translation
    "cavendish": "{{xmult}} Mult {{prob}} chance this card is destroyed at the end of round", // needs translation
    "ceremonial-dagger": "When {{blind}} is selected, destroy Joker to the right and permanently add {{multiplier}} its sell value to this {{stat}}", // needs translation
    "certificate": "When round begins, add a random {{card}} with a random {{seal}} to your hand", // needs translation
    "chaos-the-clown": "{{rerolls}} free {{action}} per shop", // needs translation
    "clever-joker": "{{chips}} Chips if played hand contains a Two Pair", // needs translation
    "cloud-9": "Earn {{money}} for each {{rank}} in your {{deck}} at end of round", // needs translation
    "constellation": "This Joker gains {{xmult}} Mult every time a {{cardType}} card is used", // needs translation
    "crafty-joker": "{{chips}} Chips if played hand contains a Flush", // needs translation
    "crazy-joker": "{{mult}} Mult if played hand contains a Straight", // needs translation
    "credit-card": "Go up to {{money}} in debt", // needs translation
    "delayed-gratification": "Earn {{money}} per {{discard}} if no discards are used by end of the round", // needs translation
    "devious-joker": "{{chips}} Chips if played hand contains a Straight", // needs translation
    "diet-cola": "Sell this card to create a free {{tag}}", // needs translation
    "dna": "If {{when}} of round has only {{count}} card, add a permanent copy to deck and draw it to {{location}}", // needs translation
    "drivers-license": "{{xmult}} Mult if you have at least {{count}} Enhanced cards in your full deck", // needs translation
    "droll-joker": "{{mult}} Mult if played hand contains a Flush", // needs translation
    "drunkard": "{{discards}} discard each round", // needs translation
    "dusk": "Retrigger all played cards in {{hand}} of the round", // needs translation
    "egg": "Gains {{money}} of {{sellValue}} at end of round", // needs translation
    "erosion": "{{mult}} Mult for each card below {{threshold}} in your full deck", // needs translation
    "even-steven": "Played cards with {{parity}} rank give {{mult}} Mult when scored {{ranks}}", // needs translation
    "faceless-joker": "Earn {{money}} if {{count}} or more {{cards}} are discarded at the same time", // needs translation
    "fibonacci": "Each played {{rank1}}, {{rank2}}, {{rank3}}, {{rank4}}, or {{rank5}} gives {{mult}} Mult when scored", // needs translation
    "flash-card": "This Joker gains {{mult}} Mult per {{reroll}} in the shop", // needs translation
    "flower-pot": "{{xmult}} Mult if poker hand contains a Diamond card, Club card, Heart card, and Spade card", // needs translation
    "fortune-teller": "{{mult}} Mult per {{cardType}} card used this run", // needs translation
    "four-fingers": "All Flushes and Straights can be made with 4 cards", // needs translation
    "gift-card": "Add {{money}} of {{sellValue}} to every {{card1}} and {{card2}} card at end of round", // needs translation
    "glass-joker": "This Joker gains {{xmult}} Mult for every {{cardType}} that is destroyed", // needs translation
    "gluttonous-joker": "Played cards with Club suit give {{mult}} Mult when scored", // needs translation
    "golden-joker": "Earn {{money}} at end of round", // needs translation
    "golden-ticket": "Played {{cardType}} cards earn {{money}} when scored", // needs translation
    "greedy-joker": "Played cards with Diamond suit give {{mult}} Mult when scored", // needs translation
    "green-joker": "{{handMult}} Mult per hand played {{discardMult}} Mult per discard", // needs translation
    "gros-michel": "{{mult}} Mult{{prob}} chance this card is destroyed at end of round", // needs translation
    "hack": "Retrigger each played {{rank1}}, {{rank2}}, {{rank3}}, or {{rank4}}", // needs translation
    "half-joker": "{{mult}} Mult if played hand contains {{cards}} or fewer cards", // needs translation
    "hallucination": "{{prob}} chance to create a {{cardType}} card when any {{pack}} is opened {{room}}", // needs translation
    "hanging-chad": "Retrigger {{position}} played card used in scoring {{times}} additional times", // needs translation
    "hiker": "Every played {{cardType}} permanently gains {{chips}} Chips when scored", // needs translation
    "hit-the-road": "This Joker gains {{xmult}} Mult for every {{rank}} discarded this round", // needs translation
    "hologram": "This Joker gains {{xmult}} Mult every time a {{card}} is added to your deck", // needs translation
    "ice-cream": "{{chips}} Chips{{decay}} Chips for every hand played", // needs translation
    "joker-stencil": "{{xmult}} Mult for each empty {{slotType}} slot Joker Stencil included", // needs translation
    "jolly-joker": "{{mult}} Mult if played hand contains a Pair", // needs translation
    "juggler": "{{handSize}} hand size", // needs translation
    "loyalty-card": "{{xmult}} Mult every {{hands}} hands played{{remaining}}", // needs translation
    "luchador": "Sell this card to disable the current {{boss}}", // needs translation
    "lucky-cat": "This Joker gains {{xmult}} Mult every time a {{cardType}} card {{result}} triggers", // needs translation
    "lusty-joker": "Played cards with Heart suit give {{mult}} Mult when scored", // needs translation
    "mad-joker": "{{mult}} Mult if played hand contains a Two Pair", // needs translation
    "madness": "When {{blind1}} or {{blind2}} is selected, gain {{xmult}} Mult and {{action}} a random Joker", // needs translation
    "mail-in-rebate": "Earn {{money}} for each discarded {{rank}}, rank changes every round", // needs translation
    "marble-joker": "Adds one {{enhancement}} card to the deck when {{trigger}} is selected", // needs translation
    "matador": "Earn {{money}} if played hand triggers the {{boss}} ability", // needs translation
    "merry-andy": "{{discards}} discards each round, {{handSize}} hand size", // needs translation
    "midas-mask": "All played {{cardType}} cards become {{enhancement}} cards when scored", // needs translation
    "mime": "Retrigger all card {{location}} abilities", // needs translation
    "misprint": "{{mult}} Mult", // needs translation
    "mr-bones": "Prevents Death if chips scored are at least {{threshold}} of required chips {{outcome}}", // needs translation
    "mystic-summit": "{{mult}} Mult when {{discards}} discards remaining", // needs translation
    "obelisk": "This Joker gains {{xmult}} Mult per {{streak}} hand played without playing your most played {{hand}}", // needs translation
    "odd-todd": "Played cards with {{parity}} rank give {{chips}} Chips when scored {{ranks}}", // needs translation
    "onyx-agate": "Played cards with Club suit give {{mult}} Mult when scored", // needs translation
    "oops-all-6s": "Doubles all {{listed}} {{probabilities}} {{example}} -> {{result}}", // needs translation
    "pareidolia": "All cards are considered {{cardType}} cards", // needs translation
    "photograph": "First played {{cardType}} card gives {{xmult}} Mult when scored", // needs translation
    "plus-four-mult": "{{mult}} Mult", // needs translation
    "popcorn": "{{mult}} Mult {{decay}} Mult per round played", // needs translation
    "raised-fist": "Adds {{factor}} the rank of {{rank}} ranked card held in hand to Mult", // needs translation
    "ramen": "{{xmult}} Mult, loses {{decay}} Mult per {{card}} discarded", // needs translation
    "red-card": "This Joker gains {{mult}} Mult when any {{pack}} is skipped", // needs translation
    "reserved-parking": "Each {{cardType}} card held in hand has a {{prob}} chance to give {{money}}", // needs translation
    "ride-the-bus": "This Joker gains {{mult}} Mult per {{consecutive}} hand played without a scoring {{cardType}} card", // needs translation
    "riff-raff": "When {{trigger}} is selected, create {{count}} {{rarity}} {{cardType}} {{room}}", // needs translation
    "rocket": "Earn {{money}} at end of round. Payout increases by {{increase}} when {{blind}} is defeated", // needs translation
    "rough-gem": "Played cards with Diamond suit earn {{money}} when scored", // needs translation
    "runner": "Gains {{chips}} Chips if played hand contains a Straight", // needs translation
    "satellite": "Earn {{money}} at end of round per unique {{cardType}} card used this run", // needs translation
    "scary-face": "Played {{cardType}} cards give {{chips}} Chips when scored", // needs translation
    "scholar": "Played {{rank}} give {{chips}} Chips and {{mult}} Mult when scored", // needs translation
    "seance": "If {{hand}} is a Straight Flush, create a random {{cardType}} card {{room}}", // needs translation
    "seeing-double": "{{xmult}} Mult if played hand has a scoring Club card and a scoring card of any other suit", // needs translation
    "seltzer": "Retrigger all cards played for the next {{hands}} hands", // needs translation
    "shoot-the-moon": "Each {{rank}} held in hand gives {{mult}} Mult", // needs translation
    "shortcut": "Allows Straights to be made with gaps of {{gap}} {{example}}", // needs translation
    "showman": "{{card1}}, {{card2}}, {{card3}}, and {{card4}} cards may appear multiple times", // needs translation
    "sixth-sense": "If {{hand}} of round is a single {{rank}}, destroy it and create a {{cardType}} card {{room}}", // needs translation
    "sly-joker": "{{chips}} Chips if played hand contains a Pair", // needs translation
    "smeared": "Hearts and Diamonds count as the same suit, Spades and Clubs count as the same suit", // needs translation
    "smiley-face": "Played {{cardType}} cards give {{mult}} Mult when scored", // needs translation
    "sock-and-buskin": "Retrigger all played {{cardType}} cards", // needs translation
    "space-joker": "{{prob}} chance to upgrade level of played {{hand}}", // needs translation
    "spare-trousers": "This Joker gains {{mult}} Mult if played hand contains a {{hand}}", // needs translation
    "splash": "Every {{card}} counts in scoring", // needs translation
    "square-joker": "This Joker gains {{chips}} Chips if played hand has exactly {{cards}} cards", // needs translation
    "steel-joker": "Gives {{xmult}} Mult for each {{card}} in your {{deck}}", // needs translation
    "stone-joker": "Gives {{chips}} Chips for each {{card}} in your {{deck}}", // needs translation
    "stuntman": "{{chips}} Chips,{{handSize}} hand size", // needs translation
    "supernova": "Adds the number of times {{hand}} has been played this run to Mult", // needs translation
    "superposition": "Create a {{cardType}} card if poker hand contains an {{rank}} and a Straight {{room}}", // needs translation
    "swashbuckler": "Adds the sell value of all other owned {{cards}} to Mult", // needs translation
    "the-duo": "{{xmult}} Mult if played hand contains a Pair", // needs translation
    "the-family": "{{xmult}} Mult if played hand contains a Four of a Kind", // needs translation
    "the-idol": "Each played {{rank}} of {{suit}} gives {{xmult}} Mult when scoredCard changes every round", // needs translation
    "the-order": "{{xmult}} Mult if played hand contains a Straight", // needs translation
    "the-tribe": "{{xmult}} Mult if played hand contains a Flush", // needs translation
    "the-trio": "{{xmult}} Mult if played hand contains a Three of a Kind", // needs translation
    "throwback": "{{xmult}} Mult for each {{blind}} skipped this run", // needs translation
    "to-do-list": "Earn {{money}} if {{hand}} is a {{handType}}, poker hand changes at end of round", // needs translation
    "to-the-moon": "Earn an extra {{money}} of {{interest}} for every {{threshold}} you have at end of round", // needs translation
    "trading-card": "If {{phase}} of round has only {{count}} card, destroy it and earn {{money}}", // needs translation
    "troubadour": "{{handSize}} hand size, {{hands}} hand each round", // needs translation
    "turtle-bean": "{{handSize}} hand size, reduces by {{reduction}} each round", // needs translation
    "vagabond": "Create a {{cardType}} card if hand is played with {{money}} or less", // needs translation
    "vampire": "This Joker gains {{xmult}} Mult per scoring {{cardType}} played, removes card {{enhancement}}", // needs translation
    "walkie-talkie": "Each played {{rank1}} or {{rank2}} gives {{chips}} Chips and {{mult}} Mult when scored", // needs translation
    "wee-joker": "This Joker gains {{chips}} Chips when each played {{rank}} is scored", // needs translation
    "wily-joker": "{{chips}} Chips if played hand contains a Three of a Kind", // needs translation
    "wrathful-joker": "Played cards with Spade suit give {{mult}} Mult when scored", // needs translation
    "zany-joker": "{{mult}} Mult if played hand contains a Three of a Kind", // needs translation
  },
};
