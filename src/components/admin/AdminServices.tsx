import "server-only";
import Link from "next/link";

export function AdminServices() {
  const configured = (name: string) => Boolean(process.env[name]?.trim());
  const generalKey = configured("DATA_GO_KR_API_KEY");
  const services = [
    { title: "일본행 항공편", href: "/departures", ready: generalKey, note: "공공데이터포털 운항현황" },
    { title: "T1 출국장", href: "/departures", ready: configured("ICN_CONGESTION_T1_API_KEY") || generalKey, note: "전용 키 또는 공통 키 사용" },
    { title: "T2 출국장", href: "/departures", ready: configured("ICN_CONGESTION_T2_API_KEY") || generalKey, note: "전용 키 또는 공통 키 사용" },
    { title: "토스 추천 상품", href: "/admin/toss-images", ready: configured("TOSS_PROXY_BASE_URL") && configured("TOSS_PROXY_API_KEY"), note: "상품 이미지·차단 목록 확인" },
    { title: "네이버 상품 검색", href: "/new?type=merchandise", ready: configured("NAVER_CLIENT_ID") && configured("NAVER_CLIENT_SECRET"), note: "상품 리뷰 작성 시 검색 연동" },
  ];
  const links = [
    ["/drinks", "술 취향", "리뷰·궁금한 술·반 별 평점"],
    ["/departures", "인천공항 출국 안내", "출국장 혼잡도·일본행 항공편"],
    ["/recommendations", "추천 콘텐츠", "토스 상품과 에디터 픽"],
    ["/admin/toss-images", "토스 이미지 관리", "노출 중단 상품과 이미지 상태"],
    ["/release-calendar", "애니 신작 캘린더", "분기별 애니메이션 공개 일정"],
    ["/lck-calendar", "LCK 경기 일정", "경기 일정과 결과"],
    ["/lck-analysis", "LCK 밴픽 분석", "대회 밴픽 자료"],
    ["/account", "내 계정", "닉네임·비밀번호 관리"],
  ];
  return <section id="services" className="grid scroll-mt-6 gap-5">
    <div><h2 className="text-2xl font-black">서비스·연동 관리</h2><p className="mt-2 text-sm leading-6 text-[#64748b]">키 값은 표시하지 않습니다. 등록 상태는 현재 서버 환경변수 기준이며, 인증 승인·호출 한도·실시간 연결 상태를 뜻하지 않습니다.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => <Link key={service.title} href={service.href} className="rounded-lg border border-[#d8cfc2] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{service.title}</h3><span className={`rounded px-2 py-1 text-xs font-bold ${service.ready ? "bg-[#e4f4f2] text-[#2f7f7a]" : "bg-[#fff4da] text-[#9a5a13]"}`}>{service.ready ? "환경변수 등록" : "설정 필요"}</span></div><p className="mt-2 text-xs leading-6 text-[#64748b]">{service.note}</p>
    </Link>)}</div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{links.map(([href, title, note]) => <Link key={href} href={href} className="flex min-h-24 flex-col justify-between gap-2 rounded-lg border border-[#d8cfc2] bg-white p-4 shadow-sm hover:border-[#8fc9c4]"><h3 className="font-bold text-[#17202a]">{title} ↗</h3><p className="text-xs leading-5 text-[#64748b]">{note}</p></Link>)}</div>
  </section>;
}
