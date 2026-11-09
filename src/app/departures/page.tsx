import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, PlaneTakeoff } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { getJapanDepartures, type DepartureBoardFlight, type DepartureBoardResult } from "@/lib/aerodatabox";
import styles from "./DepartureBoard.module.css";

export const metadata: Metadata = {
  title: "출발편 전광판 | 취향 보관소",
  description: "인천공항에서 일본으로 출발하는 항공편 전광판",
};

export const dynamic = "force-dynamic";

export default async function DeparturesPage() {
  const result = await getJapanDepartures();

  return (
    <main className={`${styles.page} min-h-screen px-6 py-8 sm:px-10`}>
      <section className={styles.shell}>
        <AppNav active="departures" />

        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>LIVE DEPARTURES · ICN</p>
            <h1 className={styles.title}>출발편 전광판</h1>
            <p className={styles.description}>
              인천국제공항에서 일본으로 향하는 출발편입니다. 모든 시각은 한국 표준시(KST)로 표시됩니다.
            </p>
          </div>
          <div className={styles.clock} aria-label={`현재 한국 시각 ${formatKoreanDateTime(new Date().toISOString())}`}>
            {formatKoreanDateTime(new Date().toISOString())} KST
          </div>
        </header>

        <section className={styles.board} aria-label="인천공항 일본행 출발편">
          <div className={styles.boardTop}>
            <div className={styles.route}>
              <span className={styles.routeCode}>ICN</span>
              <ArrowRight size={17} aria-hidden="true" />
              <span>JAPAN</span>
            </div>
            <p className={styles.count}>
              {result.state === "ready" ? `${result.flights.length} FLIGHTS` : "DEPARTURES"}
            </p>
          </div>

          {result.state === "ready" ? <FlightTable flights={result.flights} /> : <BoardState result={result} />}
        </section>

        <footer className={styles.footer}>
          <div className={styles.legend} aria-label="운항 상태 색상 안내">
            <Legend tone="delayed" label="지연" />
            <Legend tone="boarding" label="탑승 중" />
            <Legend tone="departed" label="출발" />
            <Legend tone="canceled" label="결항" />
          </div>
          <p>
            {result.updatedAt ? <>갱신 {formatKoreanDateTime(result.updatedAt)} · </> : null}
            출처 <strong>AeroDataBox</strong>
          </p>
        </footer>
      </section>
    </main>
  );
}

function FlightTable({ flights }: { flights: DepartureBoardFlight[] }) {
  return (
    <div role="table" aria-label="출발편 목록">
      <div className={styles.header} role="row">
        <span role="columnheader">항공편</span>
        <span role="columnheader">항공사</span>
        <span role="columnheader">목적지</span>
        <span role="columnheader">예정</span>
        <span role="columnheader">변경</span>
        <span role="columnheader">터미널</span>
        <span role="columnheader">게이트</span>
        <span role="columnheader">상태</span>
      </div>
      <div role="rowgroup">
        {flights.map((flight) => (
          <div key={flight.id} className={`${styles.row} ${styles[flight.statusTone]}`} role="row">
            <span className={styles.flightNumber} role="cell">{flight.number}</span>
            <span className={styles.airline} role="cell">{flight.airline}</span>
            <span className={styles.destination} role="cell">
              <span className={styles.destinationName}>{flight.destination}</span>
              <span className={styles.destinationCode}>{flight.destinationCode}</span>
            </span>
            <BoardCell label="예정 시간" className={styles.time}>{formatKoreanTime(flight.scheduledAt)}</BoardCell>
            <BoardCell label="변경 시간" className={flight.revisedAt ? styles.changedTime : styles.time}>{formatKoreanTime(flight.revisedAt)}</BoardCell>
            <BoardCell label="터미널" className={styles.compact}>{flight.terminal}</BoardCell>
            <BoardCell label="게이트" className={styles.compact}>{flight.gate}</BoardCell>
            <span className={styles.status} role="cell">{flight.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardCell({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <span className={`${styles.cell} ${className}`} role="cell">
      <span className={styles.mobileLabel}>{label}</span>
      {children}
    </span>
  );
}

function BoardState({ result }: { result: Exclude<DepartureBoardResult, { state: "ready" }> }) {
  const messages = {
    empty: {
      title: "표시할 일본행 출발편이 없습니다",
      description: "현재 조회 구간에 운항 예정인 항공편이 없습니다. 잠시 뒤 다시 확인해 주세요.",
    },
    "missing-key": {
      title: "항공편 정보를 준비하고 있습니다",
      description: "AeroDataBox API 설정을 확인한 뒤 다시 시도해 주세요. 다른 메뉴는 정상적으로 이용할 수 있습니다.",
    },
    "rate-limit": {
      title: "잠시 후 다시 확인해 주세요",
      description: "AeroDataBox 호출 한도에 도달했습니다. 한도가 갱신되면 출발편 정보가 자동으로 다시 제공됩니다.",
    },
    authentication: {
      title: "AeroDataBox 인증을 확인해 주세요",
      description: "등록된 API 키가 RapidAPI의 AeroDataBox 구독과 연결되어 있는지 확인이 필요합니다. 키 값은 브라우저에 노출되지 않았습니다.",
    },
    "bad-request": {
      title: "항공편 조회 요청이 거절되었습니다",
      description: "AeroDataBox에서 현재 조회 형식을 처리하지 못했습니다. 서버 로그의 응답 코드를 확인해 주세요.",
    },
    unavailable: {
      title: "출발편 정보를 불러오지 못했습니다",
      description: "AeroDataBox 연결이 원활하지 않습니다. 잠시 뒤 페이지를 새로고침해 주세요.",
    },
  } as const;
  const message = messages[result.state];

  return (
    <div className={styles.emptyState} role="status">
      <div>
        <span className={styles.emptyIcon}>
          {result.state === "empty" ? <PlaneTakeoff size={24} aria-hidden="true" /> : <AlertTriangle size={23} aria-hidden="true" />}
        </span>
        <p className={styles.emptyTitle}>{message.title}</p>
        <p className={styles.emptyDescription}>{message.description}</p>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: "delayed" | "boarding" | "departed" | "canceled"; label: string }) {
  return (
    <span className={`${styles.legendItem} ${styles[tone]}`}>
      <span className={styles.legendDot} aria-hidden="true" />
      {label}
    </span>
  );
}

function formatKoreanTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatKoreanDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
