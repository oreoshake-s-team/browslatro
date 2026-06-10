import type { en } from "./en";

type LocaleMessages = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

export const haw: LocaleMessages = {
  sidebar: {
    runInfo: "Run info",
    options: "Nā koho",
    hands: "Nā lima",
    discards: "Nā kiola",
    money: "Kālā",
    ante: "Ante",
    round: "Round",
    roundScore: "Round score",
    scoreAtLeast: "E loaʻa ka helu: {{score}}",
    toEarn: "e loaʻa ai {{award}}",
  },
  trays: {
    jokers: "Nā Joker",
    consumables: "Consumables",
  },
  options: {
    language: "ʻŌlelo",
  },
};
