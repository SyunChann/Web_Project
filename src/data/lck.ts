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

// 2026 LCK schedule, shown in Korea Standard Time (KST).
// Keep this list data-only so a new season can be updated here.
export const lckMatches: LckMatch[] = [
  { id: "2026-08-19-gen-kt", date: "2026-08-19", time: "17:00", home: "GEN", away: "KT", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-19-bro-dns", date: "2026-08-19", time: "19:00", home: "BRO", away: "DNS", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-20-dk-hle", date: "2026-08-20", time: "17:00", home: "DK", away: "HLE", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-20-ns-krx", date: "2026-08-20", time: "19:00", home: "NS", away: "KRX", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-21-bro-bfx", date: "2026-08-21", time: "17:00", home: "BRO", away: "BFX", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-21-kt-t1", date: "2026-08-21", time: "19:00", home: "KT", away: "T1", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-22-dk-gen", date: "2026-08-22", time: "17:00", home: "DK", away: "GEN", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-22-dns-krx", date: "2026-08-22", time: "19:00", home: "DNS", away: "KRX", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-23-hle-t1", date: "2026-08-23", time: "17:00", home: "HLE", away: "T1", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-23-bfx-ns", date: "2026-08-23", time: "19:00", home: "BFX", away: "NS", format: "Bo3", stage: "Week 13" },
  { id: "2026-08-26-playin-1", date: "2026-08-26", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "Play-Ins" },
  { id: "2026-08-27-playin-2", date: "2026-08-27", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "Play-Ins" },
  { id: "2026-08-28-playin-3", date: "2026-08-28", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "Play-Ins" },
  { id: "2026-08-29-playoff-1", date: "2026-08-29", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "Playoffs" },
  { id: "2026-08-30-playoff-2", date: "2026-08-30", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "Playoffs" },
];
