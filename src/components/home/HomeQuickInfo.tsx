import Link from "next/link";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Bookmark, Minus, PlaneTakeoff } from "lucide-react";
import { getExchangeRateSnapshot } from "@/data/exchangeRates";
import type { ExchangeRateSnapshot } from "@/lib/exchangeRateModel";
import type { CongestionResult } from "@/lib/incheonCongestion";
import { getHomeAirportSnapshot } from "@/data/homeAirport";
import { homeAirportSummary, homeRateMovement } from "@/lib/homeOverview";
import { getHomeShopping, type HomeShopping } from "@/data/homeShopping";
import styles from "./Home.module.css";

export async function HomeExchangeRates() { return <HomeRatesCard snapshot={await getExchangeRateSnapshot()} />; }
export function HomeRatesCard({ snapshot }: { snapshot: ExchangeRateSnapshot | null }) {
  return <section className={`${styles.utilitySection} ${styles.ratesCard}`} aria-labelledby="home-rates-title"><h2 id="home-rates-title"><Link href="/exchange-rates" prefetch={false} className={styles.utilityTitleLink}><ArrowLeftRight size={16} aria-hidden="true" /><span>오늘의 환율</span><ArrowUpRight size={14} className={styles.utilityTitleArrow} aria-hidden="true" /></Link></h2>
    {snapshot ? <><dl className={styles.rates}>{snapshot.rates.filter((rate) => rate.code === "JPY" || rate.code === "USD").map((rate) => {
      const movement = homeRateMovement(rate);
      const Icon = movement.direction === "up" ? ArrowUpRight : movement.direction === "down" ? ArrowDownRight : Minus;
      return <div key={rate.code}><dt>{rate.unit} {rate.code}</dt><dd>{new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate.value)}<span> 원</span></dd>
        <dd className={styles.rateMovement} data-direction={movement.direction}><span><Icon size={14} aria-hidden="true" />{movement.label}</span>{movement.difference !== null ? <small>{movement.difference}</small> : null}</dd>
      </div>;
    })}</dl><p className={`${styles.utilityNote} ${styles.rateNote}`} aria-label={`${snapshot.sourceLabel} ${snapshot.date} 기준, 직전 고시 대비`}><span className={styles.desktopNote}><span className={styles.rateSource}>{snapshot.sourceLabel}</span><span className={styles.rateDate}>{snapshot.date} 기준 · 직전 고시 대비</span></span><span className={styles.mobileNote}>{snapshot.date.slice(5).replace("-", ".")} · {snapshot.source === "koreaexim" ? "한국수출입은행" : snapshot.sourceLabel}<br/>직전 고시 대비</span></p></>
      : <p className={styles.utilityNote}>현재 조회가 지연되고 있습니다.</p>}
    <Link prefetch={false} href="/exchange-rates" className={styles.utilityLink}>전체 환율 · 계산기<ArrowUpRight size={16} aria-hidden="true" /></Link>
  </section>;
}
export function HomeRatesSkeleton() { return <InfoSkeleton kind="rates" />; }
export function HomeAirportSkeleton() { return <InfoSkeleton kind="airport" />; }
export function HomeEditorSkeleton() { return <InfoSkeleton kind="editor" />; }
function InfoSkeleton({ kind }: { kind: "rates" | "airport" | "editor" }) {
  const title = kind === "rates" ? "오늘의 환율" : kind === "airport" ? "인천공항" : "쇼핑 베스트";
  const Icon = kind === "rates" ? ArrowLeftRight : kind === "airport" ? PlaneTakeoff : Bookmark;
  return <section className={`${styles.utilitySection} ${kind === "rates" ? styles.ratesCard : kind === "airport" ? styles.airportCard : styles.shoppingCard}`} aria-busy="true" aria-label={`${title} 확인 중`}><h2><Icon size={17} aria-hidden="true" />{title}</h2><div className={styles.quickSkeleton} aria-hidden="true"><span /><span /><span /></div><p className={styles.utilityNote}>정보를 확인하고 있습니다.</p></section>;
}
export async function HomeAirportInfo() {
  const snapshot = await getHomeAirportSnapshot();
  return <HomeAirportCard {...snapshot} />;
}
export function HomeAirportCard({ terminals, now }: { terminals: (CongestionResult | undefined)[]; now: number }) {
  return <section className={`${styles.utilitySection} ${styles.airportCard}`} aria-labelledby="home-airport-title"><h2 id="home-airport-title"><Link href="/departures" prefetch={false} className={styles.utilityTitleLink}><PlaneTakeoff size={17} aria-hidden="true" /><span>인천공항</span><ArrowUpRight size={14} className={styles.utilityTitleArrow} aria-hidden="true" /></Link></h2>
    <dl className={styles.airportSummary}>{["T1", "T2"].map((terminal, index) => {
      const summary = homeAirportSummary(terminals[index], now);
      return <div key={terminal}><dt>{terminal}<small>{summary.detail}</small></dt><dd><strong className={summary.level ? styles.waitValue : styles.waitStatus}>{summary.value}</strong>{summary.level ? <span className={styles.congestionBadge} data-level={summary.level}>{summary.level}</span> : null}</dd></div>;
    })}</dl><p className={styles.utilityNote}>최신 수집값 · 안내 운영시간 내 최단 대기 기준</p>
    <Link prefetch={false} href="/departures" className={styles.utilityLink}>혼잡도 · 항공편 보기<ArrowUpRight size={16} aria-hidden="true" /></Link>
  </section>;
}
export async function HomeEditorPick() { return <HomeEditorCard result={await getHomeShopping()} />; }
export function HomeEditorCard({ result }: { result: HomeShopping }) {
  return <section className={`${styles.utilitySection} ${styles.shoppingCard}`} aria-labelledby="home-editor-title"><h2 id="home-editor-title"><Link href="/recommendations" prefetch={false} className={styles.utilityTitleLink}><Bookmark size={16} aria-hidden="true" /><span>쇼핑 베스트</span><ArrowUpRight size={14} className={styles.utilityTitleArrow} aria-hidden="true" /></Link></h2>
    {result.products.length ? <ol className={styles.productPreview}>{result.products.slice(0, 2).map((product) => <li key={product.id}><Link href="/recommendations" prefetch={false}><span className={styles.productRank}>{String(product.rank).padStart(2, "0")}</span><div><h3>{product.name}</h3><p>{new Intl.NumberFormat("ko-KR").format(product.price)}원</p></div><ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}</ol>
      : <div className={styles.shoppingFallback}><p className={styles.utilityNote}>{result.unavailable ? "인기 상품은 목록에서 다시 확인해 주세요." : "현재 표시할 인기 상품이 없습니다."}</p><Link href="/recommendations" prefetch={false}>전체 베스트</Link><Link href="/recommendations/fashion" prefetch={false}>패션 인기 상품</Link></div>}
    <p className={styles.utilityNote}>토스쇼핑 인기순 · 가격·재고는 상품 화면에서 확인</p><Link prefetch={false} href="/recommendations" className={styles.utilityLink}>전체 베스트 · 패션<ArrowUpRight size={16} aria-hidden="true" /></Link>
  </section>;
}
