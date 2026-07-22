export const airportCodeMap: Record<string, string> = {
// 🇯🇵 일본 주요 대도시 & 관광지
  "후쿠오카": "fuk",
  "도쿄": "nrt",      // 나리타 (하네다 전용은 hnd, 도쿄 전체 통합 검색은 tyo)
  "오사카": "kix",    // 간사이 (오사카 전체 통합 검색은 osa)
  "삿포로": "cts",   
  "오키나와": "oka",  
  "나고야": "ngo",    

  // 🇯🇵 일본 소도시 (규슈 지역)
  "기타큐슈": "kkj",
  "사가": "hsg",
  "구마모토": "kmj",
  "나가사키": "ngs",
  "오이타": "oit",
  "미야자키": "kmi",
  "가고시마": "koj",

  // 🇯🇵 일본 소도시 (시코쿠 & 혼슈 등)
  "마쓰야마": "myj",
  "다카마쓰": "tak",
  "히로시마": "hij",
  "시즈오카": "fsz",
  "센다이": "sdj",
  "아오모리": "aoj",
  "요나고": "ygj",
  "도야마": "toy",
  "니이가타": "kij",
};

export function getAirportCode(cityName: string | null | undefined) {
  if (!cityName) return null;
  return airportCodeMap[cityName] || null;
}