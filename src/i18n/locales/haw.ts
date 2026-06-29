import type { en } from "./en";

type LocaleMessages = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

export const haw: LocaleMessages = {
  app: {
    titleMenu: "Browslatro — Papa koho nui",
    titleRun: "Browslatro — E Pāʻani ",
  },
  sidebar: {
    runInfo: "ʻIkepili Puni Pāʻani",
    options: "Nā Koho",
    help: "I Kōkua?",
    hands: "Nā Haʻawina Pepa",
    discards: "Nā Kiola",
    money: "Kālā",
    ante: "Pili",
    round: "Puni",
    roundScore: "Ka Heluʻai o ka Puni",
    scoreAtLeast: "E loaʻa ma ka liʻiliʻi loa ka heluʻai: {{score}}",
    toEarn: "Ka Loaʻa o ka {{award}}",
    lockedTo: "Locked to:", // needs translation
    viewOnGithub: "View on GitHub", // needs translation
    githubAriaLabel: "View browslatro source code on GitHub (opens in new tab)", // needs translation
  },
  hands: {
    highCard: "Kāleka Kiʻekiʻe",
    pair: "Paʻa Kāleka",
    twoPair: "Kūpē",
    threeOfAKind: "Pūkolu Kāleka",
    straight: "Holo Paʻa Likelike",
    flush: "Palaki",
    fullHouse: "Hale Piha",
    fourOfAKind: "Kuahā Paʻa Likelike",
    straightFlush: "Palaki Pololei",
    royalFlush: "Palaki Poni",
    fiveOfAKind: "Kualima",
    flushHouse: "Hale Piha Palaki",
    flushFive: "Kualima Paʻa Likelike",
  },
  cardLabels: {
    enhancementBonus: "ʻAi Keu",
    enhancementMult: "Hoʻonui",
    enhancementWild: "Koho",
    enhancementGlass: "Aniani",
    enhancementSteel: "Kila",
    enhancementStone: "Pōhaku",
    enhancementGold: "Kula",
    enhancementLucky: "Laki",
    editionFoil: "Kini",
    editionHolographic: "Kiʻi Lamalama",
    editionPolychrome: "Kala kāuna",
    editionNegative: "Akakiʻi",
    luckyOdds: "1 ma {{n}}",
    extraChips: "+{{value}} hiu keu",
    valueInHand: "ma ka haʻawina",
    valueIfHeld: "ke ʻauʻa ʻia",
    luckyOddsMult: "1/{{n}} +{{amount}}",
    luckyOddsMoney: "1/{{n}} +${{amount}}",
    editionBadgeFoil: "Kini",
    editionBadgeHolographic: "Lamalama",
    editionBadgePolychrome: "Kāuna",
    editionBadgeNegative: "Aka",
    sealGold: "Sila Kula",
    sealRed: "Sila ʻUlaʻula",
    sealBlue: "Sila Uliuli",
    sealPurple: "Sila Poni",
  },
  scoringTrace: {
    title: "Scoring Trace", // needs translation
    open: "Moʻo Helu", // needs translation
    expand: "Expand", // needs translation
    close: "Pani", // needs translation
    handHeading: "Haʻawina {{number}}: {{hand}} (Lv {{level}})",
    handTotal: "{{chips}} Hiu × {{mult}} Hoʻonui = {{total}}",
  },
  cardPiles: {
    discardLabel: "Discard", // needs translation
    discardedTitle: "Discarded Cards", // needs translation
    remainingTitle: "Remaining Cards", // needs translation
    sell: "Sell", // needs translation
    bySuit: "By suit", // needs translation
    byRank: "By rank", // needs translation
    close: "Pani", // needs translation
  },
  newRun: {
    title: "Start New Run", // needs translation
    deck: "Deck", // needs translation
    stake: "Stake", // needs translation
    startingHands: "starting hands", // needs translation
    startingDiscards: "starting discards", // needs translation
    startRun: "Start Run →", // needs translation
  },
  handScore: {
    preview: "{{chips}} Hiu × {{mult}} Hoʻonui",
  },
  trays: {
    jokers: "Nā Pepa Kiʻi",
    consumables: "Nā Kemu",
  },
  options: {
    language: "ʻŌlelo",
    muteSounds: "Hoʻomū Leo",
    unmuteSounds: "Hoʻā Leo",
    enableHighVisibility: "Kūmaka akāka o nā paʻa likelike",
    disableHighVisibility: "Kūmaka maʻamau o nā paʻa likelike",
    enableDyslexicFont: "Use OpenDyslexic font", // needs translation
    disableDyslexicFont: "Use default font", // needs translation
    animationSpeed: "Wikiwiki o ka ʻOnina",
    speedSlow: "Pupū",
    speedNormal: "Maʻamau",
    speedFast: "Wikiwiki",
    speedInstant: "Emo ʻole",
    advisorKey: "Kō Aʻoaʻo API",
    advisorKeyReplace: "Pani",
    advisorKeyRemove: "Wehe",
    advisorKeyRemoveConfirm: "E wehe i ke kī API i mālama ʻia kēia papa kele?",
    newGame: "Puni Pāʻani hou",
    newGameConfirm: "E pāʻani hou? E pau ana kēia puni i nā pēlā.",
    close: "Pani",
  },
  blinds: {
    smallBlind: "Pili Hāpōpō",
    bigBlind: "Pili Moʻowini",
    bossBlind: "Pili Makapō",
    anteHeading: "Pili {{ante}}",
    scoreAtLeast: "Score at least", // needs translation
    payout: "Loaʻa",
    skipReward: "Kāpae makana",
    play: "Pāʻani aku i ka {{blind}} →",
    skip: "Kāpae",
    rerollBoss: "Lū hou i ka pili makapō no (${{cost}})",
  },
  roundEnd: {
    wonTitle: "Ua lanakila!",
    lostTitle: "Auē! Ua lilo ē, ua lilo aku nō!",
    roundScore: "Huina helu ʻai o kēia puni",
    requiredScore: "Koina helu ʻai",
    beatBy: "Beat by", // needs translation
    shortBy: "Short by", // needs translation
    moneyWon: "Kālā i loaʻa",
    baseReward: "Kumu hoʻohui makana",
    interest: "Uku paneʻe ($1 o ka ${{per}}, huinanui loa ${{cap}}) ma ka ${{wallet}}",
    goldCards: "Nā kāleka kula ({{count}} × ${{per}})",
    remainingHands: "Koena haʻawina ({{units}} × ${{per}})",
    remainingHandsAndDiscards: "Koena haʻawina + nā kiola ({{units}} × ${{per}})",
    total: "Huinanui",
    continue: "Hoʻomau →",
    tryAgain: "E hoʻāʻo hou →",
  },
  gameWon: {
    title: "Ua lanakila!",
    subtitle: "Ua eo ko {{ante}}'s pili makapō iā ʻoe a ua pau ka puni.",
    finalAnte: "Ka pili hope",
    finalMoney: "Ka huinanui kālā",
    handsPlayed: "Nā Haʻawina i pāʻani ʻia",
    blindsSkipped: "Nā pili i kāpae ʻia",
    endlessMode: "Pēʻano pau loa →",
    newRun: "E pāʻani i puni hou →",
  },
  runInfo: {
    title: "ʻIkepili o kēia puni",
    handsTab: "Nā haʻawina",
    vouchersTab: "Nā pila hōʻoiaʻiʻo",
    deckTab: "Pā Kāleka & Pili", // needs translation
    deckHeading: "Pā Kāleka", // needs translation
    stakeLadderHeading: "Nā Pili", // needs translation
    currentStakeMarker: "(kēia)", // needs translation
    handHeader: "Nā haʻawina",
    levelHeader: "Pae",
    chipsTimesMult: "Hiu × Hoʻonui",
    playedHeader: "Pāʻani ʻia",
    noVouchers: "ʻAʻohe palapala hōʻoiaʻiʻo i kūʻai ʻia a i kēia.",
    close: "Pani",
  },
  help: {
    title: "Pehea e pāʻani ai",
    textGuides: "Nā palapala aʻo",
    videoTutorials: "Nā wikiō aʻoaʻo",
    close: "Pani",
    wikiTutorial: "Balatro Wiki — He Palapala Aʻoaʻo",
    steamBeginnerGuide: "Steam — He Palapala Aʻoaʻo no nā ʻAkahi Akahi",
    gameranxTips: "Gameranx — Nā Aʻoaʻo a me nā Hana Maʻalea na nā ʻAkahi Akahi",
    videoCompleteBeginner: "He Palapala Aʻoaʻo Piha no ka Pāʻani Balatro",
    videoHowToPlay: "Pehea e Pāʻani ai iā Balatro: He Palapala a Wikiō, He Hōʻike Aʻo, a me nā Hana Maʻalea",
    videoTutorialBeginners: "Hōʻike Aʻo: Pehea e Pāʻani ai iā Balatro no nā ʻAkahi Akahi",
  },
  shop: {
    title: "Hale kūʻai",
    money: "Kālā: ${{amount}}",
    reroll: "Lū hou (${{cost}})",
    buy: "Kūʻai no (${{price}})",
    open: "Wehe (${{price}})",
    sold: "Ua kūʻai ʻia", // needs translation
    slotsFull: "Piha nā Hakahaka",
    free: "MANUAHI",
    nextRound: "Kekahi Puni →",
    voucherHeadingOne: "Nā Palapala Hōʻoiaʻiʻo",
    voucherHeadingOther: "Nā Palapala Hōʻoiaʻiʻo",
    noVoucherThisAnte: "ʻAʻohe palapala hōʻoiaʻiʻo no kēia pili.",
    boosterPacks: "Nā Pūʻulu Hoʻokāʻoi",
    finishPickingFirst: "E koho mua mai kēia pūʻulu ma mua o ka hoʻomau ʻana",
    alreadyPurchasedAnte: "Ua kūʻai ʻē ʻia kēia pili",
    alreadyPurchasedRound: "Ua kūʻai ʻē ʻia kēia puni",
    requiresVoucher: "Koi ʻia he {{voucher}}",
    notEnoughMoney: "ʻAʻole lawa ke kālā",
    notEnoughMoneyReroll: "ʻAʻole lawa ke kālā e lū hou ai",
    jokerSlotsFullMax: "Piha nā hakahaka no nā kiʻi pepa (max {{max}})",
    consumableSlotsFullMax: "Piha nā hakahaka no nā kemu (max {{max}})",
    kindJoker: "Kiʻi Pepa",
    kindPlanet: "Hōkūhele",
    kindTarot: "Kāleka ʻŌuli",
    kindSpectral: "ʻĀuina ʻŌnaeao",
    kindCard: "Kāleka",
    kindPack: "Pūʻulu",
    packOpenToPickOne: "E wehe ʻia e koho ai i 1 kāleka mai kēia mau {{options}} koho",
    packOpenToPickMany: "E wehe ʻia e koho ai i {{count}} mau kāleka mai kēia mau {{options}} koho",
    addsPlayingCard: "E hoʻokomo i kēia kāleka i kāu puʻu kāleka",
    addsPlayingCardWith: "Hoʻokomo ʻia kēia kāleka o kēia ʻano {{traits}} i kāu puʻu pepa",
  },
  pack: {
    pickOneToKeep: "E koho i 1 kāleka e mālama ai",
    pickManyToKeep: "E koho i {{total}} mau kāleka e mālama ai i nā kāleka he {{remaining}} e koe mai ana",
    previewSelectedOne: "1 kāleka nāmua i koho ʻia — e unuhi i kāleka ʻōuli e hoʻohana ai",
    previewSelectedMany: "He {{count}} kāleka nāmua i koho ʻia — e unuhi i kāleka ʻōuli e hoʻohana a",
    done: "Pau",
    skip: "Kāpae",
    pick: "Koho",
    sortLabel: "Hoʻokaʻina:",
    sortRank: "Kūlana",
    sortSuit: "Paʻa likelike",
    addToDeck: "Hoʻokomo i kāu puʻu pepa",
    noPicksRemaining: "ʻAʻohe kiʻina e koe ana",
    consumableSlotsFull: "Piha nā hakahaka no nā kemu",
    jokerSlotsFull: "Piha nā hakahaka no nā kiʻi pepa",
    jokerSlotsFullSellHint: "Piha nā wahi pākiki — kūʻai aku i kahi pākiki no ka hoʻokaʻawale ʻana.", // needs translation
    selectOneFirst: "E koho mua i 1 kāleka ma ka haʻawina nāmua",
    tooManySelectedMaxOne: "Nui hewa ka nui kāleka i koho ʻia (ʻo ka 1 ka nui loa)",
    selectRangeFirst: "E koho mua i 1–{{max}} ma ka haʻawina nāmua",
    tooManySelectedMax: "ʻAʻe ʻia ka nui kāleka e hiki ai ke koho: (palena nui loa {{max}})",
  },
  hand: {
    sortManual: "Hoʻokaʻina lima",
    manualOrderHint: "Hoʻokaʻina hou (e kaualakō i ke kāleka e hoʻonohonoho ai",
  },
  consumables: {
    foolWillCreate: "Will create {{name}} ({{kind}})", // needs translation
    foolCopyNone: "No card used yet — creates nothing", // needs translation
  },
  game: {
    submitHand: "Waiho haʻawina",
    bossVoidedMouth: "{{hand}} scored 0 — The Mouth locks you to {{locked}}", // needs translation
    bossVoidedEye: "{{hand}} scored 0 — The Eye blocks repeat hand types", // needs translation
    bossArmLowered: "The Arm lowered {{hand}} to level {{level}}", // needs translation
  },
  admin: {
    enabled: "Hoʻohana luna", // needs translation
    disabled: "Ua pau ka hoʻohana luna", // needs translation
  },
  devMenu: {
    humanPlayLog: "Palapala moʻolelo o ka nui pāʻani",
    recordedDecisions_one: "{{count}} hoʻoholo i kākau ʻia",
    recordedDecisions_other: "{{count}} hoʻoholo i kākau ʻia",
    exportLog: "Palapala moʻolelo kāpuka",
    kind_hand: "Nā haʻawina",
    kind_purchase: "Nā Kūʻai ʻana",
    kind_reroll: "Nā Lū hou ʻana",
    "kind_pack-pick": "Nā Pūʻulu i koho ʻia",
    "kind_consumable-use": "nā kemu",
    "kind_joker-sell": "nā kūʻai ʻana aku",
    "kind_blind-skip": "nā kāpae ʻana",
    clearLog: "CKāpae Moʻolelo",
  },
  advisor: {
    keyPlaceholder: "sk-ant-…", // needs translation
    autopilot: "Aʻoaʻo ʻĀkomi",
    suggestTitle: "Haʻawina i aʻoaʻo ʻia",
    recommendation: "Haʻawina i ʻaʻoaʻo ʻia",
    alternative: "Koho ʻē aʻe hoʻoholo ai",
    concept: "Manaʻo nui",
    playCandidate: "Pāʻani {{hand}} ({{cards}}) — {{score}} helu ʻai",
    discardCandidate: "Nā Kiola {{cards}}",
    buyCandidate: "Kūʻai iā {{name}} no ${{cost}}",
    sellCandidate: "Kūʻai aku iā {{name}} no ${{value}}", // needs translation
    useCandidate: "Use {{name}}", // needs translation
    useDuringBlind: "Use this during the blind — it needs card targets you can't pick in the shop.", // needs translation
    rerollCandidate: "E lū hou i ka hale kūʻai no ${{cost}}",
    leaveCandidate: "E haʻalele i ka hale kūʻai a waiho ka ma panakō",
    pickCandidate: "Koho {{name}}",
    skipCandidate: "Kāpae iā",
    suggestApply: "E hana ʻia nō",
    suggestDismiss: "Kāpae",
    suggestRetry: "Hana hou",
    suggestError: "ʻAʻole i hiki i ke kaʻi ke aʻoaʻo maikaʻi aku i nā keiki",
    coachLabel: "Coach · local · instant", // needs translation
    coachTip: "Coach tip", // needs translation
    coachComputing: "Coaching…", // needs translation
    coachHide: "Hide coach", // needs translation
    askAiButton: "Ask AI (rate-limited)", // needs translation
    askAiButtonByok: "Ask AI", // needs translation
    aiThinking: "Asking the AI…", // needs translation
    aiAgrees: "AI agrees ✓", // needs translation
    aiSuggestsInstead: "AI suggests {{move}} instead", // needs translation
    suggestShopButton: "E aʻoaʻo mai no ke kūʻai ʻana",
    suggestPackButton: "E aʻoaʻo mai no kēia pūʻolo",
    autopilotApprove: "ʻʻĀpono aʻe nei",
    autopilotStop: "Hoʻōki i ke kūkākūkā",
    autopilotAskAi: "Nīnau i ke kaʻi AI",
    feedbackBadPick: "Bad pick", // needs translation
    feedbackOpenLabel: "Flag this suggestion as a bad pick", // needs translation
    feedbackPrompt: "Which would you pick instead?", // needs translation
    feedbackSubmit: "Submit", // needs translation
    feedbackPlayInstead: "E pāʻani i kēia", // needs translation
    feedbackDoInstead: "E hana i kēia", // needs translation
    feedbackJustBad: "Just bad, skip", // needs translation
    feedbackCancel: "Cancel", // needs translation
    feedbackRecorded: "Thanks — your feedback was recorded.", // needs translation
    autopilotExplainError: "ʻAʻole hiki i ke kaʻi AI ke wehewehe i kēia kaʻakālai i kēia manawa.",
    autopilotPlayProposal: "Pāʻani {{hand}}",
    autopilotDiscardProposal: "Kiola i nā kāleka i koho ʻia",
    downloadingModel: "Ke hoʻoili iho nei i ke kaʻi AI",
    noSuggestionAvailable: "ʻAʻohe aʻoaʻo o ke kaʻi AI. ʻAʻohe kāleka e alo nei e hiki ai i ke kaʻi ke ʻike",
    advisorUnavailable: "Coach unavailable — the suggestion model failed to load. Try again later.", // needs translation
    thinking: "Ke noʻonoʻo nei ke kaʻi aʻoaʻo",
    keyLabel: "Kāu kī API Anthropic",
    keySave: "Mālama i ke kī",
    keyRejected: "Hōʻole ʻia kāu kī API. E tuko mai i kī i ʻāpono ʻia e mālama i kāu kaʻi aʻoaʻo.",
    limitReached: "Ua pau nā wehewehena manuahi. Hoʻolako ʻia kekahi wehewehena manuahi hou i {{minutes}} a ʻoi aku a emi mai paha minuke. E kākomo mai i kāu kī no ke kaʻi aʻoaʻo pau ʻole.",
    limitReachedNoEta: "Pau nā wehewehena manuahi no ka manawa. E kākomo mai i kāu kī no ke kaʻi aʻoaʻo pau ʻole.",
    keyStep1: "E haku i moʻokāki Anthropic ma console.anthropic.com",
    keyStep2: "E kākomo mai i ka ʻikepili kāki ma lalo o 'Nā Papahana a me ka ʻIkepili Kāki.'",
    keyStep3: "E haku i kī ma lalo o 'Nā Kī API' a tuko mai i ʻaneʻi.",
    keyLink: "E kiʻi i kī API.",
    keyStorageTitle: "Pehea e hoʻohana ʻia kāu kī",
    keyStorageLocal: "E mālama hoʻopāʻālua ʻole ʻia ma ka waihona kūloko o kēia papa mākaʻikaʻi.",
    keyStorageProxy: "Hoʻouna ʻia kēlā me kēia noi kaʻi aʻoaʻo i kā mākou kikowaena pūnaewele, a paneʻe ʻia akula i ko Anthropic. ʻAʻohe hoʻouna pololei iki ʻia o kāu noi mai kāu lolo uila i ko Anthropic.",
    keyStorageCaution: "Hiki i nā kānaka a pau e hoʻohana ana i kēia papa mākaʻikaʻi ke ʻike i kēia ʻikepili. Makemake ʻia he wahi kū kaʻawale me ka palena wikiwiki haʻahaʻa, e wehe ʻia aku mai nā mīkini e hoʻohana ākea ʻia nei, a e kīpaku i nā kuleana o ko Anthropic inā hoʻolaha laulā hewa ʻia.",
  },
  suits: {
    spades: "Peki",
    hearts: "Haka",
    diamonds: "Kaimana",
    clubs: "Kalapu",
  },
  a11y: {
    opensInNewTab: "Wehe ʻia ma ka lepe hou",
    faceDownCard: "Kāleka e alo ana i lalo",
    stoneCard: "Kāleka pōhaku",
    cardName: "{{rank}} o ka {{suit}}",
    cardNameEnhanced: "{{rank}} o ka {{suit}} ({{enhancement}})",
    cardNameEnhancedValue: "{{rank}} o ka {{suit}} ({{enhancement}}, {{value}})",
    enhancementValueChips: "{{value}} hiu",
    enhancementValueMult: "{{value}} hoʻonui",
    enhancementValueMoney: "{{value}}",
    enhancementValueHeldInHand: "{{value}} ʻoiai ma ka haʻawina",
    enhancementValueHeldAtEndOfRound: "{{value}} inā mau ma ka lima ma ka pau ʻana o ka puni pāʻani",
    enhancementValueLucky: "{{multOdds}} no +{{mult}} hoʻonui, {{moneyOdds}} no +${{money}}",
    cardWithDetail: "{{name}}, {{detail}}",
    cardDebuffed: "{{name}}, hoʻonāwaliwali ʻia",
    cardNewlyDrawn: "{{name}}, ʻakahi a unuhi ʻia",
    cardForced: "{{name}}, koho paʻa — ʻaʻole hiki ke wehe", // needs translation
    cardForcedAnnounce: "ʻO {{name}} kāu kāleka koho paʻa i kēia manawa.", // needs translation
    cardLockedAttempt: "ʻAʻole hiki ke wehe i ka kāleka koho paʻa.", // needs translation
    itemsForSale: "Kūʻai emi Ikamu",
    vouchersForAnte: "Nā palapala hōʻoiaʻiʻo no kēia pili",
    boosterPacksForSale: "Kūʻai emi Pūʻolo hoʻokāʻoi",
    packsForSale: "Kūʻai emi Pūʻolo",
    overrideVoucherDev: "E mauʻaʻe i ka palapala hōʻoiaʻiʻo (dev)",
    rerollShopOffers: "E lū hou i nā haʻawina hale kūʻai no ${{cost}}",
    buyOffer: "{{label}}: {{name}}",
    packOptions: "Nā koho pūʻolo",
    previewHand: "Ka haʻawina nāmua",
    sortPreviewHand: "Hoʻokaʻina i ka haʻawina nāmua",
    pickOption: "Koho iā {{name}}",
    pickOptionWith: "Koho iā {{name}} ({{stickers}})",
    tagsHeld: "Nā lepili paʻa",
    blindsForAnte: "Nā pili makapō no kēia pili",
    overrideBossDev: "E mauʻaʻe i ka pili makapō no kēia pili (dev)",
    skipBlind: "E kāpae i ka {{blind}} (ʻAʻohe makana, ʻaʻohe pilikia)",
    rerollBossNotEnough: "E lū hou i ka pili makapō no (${{cost}}) — ʻaʻole lawa ke kālā",
    startingResources: "Nā makepono i lako ʻē no kēia puni pāʻani",
    deckVariant: "He mana puʻu pepa",
    stakeDifficulty: "Ka paʻakikī o ka pili",
    activeStakeEffects: "Nā hua pili ʻā",
    jokerPickerPagination: "Kaʻina ʻaoʻao o nā Kiʻi Pepa",
    prevJokerPage: "< Kekahi ʻaoʻao Kiʻi Pepa aku",
    nextJokerPage: "Kekahi ʻaoʻao Kiʻi Pepa aku >",
    jokerStickers: "Nā pepili Kiʻi Pepa",
    stickerDebuffed: "{{name}} — hoʻonāwaliwali ʻia",
    stickerRoundsLeft: "{{name}} — {{remaining}} o ka {{total}} puni e koe ana",
    stickerInfo: "{{name}} — {{detail}}",
    grantedJokers: "Nā Kiʻi Pepa i hāʻawi ʻia",
    game: "Pāʻani",
    gameStatus: "Ke kūlana pāʻani",
    yourHand: "Kāu haʻawina",
    sortHand: "Hoʻokaʻina i ka haʻawina",
    manualOrder: "Ke kaʻina hana lima",
    moveLeft: "E hoʻoneʻe i ka {{item}} i ka hema",
    moveRight: "E hoʻoneʻe i ka {{item}} i ka ʻākau",
    movedTo: "Ua hoʻoneʻe ʻia ka {{item}} i ke kūlana {{position}} o ka {{total}}",
    atStart: "Aia ka {{item}} ma ke kūlana mua",
    atEnd: "Aia ka {{item}} ma ke kūlana hope",
    equippedJokers: "Nā Kiʻi Pepa i hoʻokomo ʻia",
    emptyJokerSlot: "Wahi Kiʻi Pepa hakahaka",
    faceDownJoker: "Joker huli i lalo, wahi {{position}} o {{total}}", // needs translation
    jokerDebuffed: "Hoʻonāwaliwali ʻia — ʻaʻole helu ʻia.",
    jokerDisabledByBoss: "Ua hoʻopau ʻia ʻo {{name}} i kēia lima.", // needs translation
    jokerEdition: "{{name}} mana: {{description}}.",
    sellHint: "Kake-kaomi a alakō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    sellJoker: "E kūʻai aku iā {{name}} (${{value}} ka waiwai)",
    soldJoker: "Ua kūʻai ʻia ka {{name}} no ${{value}}",
    consumableSlots: "Nā hakahaka kemu",
    emptyConsumableSlot: "Nā hakahaka kemu hakahaka",
    consumableTile: "E hoʻohana iā {{name}} ({{kind}}). Shift-kaomi a kauō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    deckPile: "Pūʻulu kāleka ({{total}} kāleka i koe)",
    discardPile: "Pūʻulu kiola ({{total}} kāleka)",
    remainingCardsSummary: "Hōʻuluʻulu o nā kāleka i koe",
    scoringTraceLog: "Moʻohelu ʻai",
    closeScoringTrace: "E pani i ka moʻohelu ʻai",
    expandScoringTrace: "E hoʻonui i ka moʻohelu ʻai",
    lockedTo: "Paʻa i ka haʻawina {{hand}}",
    runInfoSections: "Nā māhele ʻikepili",
    level: "Pae",
    handLevel: "{{hand}}, pae {{level}}",
    submitHand: "Hoʻoholo Haʻawina",
    submitHandWith: "Hoʻoholo Haʻawina: {{hand}}, {{chips}} hiu hoʻonui ʻia ma ka {{mult}} mea hoʻonui",
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
