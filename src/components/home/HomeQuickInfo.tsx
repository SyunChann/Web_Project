import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, Bookmark, PlaneTakeoff } from "lucide-react";
import { getExchangeRateSnapshot } from "@/data/exchangeRates";
import styles from "./Home.module.css";

export async function HomeExchangeRates() {
  const snapshot = await getExchangeRateSnapshot();
  return <section className={styles.utilitySection} aria-labelledby="home-rates-title"><h2 id="home-rates-title"><ArrowLeftRight size={16} aria-hidden="true" />오늘의 환율</h2>
    {snapshot ? <><dl className={styles.rates}>{snapshot.rates.filter((rate) => rate.code === "JPY" || rate.code === "USD").map((rate) => <div key={rate.code}><dt>{rate.unit} {rate.code}</dt><dd>{new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate.value)}<span> 원</span></dd></div>)}</dl><p className={styles.utilityNote}>{snapshot.sourceLabel}<br />{snapshot.date} 기준</p></>
      : <p className={styles.utilityNote}>현재 조회가 지연되고 있습니다.</p>}
    <Link prefetch={false} href="/exchange-rates" className={styles.utilityLink}>전체 환율 · 계산기<ArrowUpRight size={14} aria-hidden="true" /></Link>
  </section>;
}
export function HomeRatesSkeleton() {
  return <section className={styles.utilitySection} aria-busy="true" aria-label="환율 확인 중"><h2><ArrowLeftRight size={16} aria-hidden="true" />오늘의 환율</h2><p className={styles.utilityNote}>환율을 확인하고 있습니다.</p></section>;
}
export function HomeAirportInfo() {
  return <section className={styles.utilitySection} aria-labelledby="home-airport-title"><h2 id="home-airport-title"><PlaneTakeoff size={17} aria-hidden="true" />인천공항</h2><p className={styles.airportIntro}>출국장 대기부터 항공편까지.</p><Link prefetch={false} href="/departures" className={styles.utilityLink}>T1 · T2 출국장 혼잡도<ArrowUpRight size={14} aria-hidden="true" /></Link><Link prefetch={false} href="/departures" className={styles.utilityLink}>일본행 항공편<ArrowUpRight size={14} aria-hidden="true" /></Link></section>;
}
export function HomeEditorPick() {
  return <section className={styles.utilitySection} aria-labelledby="home-editor-title"><h2 id="home-editor-title"><Bookmark size={16} aria-hidden="true" />에디터 픽</h2><p className={styles.utilityNote}>직접 고르고 살펴본 추천 상품.</p><Link prefetch={false} href="/recommendations" className={styles.utilityLink}>추천 글 보기<ArrowUpRight size={14} aria-hidden="true" /></Link></section>;
}
