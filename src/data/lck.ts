export type LckMatch = {
  id: string;
  date: string;
  time: string;
  home: string;
  away: string;
  format: "Bo3" | "Bo5";
  stage: string;
};

// Team marks served by the official LoL Esports static asset host.
export const lckTeamLogoUrls: Record<string, string> = {
  BFX: "https://static.lolesports.com/teams/1734691810721_BFXfullcolorfordarkbg.png",
  BRO: "https://static.lolesports.com/teams/1716454325887_Nowyprojekt.png",
  DK: "https://static.lolesports.com/teams/1673260049703_DPlusKIALOGO11.png",
  DNS: "https://static.lolesports.com/teams/1767340467921_DN_SOOPerslogo_profile.webp",
  GEN: "https://static.lolesports.com/teams/1773829250929_GENGLOGO_GOLD.png",
  HLE: "https://static.lolesports.com/teams/1631819564399_hle-2021-worlds.png",
  KT: "https://static.lolesports.com/teams/kt_darkbackground.png",
  KRX: "https://static.lolesports.com/teams/1774247803537_horizontal_EN_Wh.png",
  NS: "https://static.lolesports.com/teams/NSFullonDark.png",
  T1: "https://static.lolesports.com/teams/1726801573959_539px-T1_2019_full_allmode.png",
};
