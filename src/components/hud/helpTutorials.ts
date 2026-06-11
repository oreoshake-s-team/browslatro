export const HELP_TUTORIALS = [
  {
    kind: "text",
    titleKey: "help.wikiTutorial",
    url: "https://balatrowiki.org/w/Tutorial",
  },
  {
    kind: "text",
    titleKey: "help.steamBeginnerGuide",
    url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3166504510",
  },
  {
    kind: "text",
    titleKey: "help.gameranxTips",
    url: "https://gameranx.com/features/id/496953/article/balatro-beginner-tips-tricks-guide/",
  },
  {
    kind: "video",
    titleKey: "help.videoCompleteBeginner",
    url: "https://www.youtube.com/watch?v=zP-s2aRNbL8",
  },
  {
    kind: "video",
    titleKey: "help.videoHowToPlay",
    url: "https://www.youtube.com/watch?v=mEl06UfPtw4",
  },
  {
    kind: "video",
    titleKey: "help.videoTutorialBeginners",
    url: "https://www.youtube.com/watch?v=Zgn0iKZSbLw",
  },
] as const;

export type HelpTutorial = (typeof HELP_TUTORIALS)[number];

export type HelpTutorialKind = HelpTutorial["kind"];
