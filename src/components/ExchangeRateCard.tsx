import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getExchangeRateSnapshot, type ExchangeRatePoint } from "@/data/exchangeRates";

export async function ExchangeRateCard() {
  const snapshot = await getExchangeRateSnapshot();
  if (!snapshot) return <aside className="w-full shrink-0 sm:max-w-[19rem] sm:self-end" aria-label="환율 안내"><Link href="/exchange-rates" prefetch={false} className="block rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 focus-visible:outline-2 focus-visible:outline-teal-600"><p className="text-sm font-black">환율 안내 →</p><p className="mt-2 text-xs text-[var(--muted)]">현재 조회가 지연되고 있습니다. 상세 페이지에서 다시 확인해 주세요.</p></Link></aside>;

  return (
    <aside className="w-full shrink-0 rounded-xl border border-[#ddd6cc] bg-white/90 px-3 py-3 shadow-sm backdrop-blur sm:max-w-[19rem] sm:self-end sm:px-4" aria-label="오늘의 환율">
      <Link href="/exchange-rates" prefetch={false} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600" aria-label="전체 환율과 환율 계산기 보기">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2f7f7a] shadow-[0_0_0_3px_#e3f3f1]" />
          <p className="text-sm font-black text-[#52616b] sm:text-xs">오늘의 환율</p>
        </div>
        <p className="text-right text-xs font-semibold leading-4 text-[#706a63] sm:text-[10px]">
          {snapshot.sourceLabel}<br />{formatSnapshotDate(snapshot.date)} 기준
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 divide-x divide-[#eee8df] sm:mt-2 sm:block sm:divide-x-0 sm:divide-y">
        {snapshot.rates.filter((rate) => rate.code === "JPY" || rate.code === "USD").map((rate) => {
          const isUp = (rate.changePercent ?? 0) > 0;
          const isDown = (rate.changePercent ?? 0) < 0;

          return (
            <div key={rate.code} className="grid min-w-0 gap-1 px-2 py-1 sm:grid-cols-[3.2rem_1fr_4.5rem] sm:items-center sm:gap-2 sm:px-0 sm:py-2 sm:first:pt-1.5 sm:last:pb-0.5">
              <div>
                <p className="text-sm font-black text-[#17202a] sm:text-xs">{rate.code === "JPY" ? "일본 엔" : "미국 달러"}</p>
                <p className="text-xs font-bold text-[#706a63] sm:text-[10px]">{rate.symbol}{rate.unit} · {rate.code}</p>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black tabular-nums tracking-tight text-[#17202a] sm:truncate sm:text-sm sm:tracking-normal">
                  {formatWon(rate.value)}<span className="ml-0.5 text-[10px] font-bold text-[#8a95a1]">원</span>
                </p>
                <p className={`mt-0.5 flex items-center text-xs font-bold tabular-nums sm:text-[10px] ${isUp ? "text-[#be4b49]" : isDown ? "text-[#2f7f7a]" : "text-[#8a95a1]"}`}>
                  {isUp ? <ArrowUpRight size={11} /> : isDown ? <ArrowDownRight size={11} /> : null}
                  {rate.changePercent === null ? "비교 자료 없음" : `${Math.abs(rate.changePercent).toFixed(2)}%`}
                </p>
              </div>
              <div className="hidden sm:block"><Sparkline points={rate.points} isUp={isUp} /></div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-[#52616b] group-hover:underline">전체 환율 · 계산기<ArrowRight size={11} /></p>
      </Link>
    </aside>
  );
}

export function ExchangeRateCardSkeleton() {
  return <div className="h-40 w-full shrink-0 animate-pulse rounded-xl border border-[#eee8df] bg-white/60 sm:h-[8.6rem] sm:max-w-[19rem] sm:self-end" aria-hidden="true" />;
}

function Sparkline({ points, isUp }: { points: ExchangeRatePoint[]; isUp: boolean }) {
  const width = 72;
  const height = 28;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = isUp ? "#be4b49" : "#2f7f7a";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[4.5rem] overflow-visible" role="img" aria-label="최근 최대 7회 고시 환율 변동">
      <path d={`M 0 ${height - 3} H ${width}`} stroke="#eee8df" strokeWidth="1" strokeDasharray="2 3" />
      <polyline points={coordinates.join(" ")} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coordinates.length ? <circle cx={coordinates.at(-1)!.split(",")[0]} cy={coordinates.at(-1)!.split(",")[1]} r="2.5" fill="white" stroke={stroke} strokeWidth="2" /> : null}
    </svg>
  );
}

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSnapshotDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${Number(day)}`;
}
