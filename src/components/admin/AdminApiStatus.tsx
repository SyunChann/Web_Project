import "server-only";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getApiHealth, getApiStatistics } from "@/lib/apiMonitoring";
import { apiServices, apiStateLabels, apiHealthPresentation, serviceConfigured, type ApiService } from "@/lib/apiMonitoringModel";
import { AdminApiRefresh } from "./AdminApiRefresh";
import { AdminApiStatistics } from "./AdminApiStatistics";

const tones: Record<string, string> = { green: "bg-[#e4f4f2] text-[#216864]", amber: "bg-[#fff4da] text-[#905512]", red: "bg-[#fde8e7] text-[#a73735]", gray: "bg-[#eef0f3] text-[#52616b]" };
function time(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "—";
}
export async function AdminApiStatus({ user, now, headingLevel = "h2" }: { user: User; now: number; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  const [result, statistics] = await Promise.all([getApiHealth(user), getApiStatistics(user)]);
  if (result.state === "forbidden") return null;
  return <section id="api-status" className="grid scroll-mt-6 gap-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><Heading className={headingLevel === "h1" ? "text-3xl font-black tracking-tight sm:text-4xl" : "text-2xl font-black"}>외부 API 운영 현황</Heading><p className="mt-2 text-sm leading-6 text-[#64748b]">서비스에서 사용한 조회 결과를 확인합니다. 모든 시각은 한국 시간(KST)입니다.</p></div><AdminApiRefresh /></header>
    {result.state === "unconfigured" ? <div role="status" className="rounded-lg border border-[#f0ddbd] bg-[#fff8ec] p-4 text-sm leading-7 text-[#905512]"><strong>기록 저장 설정 필요</strong><p>Vercel에 서버 전용 <code>SUPABASE_SERVICE_ROLE_KEY</code>를 등록한 뒤 재배포해 주세요. 키 값은 화면이나 브라우저에 전달하지 않습니다. 설정 전에는 기록을 저장하지 않습니다.</p></div> : result.state === "unavailable" ? <p role="status" className="rounded-lg border border-[#f0ddbd] bg-[#fff8ec] p-4 text-sm text-[#905512]">운영 기록을 불러오지 못했습니다. 서버 전용 키와 모니터링 DB 설정을 확인해 주세요. 다른 관리 기능은 계속 이용할 수 있습니다.</p> : null}
    {statistics.state === "ready" ? <AdminApiStatistics data={statistics.data} /> : statistics.state === "unavailable" ? <p role="status" className="rounded-lg border border-[#f0ddbd] bg-[#fff8ec] p-4 text-sm leading-7 text-[#905512]">7일 운영 통계를 불러오지 못했습니다. 운영 이력 DB 설정과 서버 연결을 확인해 주세요. 아래 최신 운영 현황은 별도로 표시합니다.</p> : null}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(Object.entries(apiServices) as [ApiService, typeof apiServices[ApiService]][]).map(([id, service]) => {
        const row = result.rows.find((r) => r.service === id);
        const status = apiHealthPresentation(id, row, now);
        return <article key={id} className="min-w-0 rounded-lg border border-[#d8cfc2] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-[#17202a]">{service.name}</h3><p className="mt-1 text-xs text-[#64748b]">{service.provider}</p></div><span className={`rounded px-2 py-1 text-xs font-bold ${tones[status.tone]}`}>{status.label}</span></div>
          {id === "exchange-koreaexim" ? <p className="mt-3 rounded-md bg-[#f7f8fa] p-2 text-xs leading-6 text-[#64748b]">{serviceConfigured(id) ? "한국수출입은행을 우선 조회합니다. 조회에 실패하거나 제공 데이터가 없으면 ECB 환율로 대체합니다." : <>서버의 <code>KOREAEXIM_API_KEY</code>가 미등록 상태입니다. 메인 환율은 ECB로 조회하며, 정상 여부는 ‘ECB 환율’ 카드에서 확인할 수 있습니다.</>}</p> : null}
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-[#64748b]">최근 확인</dt><dd className="text-right font-semibold">{time(row?.checked_at)}</dd>
            <dt className="text-[#64748b]">마지막 성공</dt><dd className="text-right font-semibold">{time(row?.last_success_at)}</dd>
            <dt className="text-[#64748b]">조회 소요</dt><dd className="text-right font-semibold">{row ? `${row.duration_ms.toLocaleString("ko-KR")}ms` : "—"}</dd>
            {row?.source_updated_at ? <><dt className="text-[#64748b]">자료 기준</dt><dd className="text-right font-semibold">{time(row.source_updated_at)}</dd></> : null}
          </dl>
          {row?.last_error_state ? <p className="mt-3 rounded-md bg-[#f7f8fa] p-2 text-xs leading-6 text-[#64748b]">최근 문제: {apiStateLabels[row.last_error_state]} · {time(row.last_error_at)}{row.http_status && row.last_error_at === row.checked_at ? ` · HTTP ${row.http_status}` : ""}</p> : null}
          <Link href={service.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#304d70]">관련 서비스 보기 ↗</Link>
        </article>;
      })}
    </div>
    <details className="rounded-lg border border-[#d8cfc2] bg-white px-4 text-sm text-[#64748b]"><summary className="min-h-11 cursor-pointer py-3 font-bold">기록 기준 안내</summary><div className="space-y-2 pb-4 text-xs leading-6"><p>기록 새로고침은 저장된 기록만 읽으며 외부 API를 일괄 호출하지 않습니다. 아직 이용하지 않은 연동은 확인 기록이 없을 수 있습니다. 환율은 한국수출입은행 사용 시 보조 환율 조회 기록이 없을 수 있습니다.</p><p>조회 소요 시간에는 캐시 읽기·응답 해석·재시도 등이 포함됩니다. 실제 API 호출 횟수나 순수 네트워크 응답 시간을 뜻하지 않습니다. 같은 상태는 서버 인스턴스별로 1분 간격으로 저장하며, 오류 상태가 달라지면 바로 기록합니다.</p><p>최근 조회 없음은 이용 요청이 뜸했다는 뜻이며 장애 판정이 아닙니다. 출국장 자료가 10분 넘게 오래되면 갱신 지연으로 표시합니다. 브라우저에서 호출하는 지도 API는 집계하지 않습니다. URL·검색어·사용자 정보·응답 본문은 저장하지 않습니다.</p></div></details>
  </section>;
}
