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
};
