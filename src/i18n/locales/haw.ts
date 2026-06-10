import type { en } from "./en";

type LocaleMessages = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

export const haw: LocaleMessages = {
  sidebar: {
    runInfo: "ʻIke holo",
    options: "Nā koho",
    hands: "Nā lima",
    discards: "Nā kiola",
    money: "Kālā",
    ante: "Pili",
    round: "Pōʻai",
    roundScore: "Helu pōʻai",
    scoreAtLeast: "E loaʻa ka helu: {{score}}",
    toEarn: "e loaʻa ai {{award}}",
  },
  trays: {
    jokers: "Nā Joker",
    consumables: "Nā mea hoʻohana",
  },
  options: {
    language: "ʻŌlelo",
  },
};
