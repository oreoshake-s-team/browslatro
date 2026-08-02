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
    ante: "Pili",
    discards: "Nā Kiola",
    githubAriaLabel: "E nānā i ke kumu pāʻālua browslatro ma Github (wehe ʻia ma kekahi lepe hou)",
    hands: "Nā Haʻawina Pepa",
    help: "I Kōkua?",
    lockedTo: "Hoʻopaʻa ʻia i ka:",
    money: "Kālā",
    options: "Nā Koho",
    round: "Puni",
    roundScore: "Ka Heluʻai o ka Puni",
    runInfo: "ʻIkepili Puni Pāʻani",
    scoreAtLeast: "E loaʻa ma ka liʻiliʻi loa ka heluʻai: {{score}}",
    toEarn: "Ka Loaʻa o ka {{award}}",
    viewOnGithub: "E nānā ma GitHub",
  },
  hands: {
    fiveOfAKind: "Kualima",
    flush: "Palaki",
    flushFive: "Kualima Paʻa Likelike",
    flushHouse: "Hale Piha Palaki",
    fourOfAKind: "Kuahā Paʻa Likelike",
    fullHouse: "Hale Piha",
    highCard: "Kāleka Kiʻekiʻe",
    pair: "Paʻa Kāleka",
    royalFlush: "Palaki Poni",
    straight: "Holo Paʻa Likelike",
    straightFlush: "Palaki Pololei",
    threeOfAKind: "Pūkolu Kāleka",
    twoPair: "Kūpē",
  },
  cardLabels: {
    baseChips: "Base chips:", // needs translation
    editionBadgeFoil: "Kini",
    editionBadgeHolographic: "Lamalama",
    editionBadgeNegative: "Aka",
    editionBadgePolychrome: "Kāuna",
    editionFoil: "Kini",
    editionHolographic: "Kiʻi Lamalama",
    editionNegative: "Akakiʻi",
    editionPolychrome: "Kala kāuna",
    enhancementBonus: "ʻAi Keu",
    enhancementGlass: "Aniani",
    enhancementGold: "Kula",
    enhancementLucky: "Laki",
    enhancementMult: "Hoʻonui",
    enhancementSteel: "Kila",
    enhancementStone: "Pōhaku",
    enhancementWild: "Koho",
    extraChips: "+{{value}} hiu keu",
    luckyOdds: "1 ma {{n}}",
    luckyOddsMoney: "1/{{n}} +${{amount}}",
    luckyOddsMult: "1/{{n}} +{{amount}}",
    sealBlue: "Sila Uliuli",
    sealGold: "Sila Kula",
    sealPurple: "Sila Poni",
    sealRed: "Sila ʻUlaʻula",
    valueIfHeld: "ke ʻauʻa ʻia",
    valueInHand: "ma ka haʻawina",
  },
  scoringTrace: {
    close: "Pani",
    expand: "Hoʻonui Nānaina",
    handHeading: "Haʻawina {{number}}: {{hand}} (Lv {{level}})",
    handTotal: "{{chips}} Hiu × {{mult}} Hoʻonui = {{total}}",
    open: "Wehe Moʻo Helu",
    title: "Moʻohelu",
  },
  cardPiles: {
    byRank: "Ma ke kūlana",
    bySuit: "Ma ka paʻa likelike",
    close: "Pani",
    discardedTitle: "Nā kāleka i kiola ʻia",
    discardLabel: "Kiola",
    remainingTitle: "Nā kāleka e koe nei",
    sell: "Kūʻai aku",
  },
  newRun: {
    deck: "Puʻu Pepa",
    stake: "Pili",
    startingDiscards: "nā kiola hoʻomaka",
    startingHands: "nā haʻawina hoʻomaka",
    startRun: "Hoʻomaka →",
    title: "Hoʻomaka i puni hou",
  },
  handScore: {
    preview: "{{chips}} Hiu × {{mult}} Hoʻonui",
  },
  trays: {
    consumables: "Nā Kemu",
    jokers: "Nā Pepa Kiʻi",
  },
  options: {
    advisorKey: "Kō Aʻoaʻo API",
    advisorKeyRemove: "Wehe",
    advisorKeyRemoveConfirm: "E wehe i ke kī API i mālama ʻia kēia papa kele?",
    advisorKeyReplace: "Pani",
    animationSpeed: "Wikiwiki o ka ʻOnina",
    close: "Pani",
    disableDyslexicFont: "Hoʻohana i ke kinonahua paʻamau",
    disableHighVisibility: "Kūmaka maʻamau o nā paʻa likelike",
    enableDyslexicFont: "Hoʻohana i ke kinonahua OpenDyslexic",
    enableHighVisibility: "Kūmaka akāka o nā paʻa likelike",
    language: "ʻŌlelo",
    muteSounds: "Hoʻomū Leo",
    newGame: "Puni Pāʻani hou",
    newGameConfirm: "E pāʻani hou? E pau ana kēia puni i nā pēlā.",
    speedFast: "Wikiwiki",
    speedInstant: "Emo ʻole",
    speedNormal: "Maʻamau",
    speedSlow: "Pupū",
    unmuteSounds: "Hoʻā Leo",
  },
  blinds: {
    anteHeading: "Pili {{ante}}",
    bigBlind: "Pili Moʻowini",
    bossBlind: "Pili Makapō",
    payout: "Loaʻa",
    play: "Pāʻani aku i ka {{blind}} →",
    rerollBoss: "Lū hou i ka pili makapō no (${{cost}})",
    scoreAtLeast: "E loaʻa ma ka liʻiliʻi ka huina helu ʻai",
    skip: "Kāpae",
    skipReward: "Kāpae makana",
    smallBlind: "Pili Hāpōpō",
  },
  roundEnd: {
    baseReward: "Kumu hoʻohui makana",
    beatBy: "Ua lilo aku ma ka",
    continue: "Hoʻomau →",
    goldCards: "Nā kāleka kula ({{count}} × ${{per}})",
    interest: "Uku paneʻe ($1 o ka ${{per}}, huinanui loa ${{cap}}) ma ka ${{wallet}}",
    lostTitle: "Auē! Ua lilo ē, ua lilo aku nō!",
    moneyWon: "Kālā i loaʻa",
    mrBonesConsumed: "Mr. Bones self-destructed to keep the run alive — no reward for this Blind.", // needs translation
    remainingHands: "Koena haʻawina ({{units}} × ${{per}})",
    remainingHandsAndDiscards: "Koena haʻawina + nā kiola ({{units}} × ${{per}})",
    requiredScore: "Koina helu ʻai",
    roundScore: "Huina helu ʻai o kēia puni",
    savedTitle: "Saved by Mr. Bones!", // needs translation
    shortBy: "Ua pōkole mai ma ka",
    total: "Huinanui",
    tryAgain: "E hoʻāʻo hou →",
    wonTitle: "Ua lanakila!",
  },
  gameWon: {
    blindsSkipped: "Nā pili i kāpae ʻia",
    endlessMode: "Pēʻano pau loa →",
    finalAnte: "Ka pili hope",
    finalMoney: "Ka huinanui kālā",
    handsPlayed: "Nā Haʻawina i pāʻani ʻia",
    newRun: "E pāʻani i puni hou →",
    subtitle: "Ua eo ko {{ante}}'s pili makapō iā ʻoe a ua pau ka puni.",
    title: "Ua lanakila!",
  },
  runInfo: {
    chipsTimesMult: "Hiu × Hoʻonui",
    close: "Pani",
    currentStakeMarker: "(kēia)",
    deckHeading: "Pā Kāleka",
    deckTab: "Pā Kāleka & Pili",
    handHeader: "Nā haʻawina",
    handsTab: "Nā haʻawina",
    levelHeader: "Pae",
    noVouchers: "ʻAʻohe palapala hōʻoiaʻiʻo i kūʻai ʻia a i kēia.",
    playedHeader: "Pāʻani ʻia",
    stakeLadderHeading: "Nā Pili",
    title: "ʻIkepili o kēia puni",
    vouchersTab: "Nā pila hōʻoiaʻiʻo",
  },
  help: {
    close: "Pani",
    gameranxTips: "Gameranx — Nā Aʻoaʻo a me nā Hana Maʻalea na nā ʻAkahi Akahi",
    steamBeginnerGuide: "Steam — He Palapala Aʻoaʻo no nā ʻAkahi Akahi",
    textGuides: "Nā palapala aʻo",
    title: "Pehea e pāʻani ai",
    videoCompleteBeginner: "He Palapala Aʻoaʻo Piha no ka Pāʻani Balatro",
    videoHowToPlay: "Pehea e Pāʻani ai iā Balatro: He Palapala a Wikiō, He Hōʻike Aʻo, a me nā Hana Maʻalea",
    videoTutorialBeginners: "Hōʻike Aʻo: Pehea e Pāʻani ai iā Balatro no nā ʻAkahi Akahi",
    videoTutorials: "Nā wikiō aʻoaʻo",
    wikiTutorial: "Balatro Wiki — He Palapala Aʻoaʻo",
  },
  shop: {
    addsPlayingCard: "E hoʻokomo i kēia kāleka i kāu puʻu kāleka",
    addsPlayingCardWith: "Hoʻokomo ʻia kēia kāleka o kēia ʻano {{traits}} i kāu puʻu pepa",
    alreadyPurchasedAnte: "Ua kūʻai ʻē ʻia kēia pili",
    alreadyPurchasedRound: "Ua kūʻai ʻē ʻia kēia puni",
    boosterPacks: "Nā Pūʻulu Hoʻokāʻoi",
    buy: "Kūʻai no (${{price}})",
    consumableSlotsFullMax: "Piha nā hakahaka no nā kemu (max {{max}})",
    finishPickingFirst: "E koho mua mai kēia pūʻulu ma mua o ka hoʻomau ʻana",
    free: "MANUAHI",
    jokerSlotsFullMax: "Piha nā hakahaka no nā kiʻi pepa (max {{max}})",
    kindCard: "Kāleka",
    kindJoker: "Kiʻi Pepa",
    kindPack: "Pūʻulu",
    kindPlanet: "Hōkūhele",
    kindSpectral: "ʻĀuina ʻŌnaeao",
    kindTarot: "Kāleka ʻŌuli",
    money: "Kālā: ${{amount}}",
    nextRound: "Kekahi Puni →",
    notEnoughMoney: "ʻAʻole lawa ke kālā",
    notEnoughMoneyReroll: "ʻAʻole lawa ke kālā e lū hou ai",
    noVoucherThisAnte: "ʻAʻohe palapala hōʻoiaʻiʻo no kēia pili.",
    open: "Wehe (${{price}})",
    packOpenToPickMany: "E wehe ʻia e koho ai i {{count}} mau kāleka mai kēia mau {{options}} koho",
    packOpenToPickOne: "E wehe ʻia e koho ai i 1 kāleka mai kēia mau {{options}} koho",
    requiresVoucher: "Koi ʻia he {{voucher}}",
    reroll: "Lū hou (${{cost}})",
    slotsFull: "Piha nā Hakahaka",
    sold: "Ua kūʻai ʻia",
    title: "Hale kūʻai",
    voucherHeadingOne: "Nā Palapala Hōʻoiaʻiʻo",
    voucherHeadingOther: "Nā Palapala Hōʻoiaʻiʻo",
  },
  pack: {
    addToDeck: "Hoʻokomo i kāu puʻu pepa",
    consumableSlotsFull: "Piha nā hakahaka no nā kemu",
    done: "Pau",
    jokerSlotsFull: "Piha nā hakahaka no nā kiʻi pepa",
    jokerSlotsFullSellHint: "Piha nā wahi pākiki — kūʻai aku i kahi pākiki no ka hoʻokaʻawale ʻana.",
    noPicksRemaining: "ʻAʻohe kiʻina e koe ana",
    pick: "Koho",
    pickManyToKeep: "E koho i {{total}} mau kāleka e mālama ai i nā kāleka he {{remaining}} e koe mai ana",
    pickOneToKeep: "E koho i 1 kāleka e mālama ai",
    previewSelectedMany: "He {{count}} kāleka nāmua i koho ʻia — e unuhi i kāleka ʻōuli e hoʻohana a",
    previewSelectedOne: "1 kāleka nāmua i koho ʻia — e unuhi i kāleka ʻōuli e hoʻohana ai",
    selectOneFirst: "E koho mua i 1 kāleka ma ka haʻawina nāmua",
    selectRangeFirst: "E koho mua i 1–{{max}} ma ka haʻawina nāmua",
    skip: "Kāpae",
    sortLabel: "Hoʻokaʻina:",
    sortRank: "Kūlana",
    sortSuit: "Paʻa likelike",
    tooManySelectedMax: "ʻAʻe ʻia ka nui kāleka e hiki ai ke koho: (palena nui loa {{max}})",
    tooManySelectedMaxOne: "Nui hewa ka nui kāleka i koho ʻia (ʻo ka 1 ka nui loa)",
  },
  hand: {
    manualOrderHint: "Hoʻokaʻina hou (e kaualakō i ke kāleka e hoʻonohonoho ai",
    sortManual: "Hoʻokaʻina lima",
  },
  consumables: {
    foolCopyNone: "ʻAʻohe kāleka i hoʻohana ʻia – ʻaʻohe mea i haku ʻia",
    foolWillCreate: "E haku ʻia ʻo {{name}} ({{kind}})",
  },
  game: {
    bossArmLowered: "Hoʻohaʻahaʻa ʻia ka {{hand}} e ka Lima i ka pae {{level}}",
    bossVoidedEye: "{{hand}} he 0 ʻai — Pale ka Maka i nā ʻano haʻawina pīnaʻi",
    bossVoidedMouth: "{{hand}} he 0 ʻai — Hoʻopaʻa ka Waha iā ʻoe i ka {{locked}}",
    discard: "Discard", // needs translation
    submitHand: "Waiho haʻawina",
  },
  admin: {
    disabled: "Ua pau ka hoʻohana luna",
    enabled: "Hoʻohana luna",
  },
  devMenu: {
    clearLog: "CKāpae Moʻolelo",
    exportLog: "Palapala moʻolelo kāpuka",
    humanPlayLog: "Palapala moʻolelo o ka nui pāʻani",
    "kind_blind-skip": "nā kāpae ʻana",
    "kind_consumable-use": "nā kemu",
    kind_hand: "Nā haʻawina",
    "kind_joker-sell": "nā kūʻai ʻana aku",
    "kind_pack-pick": "Nā Pūʻulu i koho ʻia",
    kind_purchase: "Nā Kūʻai ʻana",
    kind_reroll: "Nā Lū hou ʻana",
    recordedDecisions_one: "{{count}} hoʻoholo i kākau ʻia",
    recordedDecisions_other: "{{count}} hoʻoholo i kākau ʻia",
  },
  advisor: {
    advisorUnavailable: "ʻAʻohe kaʻi – ua pīholo ka ʻōnaehana aʻoaʻo. E hoʻā'o hou.",
    aiAgrees: "Kākoʻo ka AI ✓",
    aiSuggestsInstead: "Aʻoaʻo maila hoʻi ka AI i kēia {{move}}",
    aiThinking: "Ke nīnau nei i ka AI…",
    alternative: "Koho ʻē aʻe hoʻoholo ai",
    askAiButton: "Nīnau i ka AI (kaupalena ʻia ma nā ʻai nīnau)",
    askAiButtonByok: "Nīnau i ka AI",
    autopilot: "Aʻoaʻo ʻĀkomi",
    autopilotApprove: "ʻʻĀpono aʻe nei",
    autopilotAskAi: "Nīnau i ke kaʻi AI",
    autopilotDiscardProposal: "Kiola i nā kāleka i koho ʻia",
    autopilotExplainError: "ʻAʻole hiki i ke kaʻi AI ke wehewehe i kēia kaʻakālai i kēia manawa.",
    autopilotPlayProposal: "Pāʻani {{hand}}",
    autopilotStop: "Hoʻōki i ke kūkākūkā",
    buyCandidate: "Kūʻai iā {{name}} no ${{cost}}",
    coachComputing: "Ke kaʻi nei…",
    coachHide: "Hoʻohuna i ke kaʻi ",
    coachLabel: "Kaʻi · Kupa · Hikiwawe",
    coachTip: "Aʻoaʻo o ke Kaʻi",
    coachUnavailable: "The coach is unavailable — the local model failed to load.", // needs translation
    concept: "Manaʻo nui",
    discardCandidate: "Nā Kiola {{cards}}",
    downloadingModel: "Ke hoʻoili iho nei i ke kaʻi AI",
    feedbackAgreeLabel: "ʻAe mai i ke aʻoaʻo a hoʻohana",
    feedbackBadPick: "He koho maikaʻi ʻole",
    feedbackCancel: "Kāpae", // kāpae has multiple meanings: in this case, it is cancel. On line 331, it is skip.
    feedbackChoiceLabel: "E hāpai manaʻo no kēia aʻoaʻo",
    feedbackDoInstead: "E hana i kēia",
    feedbackGoodPick: "He koho maikaʻi",
    feedbackJustBad: "Maikaʻi ʻole nō! E kāpae!",
    feedbackOpenLabel: "E māka i kēia aʻoaʻo he koho maikaʻi ʻole",
    feedbackPlayInstead: "E pāʻani i kēia",
    feedbackPrompt: "He aha kāu e koho ai i pani?",
    feedbackRecorded: "Mahalo nui. Mālama ʻia kō manaʻo",
    feedbackSubmit: "Hoʻoholo",
    keyLabel: "Kāu kī API Anthropic",
    keyLink: "E kiʻi i kī API.",
    keyPlaceholder: "sk-ant-…", // needs translation
    keyRejected: "Hōʻole ʻia kāu kī API. E tuko mai i kī i ʻāpono ʻia e mālama i kāu kaʻi aʻoaʻo.",
    keySave: "Mālama i ke kī",
    keyStep1: "E haku i moʻokāki Anthropic ma console.anthropic.com",
    keyStep2: "E kākomo mai i ka ʻikepili kāki ma lalo o 'Nā Papahana a me ka ʻIkepili Kāki.'",
    keyStep3: "E haku i kī ma lalo o 'Nā Kī API' a tuko mai i ʻaneʻi.",
    keyStorageCaution: "Hiki i nā kānaka a pau e hoʻohana ana i kēia papa mākaʻikaʻi ke ʻike i kēia ʻikepili. Makemake ʻia he wahi kū kaʻawale me ka palena wikiwiki haʻahaʻa, e wehe ʻia aku mai nā mīkini e hoʻohana ākea ʻia nei, a e kīpaku i nā kuleana o ko Anthropic inā hoʻolaha laulā hewa ʻia.",
    keyStorageLocal: "E mālama hoʻopāʻālua ʻole ʻia ma ka waihona kūloko o kēia papa mākaʻikaʻi.",
    keyStorageProxy: "Hoʻouna ʻia kēlā me kēia noi kaʻi aʻoaʻo i kā mākou kikowaena pūnaewele, a paneʻe ʻia akula i ko Anthropic. ʻAʻohe hoʻouna pololei iki ʻia o kāu noi mai kāu lolo uila i ko Anthropic.",
    keyStorageTitle: "Pehea e hoʻohana ʻia kāu kī",
    leaveCandidate: "E haʻalele i ka hale kūʻai a waiho ka ma panakō",
    limitReached: "Ua pau nā wehewehena manuahi. Hoʻolako ʻia kekahi wehewehena manuahi hou i {{minutes}} a ʻoi aku a emi mai paha minuke. E kākomo mai i kāu kī no ke kaʻi aʻoaʻo pau ʻole.",
    limitReachedNoEta: "Pau nā wehewehena manuahi no ka manawa. E kākomo mai i kāu kī no ke kaʻi aʻoaʻo pau ʻole.",
    noSuggestionAvailable: "ʻAʻohe aʻoaʻo o ke kaʻi AI. ʻAʻohe kāleka e alo nei e hiki ai i ke kaʻi ke ʻike",
    pickCandidate: "Koho {{name}}",
    playCandidate: "Pāʻani {{hand}} ({{cards}}) — {{score}} helu ʻai",
    recommendation: "Haʻawina i ʻaʻoaʻo ʻia",
    rerollCandidate: "E lū hou i ka hale kūʻai no ${{cost}}",
    sellCandidate: "Kūʻai aku iā {{name}} no ${{value}}",
    skipCandidate: "Kāpae iā",
    suggestApply: "E hana ʻia nō",
    suggestDismiss: "Kāpae",
    suggestError: "ʻAʻole i hiki i ke kaʻi ke aʻoaʻo maikaʻi aku i nā keiki",
    suggestPackButton: "E aʻoaʻo mai no kēia pūʻolo",
    suggestRetry: "Hana hou",
    suggestShopButton: "E aʻoaʻo mai no ke kūʻai ʻana",
    suggestTitle: "Haʻawina i aʻoaʻo ʻia",
    thinking: "Ke noʻonoʻo nei ke kaʻi aʻoaʻo",
    useCandidate: "Hoʻohana iā {{name}}",
    useDuringBlind: "Hoʻohana i kēia i ka pili ʻana – pono nā māka i hiki ʻole ke loaʻa ma ka hale kūʻai",
  },
  suits: {
    clubs: "Kalapu",
    diamonds: "Kaimana",
    hearts: "Haka",
    spades: "Peki",
  },
  a11y: {
    activeStakeEffects: "Nā hua pili ʻā",
    atEnd: "Aia ka {{item}} ma ke kūlana hope",
    atStart: "Aia ka {{item}} ma ke kūlana mua",
    blindsForAnte: "Nā pili makapō no kēia pili",
    boosterPacksForSale: "Kūʻai emi Pūʻolo hoʻokāʻoi",
    buyOffer: "{{label}}: {{name}}",
    cardDebuffed: "{{name}}, hoʻonāwaliwali ʻia",
    cardForced: "{{name}}, koho paʻa — ʻaʻole hiki ke wehe",
    cardForcedAnnounce: "ʻO {{name}} kāu kāleka koho paʻa i kēia manawa.",
    cardLockedAttempt: "ʻAʻole hiki ke wehe i ka kāleka koho paʻa.",
    cardName: "{{rank}} o ka {{suit}}",
    cardNameEnhanced: "{{rank}} o ka {{suit}} ({{enhancement}})",
    cardNameEnhancedValue: "{{rank}} o ka {{suit}} ({{enhancement}}, {{value}})",
    cardNewlyDrawn: "{{name}}, ʻakahi a unuhi ʻia",
    cardWithDetail: "{{name}}, {{detail}}",
    closeScoringTrace: "E pani i ka moʻohelu ʻai",
    consumableSlots: "Nā hakahaka kemu",
    consumableTile: "E hoʻohana iā {{name}} ({{kind}}). Shift-kaomi a kauō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    deckPile: "Pūʻulu kāleka ({{total}} kāleka i koe)",
    deckVariant: "He mana puʻu pepa",
    discardPile: "Pūʻulu kiola ({{total}} kāleka)",
    emptyConsumableSlot: "Nā hakahaka kemu hakahaka",
    emptyJokerSlot: "Wahi Kiʻi Pepa hakahaka",
    enhancementValueChips: "{{value}} hiu",
    enhancementValueHeldAtEndOfRound: "{{value}} inā mau ma ka lima ma ka pau ʻana o ka puni pāʻani",
    enhancementValueHeldInHand: "{{value}} ʻoiai ma ka haʻawina",
    enhancementValueLucky: "{{multOdds}} no +{{mult}} hoʻonui, {{moneyOdds}} no +${{money}}",
    enhancementValueMoney: "{{value}}",
    enhancementValueMult: "{{value}} hoʻonui",
    equippedJokers: "Nā Kiʻi Pepa i hoʻokomo ʻia",
    expandScoringTrace: "E hoʻonui i ka moʻohelu ʻai",
    faceDownCard: "Kāleka e alo ana i lalo",
    faceDownJoker: "Ke Kiʻi Pepa i huli i lalo, wahi {{position}} o {{total}}",
    game: "Pāʻani",
    gameStatus: "Ke kūlana pāʻani",
    grantedJokers: "Nā Kiʻi Pepa i hāʻawi ʻia",
    handLevel: "{{hand}}, pae {{level}}",
    itemsForSale: "Kūʻai emi Ikamu",
    jokerDebuffed: "Hoʻonāwaliwali ʻia — ʻaʻole helu ʻia.",
    jokerDisabledByBoss: "Ua hoʻopau ʻia ʻo {{name}} i kēia lima.",
    jokerEdition: "{{name}} mana: {{description}}.",
    jokerPickerPagination: "Kaʻina ʻaoʻao o nā Kiʻi Pepa",
    jokerStickers: "Nā pepili Kiʻi Pepa",
    level: "Pae",
    lockedTo: "Paʻa i ka haʻawina {{hand}}",
    manualOrder: "Ke kaʻina hana lima",
    movedTo: "Ua hoʻoneʻe ʻia ka {{item}} i ke kūlana {{position}} o ka {{total}}",
    moveLeft: "E hoʻoneʻe i ka {{item}} i ka hema",
    moveRight: "E hoʻoneʻe i ka {{item}} i ka ʻākau",
    nextJokerPage: "Kekahi ʻaoʻao Kiʻi Pepa aku >",
    opensInNewTab: "Wehe ʻia ma ka lepe hou",
    overrideBossDev: "E mauʻaʻe i ka pili makapō no kēia pili (dev)",
    overrideVoucherDev: "E mauʻaʻe i ka palapala hōʻoiaʻiʻo (dev)",
    packOptions: "Nā koho pūʻolo",
    packsForSale: "Kūʻai emi Pūʻolo",
    pickOption: "Koho iā {{name}}",
    pickOptionWith: "Koho iā {{name}} ({{stickers}})",
    previewHand: "Ka haʻawina nāmua",
    prevJokerPage: "< Kekahi ʻaoʻao Kiʻi Pepa aku",
    remainingCardsSummary: "Hōʻuluʻulu o nā kāleka i koe",
    rerollBossNotEnough: "E lū hou i ka pili makapō no (${{cost}}) — ʻaʻole lawa ke kālā",
    rerollShopOffers: "E lū hou i nā haʻawina hale kūʻai no ${{cost}}",
    runInfoSections: "Nā māhele ʻikepili",
    savedByMrBones: "Saved by Mr. Bones — the joker self-destructed.", // needs translation
    scoringTraceLog: "Moʻohelu ʻai",
    sellHint: "Kake-kaomi a alakō paha i ka pūʻulu e kūʻai aku no ${{value}}.",
    sellJoker: "E kūʻai aku iā {{name}} (${{value}} ka waiwai)",
    skipBlind: "E kāpae i ka {{blind}} (ʻAʻohe makana, ʻaʻohe pilikia)",
    soldJoker: "Ua kūʻai ʻia ka {{name}} no ${{value}}",
    sortHand: "Hoʻokaʻina i ka haʻawina",
    sortPreviewHand: "Hoʻokaʻina i ka haʻawina nāmua",
    stakeDifficulty: "Ka paʻakikī o ka pili",
    startingResources: "Nā makepono i lako ʻē no kēia puni pāʻani",
    stickerDebuffed: "{{name}} — hoʻonāwaliwali ʻia",
    stickerInfo: "{{name}} — {{detail}}",
    stickerRoundsLeft: "{{name}} — {{remaining}} o ka {{total}} puni e koe ana",
    stoneCard: "Kāleka pōhaku",
    submitHand: "Hoʻoholo Haʻawina",
    submitHandWith: "Hoʻoholo Haʻawina: {{hand}}, {{chips}} hiu hoʻonui ʻia ma ka {{mult}} mea hoʻonui",
    tagsHeld: "Nā lepili paʻa",
    vouchersForAnte: "Nā palapala hōʻoiaʻiʻo no kēia pili",
    yourHand: "Kāu haʻawina",
  },
  jokerNames: {
    "8-ball": "Pōpō Walu",
    "abstract-joker": "Iōka ʻĒ", // I am creating a word for "Joker" in this context; it is simply a loanword transliteration of the work Joker into the Hawaiian langauge."
    "acrobat": "Kaʻalehia",
    "ancient-joker": "Iōka Kahiko",
    "arrowhead": "Nahau",
    "astronomer": "Kilo Hōkū",
    "banner": "Kīlepalepa",
    "baron": "Pālona",
    "baseball-card": "Kāleka Pōhili",
    "blackboard": "Papa ʻEleʻele",
    "bloodstone": "Pōhaku Koko",
    "blue-joker": "Iōka Uliuli",
    "blueprint": "Kiʻi Kūkulu",
    "bootstraps": "Kāʻawe Puki",
    "brainstorm": "Puaʻi Manaʻo",
    "bull": "Pipi Laho",
    "burglar": "Kaʻaihue",
    "burnt-joker": "Iōka Pāpaʻa",
    "business-card": "Kāleka Pāʻoihana",
    "campfire": "Keahi Hoʻomoana",
    "card-sharp": "Kāleka ʻOiʻoi",
    "cartomancer": "Kilokilo Kāleka",
    "castle": "Kākela",
    "cavendish": "Maiʻa",
    "ceremonial-dagger": "Pāhoa Kapu",
    "certificate": "Palapala Hōʻoia",
    "chaos-the-clown": "Neoneo, ke Kalaona",
    "clever-joker": "Iōka Maʻalea",
    "cloud-9": "Ao 9",
    "constellation": "Huihui Hōkū",
    "crafty-joker": "Iōka Noʻeau",
    "crazy-joker": "Iōka Pupule",
    "credit-card": "Kāleka Kāki ʻEa",
    "delayed-gratification": "Leʻa Hoʻokolohe",
    "devious-joker": "Iōka Kolohe",
    "diet-cola": "Kola Kōpaʻa ʻOle",
    "dna": "DNA", // needs translation
    "drivers-license": "Laikini Kalaiwa",
    "droll-joker": "Iōka Hoʻomākeʻaka",
    "drunkard": "Kanaka ʻOna Mau",
    "dusk": "Pōʻeleʻele",
    "egg": "Hua Moa",
    "erosion": "ʻAʻai",
    "even-steven": "Kepano Pānaʻi",
    "faceless-joker": "Iōka Maka ʻOle",
    "fibonacci": "Fibonacci", // needs translation
    "flash-card": "Kāleka ʻOaka",
    "flower-pot": "Ipu Pua",
    "fortune-teller": "Kāula",
    "four-fingers": "Manamanalima ʻEhā",
    "gift-card": "Kāleka Makana",
    "glass-joker": "Iōka Aniani",
    "gluttonous-joker": "Iōka Puni ʻAi",
    "golden-joker": "Iōka Gula",
    "golden-ticket": "Kikiki Gula",
    "greedy-joker": "Iōka ʻĀlunu",
    "green-joker": "Iōka Maʻo",
    "gros-michel": "Mīkela Nui",
    "hack": "ʻAlapahi", // ʻAlapahi means "flasehood, deceit."
    "half-joker": "Iōka Hapalua",
    "hallucination": "Akakū",
    "hanging-chad": "Kada Lewalewa",
    "hiker": "Iōka Hekehi",
    "hit-the-road": "Kalaiwa Pākī",
    "hologram": "Kiʻi Lamalama",
    "ice-cream": "ʻAikalima",
    "joker-stencil": "Iōka Hoʻomeheu",
    "jolly-joker": "Iōka ʻOliʻoli",
    "juggler": "Kīolaola",
    "loyalty-card": "Kāleka Kūpaʻa",
    "luchador": "Mea Mokomoko",
    "lucky-cat": "Pōpoki Laki",
    "lusty-joker": "Iōka Piha Kuko",
    "mad-joker": "Iōka Huhū",
    "madness": "Hehena",
    "mail-in-rebate": "Uku Pānaʻi Leka",
    "marble-joker": "Iōka Māpala",
    "matador": "Mokomoko Pipi",
    "merry-andy": "Āniki Leʻaleʻa",
    "midas-mask": "Makakiʻi Mikasa",
    "mime": "Hoʻomeamea",
    "misprint": "Palapala Hemahema",
    "mr-bones": "Mika Iwi",
    "mystic-summit": "Nuʻu Kalakupua",
    "obelisk": "Oeoe Pūʻoʻa",
    "odd-todd": "Toda ʻEʻepa",
    "onyx-agate": "ʻOnika ʻUla",
    "oops-all-6s": "Auē! He mau 6 wale nō",
    "pareidolia": "'Ikena Lauana",
    "photograph": "Kiʻi",
    "plus-four-mult": "Iōka",
    "popcorn": "Kūlina Pohāpohā",
    "raised-fist": "Puʻulima Pai",
    "ramen": "Nulu",
    "red-card": "Kāleka ʻUlaʻula",
    "reserved-parking": "Wahi Hoʻokū kaʻa kūikawā",
    "ride-the-bus": "Kau Kaʻa ʻŌhua",
    "riff-raff": "ʻŌpala",
    "rocket": "Ahikao",
    "rough-gem": "Pōhaku Makamae ʻŌkalakala",
    "runner": "Kūkini",
    "satellite": "Ukali",
    "scary-face": "Maka Weliweli",
    "scholar": "Akeakamai",
    "seance": "ʻAha Hoʻomana",
    "seeing-double": "ʻIke Lualua",
    "seltzer": "Wai Koloaka",
    "shoot-the-moon": "Kī i ka Mahina",
    "shortcut": "ʻOki Pōkole",
    "showman": "Mea Hōʻikeʻike",
    "sixth-sense": "ʻIke Pāpālua",
    "sly-joker": "Iōka Akamai",
    "smeared": "Iōka Hāpala",
    "smiley-face": "Maka Minoʻaka",
    "sock-and-buskin": " Laupaʻapāʻani a Luʻuluʻu",
    "space-joker": "Iōka Lewa",
    "spare-trousers": "Lole Wāwae Keu",
    "splash": "Pakī",
    "square-joker": "Iōka Kuea",
    "steel-joker": "Iōka Kila",
    "stone-joker": "Iōka Pōhaku",
    "stuntman": "Kanaka Pāhaʻoweli",
    "supernova": "Hōkū Pūnohunohu Pahū",
    "superposition": "Ola Lolelua", // superposition: refering to a physics concept that something can exist in multiple states until observed. "Ola Lolelua" means "double living" and fits this concept.
    "swashbuckler": "Kuewa ʻAʻa", // Kuewa means vagabond, wanderer; adding ʻaʻa, ad a sense of daringness to it.
    "the-duo": "Paʻa Kanaka",
    "the-family": "Ka ʻOhana",
    "the-idol": "Ke Kiʻi",
    "the-order": "Ka Papa",
    "the-tribe": "Ka ʻAlaea",
    "the-trio": "Ka Pūkolu",
    "throwback": "Hoʻihoʻi",
    "to-do-list": "Papa ʻĀpana Hana",
    "to-the-moon": "I ka Mahina",
    "trading-card": "Kāleka Kālepa",
    "troubadour": "Haku mele",
    "turtle-bean": "Pāpapa Honu",
    "vagabond": "Kuewa",
    "vampire": "Wamapila",
    "walkie-talkie": "Mīkini Kūkaʻi ʻŌlelo",
    "wee-joker": "Iōka Liʻiliʻi",
    "wily-joker": "Iōka Hoʻopunipuni",
    "wrathful-joker": "Iōka Inaina",
    "zany-joker": "Iōka ʻAno ʻĒ",
  },
  jokerDescriptions: {
    "8-ball": "Loaʻa ka {{prob}} papaha no kēlā me kēia {{rank}} i pāʻani ʻia e haku i {{cardType}} kāleka ke loaʻa ka {{room}}",
    "abstract-joker": "{{mult}} hoʻonui ʻana no kēlā me kēia kāleka {{card}} ",
    "acrobat": "{{xmult}} hoʻonui ʻana no ka {{timing}} o ka puni",
    "ancient-joker": "ʻO kēlā me kēia kāleka i pāʻani ʻia me ka {{suit}}, loaʻa ka {{xmult}} hoʻonui ʻana  ma ka helu ʻai, loli ka paʻa likelike ma ka hopena o ka puni",
    "arrowhead": "ʻO nā kāleka i pāʻani ʻia me ka paʻa likelike Peki, loaʻa maila he {{chips}} kipi ma ka helu ʻai",
    "astronomer": "ʻO nā kāleka {{cardType}} a pau a me nā {{packType}} ma ka hale kūʻai, he {{cost}}",
    "banner": "{{chips}} kipi no kēlā me kēia {{resource}} e koe ana",
    "baron": "ʻO kēlā me kēia {{rank}} i paʻa ma ka haʻawina lima, loaʻa maila ka {{xmult}} hoʻonui ʻana",
    "baseball-card": "Loaʻa maila he {{xmult}} hoʻonui ʻana i nā Iōka {{rarity}}",
    "blackboard": "He {{xmult}} hoʻonui ʻana inā he Peki a Kalapu nā kāleka ma ka haʻawina pepa o ka lima",
    "bloodstone": "Loaʻa ka ka papaha o ka {{prob}} no nā kāleka o ka paʻalikelike Haka i pāʻani ʻia e loaʻa ai he {{xmult}} hoʻonui ʻana ma ka helu ʻai",
    "blue-joker": "He {{chips}} kipi no kēlā me kēia kāleka ma ka puʻu pepa {{deck}}",
    "blueprint": "Kopena ʻia ka hiki o ka {{target}} i ka ʻākau",
    "bootstraps": "He {{mult}} hoʻonui ʻana no ke kālā {{money}} i loaʻa",
    "brainstorm": "Kopena ʻia ka hiki o ka {{target}} ma ka hema loa",
    "bull": "He {{chips}} kipi no ke kālā {{money}} i loaʻa iā ʻoe",
    "burglar": "Ke koho ʻia ka {{blind}}, loaʻa maila he {{hands}} haʻawina a {{discards}} kiola",
    "burnt-joker": "Hoʻokāʻoi i ka pae o ka haʻawina konoki {{action}} mua i kēlā me kēia puni",
    "business-card": "ʻO nā kāleka {{cardType}} i pāʻani ʻia, loaʻa ka {{prob}} papaha o ka eo he {{money}} kālā",
    "campfire": "Loaʻa he {{xmult}} hoʻonui ʻana i kēia Iōka no kēlā me kēia kāleka {{action}}, hoʻomaka hou ke eo ka {{blind}}",
    "card-sharp": "{{xmult}} Mult if played {{hand}} has already been played this round", // needs translation
    "cartomancer": "Haku i {{cardType}} inā ʻo ka {{trigger}} ka {{room}} i koho ʻia",
    "castle": "Loaʻa i kēia Iōka he {{chips}} kipi no kēlā me kēia kāleka o ka paʻa likelike {{suit}} i kiola ʻia; loli ka paʻa likelike ma nā puni",
    "cavendish": "He {{xmult}} hoʻonui ʻia o ka papaha {{prob}} e pau ana kēia kāleka ma ka hopena o ka puni",
    "ceremonial-dagger": "Ke koho ʻia ka pili {{blind}}, hoʻopau ʻia ka Iōka ma ka ʻākau a hoʻohui mau i kēia {{multiplier}} i kona waiwai kūʻai aku i kēia {{stat}}",
    "certificate": "Ke hoʻomaka ka puni, pākuʻi i {{card}} koho wale me kekahi {{seal}} koho wale i kō haʻawina pepa",
    "chaos-the-clown": "{{rerolls}} ka {{action}} manuahi ma nā kūʻaina",
    "clever-joker": "He {{chips}} kipi inā loaʻa ke Kūpē ma ka haʻawina pepa i pāʻani ʻia",
    "cloud-9": "Loaʻa he {{money}} kālā no kēlā me kēia {{rank}} ma kō {{deck}} i ka hopena o ka puni",
    "constellation": "Loaʻa maila i kēia Iōka he {{xmult}} hoʻonui ʻana i kēlā me kēia manawa i hoʻohana ʻia ai he kāleka {{cardType}}",
    "crafty-joker": "He {{chips}} kipi inā pāʻani ʻia he haʻawina pepa me ka Palaki",
    "crazy-joker": "He {{mult}} ka hoʻonui ʻana inā pāʻani ʻia he haʻawina pepa me ka Holo Paʻa Likelike",
    "credit-card": "ʻAe ʻia ka hoʻonui ʻaiʻē a i ka {{money}}",
    "delayed-gratification": "Loaʻa he {{money}} kālā no kēlā me kēia {{discard}} inā ʻaʻole hoʻohana ʻia nā kiola ke pau ka puni",
    "devious-joker": "He {{chips}} kipi inā loaʻa ka Holo Paʻa Likelike ma ka haʻawina pepa i pāʻani ʻia aku nei",
    "diet-cola": "Kūʻai aku i kēia kāleka e haku i {{tag}} manuahi",
    "dna": "If {{when}} of round has only {{count}} card, add a permanent copy to deck and draw it to {{location}}", // needs translation
    "drivers-license": "He {{xmult}} hoʻonui ʻana inā, ma ka liʻiliʻi loa, he {{count}} o nā kāleka ʻai keu ma kō puʻu pepa piha",
    "droll-joker": "He {{mult}} hoʻonui ʻana inā he Palaki ma kō haʻawina pepa i pāʻani ʻia",
    "drunkard": "He {{discards}} kiola o kēlā me kēia puni",
    "dusk": "Hoʻōla hou i nā kāleka a pau i pāʻani ʻia ma ka {{hand}} o ka puni",
    "egg": "Loaʻa he {{money}} o ka {{sellValue}} ma ka hopena o kēlā me kēia puni",
    "erosion": "He {{mult}} hoʻonui ʻia no kēlā me kēia kāleka ma lalo o ka {{threshold}} ma kō puʻu pepa piha",
    "even-steven": "ʻO nā kāleka ma ke kūlana {{parity}} i pāʻani ʻia, he {{mult}} hoʻonui ʻana ke loaʻa ka {{ranks}} ma ka helu ʻai",
    "faceless-joker": "Loaʻa he {{money}} kālā inā kiola ʻia he {{count}} a ʻoi {{cards}} ma ka wā hoʻokahi",
    "fibonacci": "He {{mult}} hoʻonui ʻana no kēlā me kēia kāleka {{rank1}}, {{rank2}}, {{rank3}}, {{rank4}}, a {{rank5}} paha",
    "flash-card": "This Joker gains {{mult}} Mult per {{reroll}} in the shop", // needs translation
    "flower-pot": "He {{xmult}} hoʻonui ʻana inā he Kaimana, Kalapu, Haka, a Peki paha ma ka haʻawina pepa Konoiki",
    "fortune-teller": "He {{mult}} hoʻonui ʻana no kēlā me kēia kāleka {{cardType}} i pāʻani ʻia ma kēia puni",
    "four-fingers": "Hiki ke hana i nā Palaki a me nā Holo Paʻa Likelike a pau me 4 wale nō kāleka",
    "gift-card": "Pākuʻi ʻia he {{money}} o ka {{sellValue}} i kēlā me kēia kāleka {{card1}} a kāleka {{card2}} ma ka hopena o ka puni",
    "glass-joker": "Loaʻa i kēia Iōka he {{xmult}} hoʻonui ʻana no kēlā me kēia {{cardType}} i hoʻopau ʻia",
    "gluttonous-joker": "Loaʻa he {{mult}} hoʻonui ʻana no nā kāleka Kalapu i pāʻani ʻia",
    "golden-joker": "Loaʻa he {{money}} ma ka hopena o ka puni",
    "golden-ticket": "Loaʻa he {{money}} no nā kāleka {{cardType}} i pāʻani ʻia",
    "greedy-joker": "Loaʻa he {{mult}} no nā kāleka Kaimana i pāʻani ʻia",
    "green-joker": "{{handMult}} Mult per hand played {{discardMult}} Mult per discard", // needs translation
    "gros-michel": "He {{mult}} hoʻonui ʻana a he {{prob}} papaha e hoʻopau ʻia ana kēia kāleka ma ka hopena o kēia puni",
    "hack": "Hoʻohana hou i nā kāleka {{rank1}}, {{rank2}}, {{rank3}}, a {{rank4}} paha i pāʻani ʻia",
    "half-joker": "He {{mult}} hoʻonui ʻana inā he {{cards}} a emi mai kāleka ma ka haʻawina pepa",
    "hallucination": "He {{prob}} ka papaha ʻo ka haku ʻana i kāleka {{cardType}} ke wehe ʻia kekahi {{pack}} ma ka {{room}}",
    "hanging-chad": "Hoʻokī hou i ka {{position}} o ke kāleka i pāʻani ʻia ma ka helu hoʻonui ʻana he {{times}} ma kona ʻani he wā keu",
    "hiker": "Loaʻa i kēlā me kēia kāleka {{cardType}} i {{chips}} kipi ke helu ʻia nā ʻai",
    "hit-the-road": "This Joker gains {{xmult}} Mult for every {{rank}} discarded this round", // needs translation
    "hologram": "Loaʻa i kēia Iōka he {{xmult}} hoʻonui ʻana i kēlā me kēia manawa i pākuʻi ʻia ai he {{card}} i kō puʻu pepa",
    "ice-cream": "He {{chips}} kipi i {{decay}} ma nā kipi no kēlā me kēia haʻawina pepa i pāʻani ʻia",
    "joker-stencil": "He {{xmult}} hoʻonui ʻana no kēlā me kēia haka {{slotType}} hakahaka—helu pū ʻia ka Iōka Mahaka",
    "jolly-joker": "He {{mult}} hoʻonui ʻana inā he Kūpē ko ka haʻawina pepa i pāʻani ʻia",
    "juggler": "He {{handSize}} ka nui haʻawina",
    "loyalty-card": "He {{xmult}} hoʻonui ʻana no kēlā me kēia {{hands}} haʻawina pepa i pāʻani ʻia a koe he {{remaining}}",
    "luchador": "Kūʻai aku i kēia kāleka e hoʻohemahema i ka {{boss}} e kū nei",
    "lucky-cat": "Loaʻa i kēia Iōka he {{xmult}} hoʻonui ʻana  i kēlā me kēia manawa i hoʻohana ʻia ai he {{cardType}} a {{result}} maila",
    "lusty-joker": "ʻO nā kāleka Haka i pāʻani ʻia, loaʻa maila he {{mult}} hoʻonui ma ka helu ʻai",
    "mad-joker": "He {{mult}} hoʻonui ʻana inā pāʻani ʻia he Kūpē",
    "madness": "Ke koho ʻia ka {{blind1}} a i ʻole ka {{blind2}}, loaʻa maila he {{xmult}} hoʻonui ʻana a {{action}} i Iōka i koho wale ʻia",
    "mail-in-rebate": "Loaʻa mai he {{money}} kālā no kēlā me kēia {{rank}} i kiola ʻia—loli ke kūlana i kēlā me kēia puni",
    "marble-joker": "Adds one {{enhancement}} card to the deck when {{trigger}} is selected", // needs translation
    "matador": "Loaʻa he {{money}} kālā inā hoʻā ʻia maila ka hana kalakupua o ka {{boss}} i ka haʻawina pepa i pāʻani ʻia",
    "merry-andy": "Kiola ʻia nā {{discards}} i kēlā me kēia puni, ʻo ka {{handSize}} ka nui haʻawina lima",
    "midas-mask": "All played {{cardType}} cards become {{enhancement}} cards when scored", // needs translation
    "mime": "Hoʻohana hou i nā hana kalakupua {{location}} o nā kāleka a pau",
    "misprint": "He {{mult}} hoʻonui ʻana",
    "mr-bones": "Kūpale ʻia ka Make Loa inā loaʻa he {{threshold}} ma ka liʻiliʻi loa i nā kipi i koi ʻia ka {{outcome}}",
    "mystic-summit": "He {{mult}} hoʻonui ʻana ke loaʻa he {{discards}} kiola ʻana e koe ana",
    "obelisk": "Loaʻa i kēia Iōka he {{xmult}} hoʻonui ʻana no kēlā me kēia {{streak}} o ka haʻawina pepa i pāʻani ʻia me ka pāʻani ʻole pū i kō {{hand}} i pāʻani nui loa ʻia",
    "odd-todd": "Played cards with {{parity}} rank give {{chips}} Chips when scored {{ranks}}", // needs translation
    "onyx-agate": "ʻO nā kāleka Kalapu i pāʻani ʻia, loaʻa mai he {{mult}} hoʻonui ʻana ke helu ʻia nā ʻai",
    "oops-all-6s": "Pālua ʻia nā {{probabilities}} {{listed}} a pau. {{example}} -> {{result}}",
    "pareidolia": "Helu ʻia nā kāleka a pau he mau kāleka {{cardType}}",
    "photograph": "ʻO ka {{cardType}} mua i pāʻani ʻia, loaʻa maila he {{xmult}} ke helu ʻia nā ʻai",
    "plus-four-mult": "He {{mult}} hoʻonui ʻana",
    "popcorn": "He {{mult}} hoʻonui ʻana. {{decay}} ka hoʻonui ʻana i kēlā me kēia puni i pāʻani ʻia",
    "raised-fist": "Pākuʻi ʻia ka {{factor}} o ke kūlana o ka {{rank}} i paʻa ma ka haʻawina pepa i hoʻonui ʻana",
    "ramen": "He {{xmult}} hoʻonui ʻana, nalo ihola ka {{decay}} o ka hoʻonui ʻana no kēlā me kēia {{card}} i kiola ʻia",
    "red-card": "Loaʻa i kēia Iōka he {{mult}} hoʻonui ʻana ke kapae ʻia kekahi ʻano {{pack}}",
    "reserved-parking": "Each {{cardType}} card held in hand has a {{prob}} chance to give {{money}}", // needs translation
    "ride-the-bus": "Loaʻa i kēia Iōka he {{mult}} hoʻonui ʻana no kēlā me kēia haʻawina pepa {{consecutive}} i pāʻani ʻia me ka helu ʻole ʻana i kēia ʻano kāleka {{cardType}}",
    "riff-raff": "When {{trigger}} is selected, create {{count}} {{rarity}} {{cardType}} {{room}}", // needs translation
    "rocket": "Loaʻa he {{money}} kālā ma ka hopena o ka puni. Nui aʻe ka loaʻa ma ka {{increase}} ke hāʻule ka {{blind}}",
    "rough-gem": "ʻO nā kāleka Kaimana i pāʻani ʻia, loaʻa he {{money}} kālā ke helu ʻia nā ʻai",
    "runner": "Loaʻa maila he {{chips}} kipi inā he Holo Paʻa Likelike ma ka haʻawina pepa",
    "satellite": "Loaʻa mai he {{money}} kālā ma ka hopena o ka puni no kēlā me kēia kāleka {{cardType}} kūikawā i hoʻohana ʻia ma kēia puni",
    "scary-face": "Loaʻa mai he {{chips}} kipi i nā kāleka {{cardType}} i pāʻani ʻia ke helu ʻia nā ʻai",
    "scholar": "ʻO ka {{rank}} i pāʻani ʻia, loaʻa maila he {{chips}} kipi a {{mult}} hoʻonui ʻana ke helu ʻia",
    "seance": "If {{hand}} is a Straight Flush, create a random {{cardType}} card {{room}}", // needs translation
    "seeing-double": "He {{xmult}} hoʻonui ʻana inā he kāleka Kalapu a he kāleka helu ʻai o kekahi ʻano ma ka haʻawina pepa i pā'ani ʻia",
    "seltzer": "Hoʻohana hou i nā kāleka a pau i pāʻani ʻia no nā haʻawina pepa he {{hands}}",
    "shoot-the-moon": "Each {{rank}} held in hand gives {{mult}} Mult", // needs translation
    "shortcut": "ʻAe ʻia nā Holo Paʻa Likelike me nā kōā he {{gap}}, {{example}}",
    "showman": "Kupu aʻe paha ke {{card1}}, {{card2}}, {{card3}}, a {{card4}} he mau manawa",
    "sixth-sense": "Inā he hoʻokahi kūlana {{rank}} ka haʻawina pepa {{hand}} o ka puni, hoʻopau ʻia a haku ʻia he kāleka {{cardType}} o ka {{room}}",
    "sly-joker": "He {{chips}} kipi inā he Kūpē ko ka haʻawina pepa i pāʻani ʻia",
    "smeared": "Helu ʻia nā kāleka Haka a Kaimana ʻo ia ka paʻa likelike like, pēlā pū nā kāleka Peki a Kalapu",
    "smiley-face": "Loaʻa mai he {{mult}} hoʻonui ʻana i nā kāleka {{cardType}} i pā'ani ʻia ma ka helu ʻai",
    "sock-and-buskin": "Hoʻohana hou i nā kāleka {{cardType}} a pau",
    "space-joker": "He {{prob}} ka papaha o ka hoʻokāʻoi ʻana i ka pae o ka {{hand}} i pāʻani ʻia",
    "spare-trousers": "Loaʻa i kēia Iōka he {{mult}} hoʻonui ʻana inā he {{hand}} ma ka haʻawina pepa",
    "splash": "Helu ʻia nā {{card}} ma ka helu ʻai ʻana",
    "square-joker": "Loaʻa i kēia Iōka he {{chips}} kipi inā he {{cards}} mau kāleka ma ka haʻawina pepa i pāʻani ʻia",
    "steel-joker": "Gives {{xmult}} Mult for each {{card}} in your {{deck}}", // needs translation
    "stone-joker": "Loaʻa maila he {{chips}} kipi no kēlā me kēia kāleka {{card}} ma kō {{deck}}",
    "stuntman": "He {{chips}} kipi,{{handSize}} ka nui haʻawina pepa",
    "supernova": "Helu ʻia ka nui manawa i pāʻani ʻia ai kēia holo o ka {{hand}} i ka hoʻonui ʻana",
    "superposition": "Haku ʻia he kāleka {{cardType}} inā he kāleka {{rank}} a he Holo Paʻa Likelike ma ka haʻawina pepa o ka {{room}}",
    "swashbuckler": "Helu ʻia ka waiwai kūʻai o nā kāleka {{cards}} ʻē aʻe a pau i ka hoʻonui ʻana",
    "the-duo": "He {{xmult}} hoʻonui ʻana inā he Kūpē ma ka haʻawina pepa i pāʻani ʻia",
    "the-family": "He {{xmult}} hoʻonui ʻana inā he Kuahā Paʻa Likelike ma ka haʻawina pepa i pāʻani ʻia",
    "the-idol": "Each played {{rank}} of {{suit}} gives {{xmult}} Mult when scored", // needs translation
    "the-order": "He {{xmult}} hoʻonui ʻana inā he Holo Paʻa Likelike ma ka haʻawina pepa i pāʻani ʻia",
    "the-tribe": "He {{xmult}} hoʻonui ʻana inā he Palaki ma ka haʻawina pepa i pāʻani ʻia",
    "the-trio": "He {{xmult}} hoʻonui ʻana inā he Pūkolu Kāleka ma ka haʻawina pepa i pāʻani ʻia",
    "throwback": "He {{xmult}} hoʻonui ʻana no kēlā me kēia {{blind}} i kāpae ʻia ma kēia pāʻani ʻana",
    "to-do-list": "Loaʻa maila he {{money}} kālā inā he {{handType}} ka {{hand}}; loli ka haʻawina pepa Konoki ma ka hopena o ka puni",
    "to-the-moon": "Loaʻa maila he kālā {{money}} keu o ka {{interest}} no kēlā me kēia {{threshold}} i loaʻa iā ʻoe ma ka hopena o ka puni",
    "trading-card": "Inā he {{count}} wale nō kāleka ma ka {{phase}} o ka puni, hoʻopau ʻia a loaʻa maila he {{money}} kālā",
    "troubadour": "{{handSize}} ka nui haʻawina pepa, {{hands}} haʻawina pepa o kēlā me kēia puʻu pepa",
    "turtle-bean": "{{handSize}} ka nui haʻawina pepa, hōʻemi ʻia ma ka {{reduction}} i kēlā me kēia puni",
    "vagabond": "Haku ʻia he kāleka {{cardType}} inā pāʻani ʻia ka haʻawina pepa me ka nui kālā he {{money}} a emi mai paha",
    "vampire": "Loaʻa i kēia Iōka he {{xmult}} hoʻonui ʻana no kēlā me kēia helu ʻai ʻana o ke kāleka {{cardType}}; wehe ʻia ka {{enhancement}} o ke kāleka",
    "walkie-talkie": "Each played {{rank1}} or {{rank2}} gives {{chips}} Chips and {{mult}} Mult when scored", // needs translation
    "wee-joker": "Loaʻa i kēia Iōka he {{chips}} kipi ke helu ʻia kēlā me kēia kāleka {{rank}} i pāʻani ʻia",
    "wily-joker": "He {{chips}} kipi inā he Kāleka Pūkolu ma ka haʻawina pepa i pāʻani ʻia",
    "wrathful-joker": "Loaʻa he {{mult}} hoʻonui ʻana ke helu ʻia nā kāleka Kalapu i pāʻani ʻia",
    "zany-joker": "He {{mult}} hoʻonui ʻana inā he Kāleka Pūkolu ma ka haʻawina pepa i pāʻani ʻia",
  },
  planetNames: {
    "ceres": "Ceres", // needs translation
    "earth": "Honua",
    "eris": "Eris", // needs translation
    "jupiter": "Kaʻāwela",
    "mars": "Hōkūʻula",
    "mercury": "ʻUkali",
    "neptune": "Neptune", // needs translation
    "planet-x": "Planet X", // needs translation
    "pluto": "Pluto", // needs translation
    "saturn": "Makulu",
    "uranus": "Uranus", // needs translation
    "venus": "Hōkūloa",
  },
  planetDescriptions: {
    "ceres": "Upgrades Flush House: +4 Mult, +40 Chips", // needs translation
    "earth": "Upgrades Full House: +2 Mult, +25 Chips", // needs translation
    "eris": "Upgrades Flush Five: +3 Mult, +50 Chips", // needs translation
    "jupiter": "Upgrades Flush: +2 Mult, +15 Chips", // needs translation
    "mars": "Upgrades Four of a Kind: +3 Mult, +30 Chips", // needs translation
    "mercury": "Upgrades Pair: +1 Mult, +15 Chips", // needs translation
    "neptune": "Upgrades Straight Flush / Royal Flush: +4 Mult, +40 Chips", // needs translation
    "planet-x": "Upgrades Five of a Kind: +3 Mult, +35 Chips", // needs translation
    "pluto": "Upgrades High Card: +1 Mult, +10 Chips", // needs translation
    "saturn": "Upgrades Straight: +3 Mult, +30 Chips", // needs translation
    "uranus": "Upgrades Two Pair: +1 Mult, +20 Chips", // needs translation
    "venus": "Upgrades Three of a Kind: +2 Mult, +20 Chips", // needs translation
  },
  voucherNames: {
    "antimatter": "Antimatter", // needs translation
    "blank": "Blank", // needs translation
    "clearance-sale": "Clearance Sale", // needs translation
    "crystal-ball": "Crystal Ball", // needs translation
    "directors-cut": "Director's Cut", // needs translation
    "glow-up": "Glow Up", // needs translation
    "grabber": "Grabber", // needs translation
    "hieroglyph": "Hieroglyph", // needs translation
    "hone": "Hone", // needs translation
    "illusion": "Illusion", // needs translation
    "liquidation": "Liquidation", // needs translation
    "magic-trick": "Magic Trick", // needs translation
    "money-tree": "Money Tree", // needs translation
    "nacho-tong": "Nacho Tong", // needs translation
    "observatory": "Observatory", // needs translation
    "omen-globe": "Omen Globe", // needs translation
    "overstock": "Overstock", // needs translation
    "overstock-plus": "Overstock Plus", // needs translation
    "paint-brush": "Paint Brush", // needs translation
    "palette": "Palette", // needs translation
    "petroglyph": "Petroglyph", // needs translation
    "planet-merchant": "Planet Merchant", // needs translation
    "planet-tycoon": "Planet Tycoon", // needs translation
    "recyclomancy": "Recyclomancy", // needs translation
    "reroll-glut": "Reroll Glut", // needs translation
    "reroll-surplus": "Reroll Surplus", // needs translation
    "retcon": "Retcon", // needs translation
    "seed-money": "Seed Money", // needs translation
    "tarot-merchant": "Tarot Merchant", // needs translation
    "tarot-tycoon": "Tarot Tycoon", // needs translation
    "telescope": "Telescope", // needs translation
    "wasteful": "Wasteful", // needs translation
  },
  voucherDescriptions: {
    "antimatter": "+1 joker slot.", // needs translation
    "blank": "Does nothing… for now.", // needs translation
    "clearance-sale": "All shop items 25% off.", // needs translation
    "crystal-ball": "+1 consumable slot.", // needs translation
    "directors-cut": "Reroll the Boss Blind 1 time per ante. Costs $10 each.", // needs translation
    "glow-up": "Foil, Holographic, and Polychrome Jokers appear 4× as often.", // needs translation
    "grabber": "+1 hand per round.", // needs translation
    "hieroglyph": "-1 Ante, -1 hand per round.", // needs translation
    "hone": "Foil, Holographic, and Polychrome Jokers appear 2× as often.", // needs translation
    "illusion": "Playing cards in shop may have an Enhancement, Edition, and/or a Seal.", // needs translation
    "liquidation": "All shop items 50% off.", // needs translation
    "magic-trick": "Playing cards can be purchased from the shop.", // needs translation
    "money-tree": "Raise the interest cap to $20.", // needs translation
    "nacho-tong": "+1 additional hand per round.", // needs translation
    "observatory": "Each Planet card in your consumable area gives ×1.5 Mult to its specified hand.", // needs translation
    "omen-globe": "1 in 5 Tarot card rolls in the shop become Spectral cards instead.", // needs translation
    "overstock": "+1 shop offer slot.", // needs translation
    "overstock-plus": "+1 additional shop offer slot.", // needs translation
    "paint-brush": "+1 hand size.", // needs translation
    "palette": "+1 additional hand size.", // needs translation
    "petroglyph": "-1 Ante, -1 discard per round.", // needs translation
    "planet-merchant": "Planet cards appear 2× as often in the shop.", // needs translation
    "planet-tycoon": "Planet cards appear 4× as often in the shop.", // needs translation
    "recyclomancy": "+1 additional discard per round.", // needs translation
    "reroll-glut": "Rerolls cost an additional $2 less.", // needs translation
    "reroll-surplus": "Rerolls cost $2 less.", // needs translation
    "retcon": "Reroll the Boss Blind unlimited times. Costs $10 each.", // needs translation
    "seed-money": "Raise the interest cap to $10.", // needs translation
    "tarot-merchant": "Tarot cards appear 2× as often in the shop.", // needs translation
    "tarot-tycoon": "Tarot cards appear 4× as often in the shop.", // needs translation
    "telescope": "Celestial Packs always contain the Planet card for your most-played hand.", // needs translation
    "wasteful": "+1 discard per round.", // needs translation
  },
  tarotNames: {
    "death": "Death", // needs translation
    "judgement": "Judgement", // needs translation
    "justice": "Justice", // needs translation
    "strength": "Strength", // needs translation
    "temperance": "Temperance", // needs translation
    "the-chariot": "The Chariot", // needs translation
    "the-devil": "The Devil", // needs translation
    "the-emperor": "The Emperor", // needs translation
    "the-empress": "The Empress", // needs translation
    "the-fool": "The Fool", // needs translation
    "the-hanged-man": "The Hanged Man", // needs translation
    "the-hermit": "The Hermit", // needs translation
    "the-hierophant": "The Hierophant", // needs translation
    "the-high-priestess": "The High Priestess", // needs translation
    "the-lovers": "The Lovers", // needs translation
    "the-magician": "The Magician", // needs translation
    "the-moon": "The Moon", // needs translation
    "the-star": "The Star", // needs translation
    "the-sun": "The Sun", // needs translation
    "the-tower": "The Tower", // needs translation
    "the-world": "The World", // needs translation
    "wheel-of-fortune": "Wheel of Fortune", // needs translation
  },
  tarotDescriptions: {
    "death": "Select 2 cards in hand: left card becomes a copy of the right", // needs translation
    "judgement": "Create a random Joker", // needs translation
    "justice": "Apply glass enhancement to 1 card in hand", // needs translation
    "strength": "Increase rank of up to 2 cards in hand by 1", // needs translation
    "temperance": "Earn the total sell value of equipped jokers (max +$50)", // needs translation
    "the-chariot": "Apply steel enhancement to 1 card in hand", // needs translation
    "the-devil": "Apply gold enhancement to 1 card in hand", // needs translation
    "the-emperor": "Creates up to 2 random Tarots (must have room)", // needs translation
    "the-empress": "Apply mult enhancement to up to 2 cards in hand", // needs translation
    "the-fool": "Creates a copy of the last Tarot or Planet card used (must have room)", // needs translation
    "the-hanged-man": "Destroy up to 2 cards in hand", // needs translation
    "the-hermit": "Doubles current money (max +$20)", // needs translation
    "the-hierophant": "Apply bonus enhancement to up to 2 cards in hand", // needs translation
    "the-high-priestess": "Creates up to 2 random Planets (must have room)", // needs translation
    "the-lovers": "Apply wild enhancement to 1 card in hand", // needs translation
    "the-magician": "Apply lucky enhancement to up to 2 cards in hand", // needs translation
    "the-moon": "Convert up to 3 cards in hand to ♣ Clubs", // needs translation
    "the-star": "Convert up to 3 cards in hand to ♦ Diamonds", // needs translation
    "the-sun": "Convert up to 3 cards in hand to ♥ Hearts", // needs translation
    "the-tower": "Apply stone enhancement to 1 card in hand", // needs translation
    "the-world": "Convert up to 3 cards in hand to ♠ Spades", // needs translation
    "wheel-of-fortune": "25% chance to add a random edition to a random Joker", // needs translation
  },
  spectralNames: {
    "ankh": "Ankh", // needs translation
    "aura": "Aura", // needs translation
    "black-hole": "Black Hole", // needs translation
    "cryptid": "Cryptid", // needs translation
    "deja-vu": "Deja Vu", // needs translation
    "ectoplasm": "Ectoplasm", // needs translation
    "familiar": "Familiar", // needs translation
    "grim": "Grim", // needs translation
    "hex": "Hex", // needs translation
    "immolate": "Immolate", // needs translation
    "incantation": "Incantation", // needs translation
    "medium": "Medium", // needs translation
    "ouija": "Ouija", // needs translation
    "sigil": "Sigil", // needs translation
    "soul": "The Soul", // needs translation
    "talisman": "Talisman", // needs translation
    "trance": "Trance", // needs translation
    "wraith": "Wraith", // needs translation
  },
  spectralDescriptions: {
    "ankh": "Create a copy of a random Joker, destroy all other Jokers", // needs translation
    "aura": "Add Foil, Holographic, or Polychrome effect to 1 selected card in your hand", // needs translation
    "black-hole": "Upgrade every poker hand by 1 level", // needs translation
    "cryptid": "Create 2 copies of 1 selected card in your hand", // needs translation
    "deja-vu": "Add a Red Seal to 1 selected card in your hand", // needs translation
    "ectoplasm": "Add Negative to a random Joker, -1 hand size", // needs translation
    "familiar": "Destroy 1 random card in hand, add 3 random Enhanced face cards", // needs translation
    "grim": "Destroy 1 random card in hand, add 2 random Enhanced Aces", // needs translation
    "hex": "Add Polychrome to a random Joker, destroy all other Jokers", // needs translation
    "immolate": "Destroys 5 random cards in hand, gain $20", // needs translation
    "incantation": "Destroy 1 random card in hand, add 4 random Enhanced numbered cards", // needs translation
    "medium": "Add a Purple Seal to 1 selected card in your hand", // needs translation
    "ouija": "Convert all cards in hand to a single random rank, -1 hand size", // needs translation
    "sigil": "Converts all cards in hand to a single random suit", // needs translation
    "soul": "Create a Legendary Joker", // needs translation
    "talisman": "Add a Gold Seal to 1 selected card in your hand", // needs translation
    "trance": "Add a Blue Seal to 1 selected card in your hand", // needs translation
    "wraith": "Create a random Rare Joker, set money to $0", // needs translation
  },
};
