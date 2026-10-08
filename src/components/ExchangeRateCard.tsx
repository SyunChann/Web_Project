import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getExchangeRateSnapshot, type ExchangeRatePoint } from "@/data/exchangeRates";

export async function ExchangeRateCard() {
  const snapshot = await getExchangeRateSnapshot();
  if (!snapshot) return null;

  return (
    <aside className="w-full max-w-[19rem] shrink-0 rounded-xl border border-[#ddd6cc] bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:self-end" aria-label="오늘의 환율">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2f7f7a] shadow-[0_0_0_3px_#e3f3f1]" />
          <p className="text-xs font-black tracking-[0.12em] text-[#52616b]">TODAY&apos;S RATE</p>
        </div>
        <p className="text-[10px] font-semibold text-[#9a938a]">{formatSnapshotDate(snapshot.date)} 기준</p>
      </div>

      <div className="mt-2 divide-y divide-[#eee8df]">
        {snapshot.rates.map((rate) => {
          const isUp = rate.changePercent > 0;
          const isDown = rate.changePercent < 0;

          return (
            <div key={rate.code} className="grid grid-cols-[3.2rem_1fr_4.5rem] items-center gap-2 py-2 first:pt-1.5 last:pb-0.5">
              <div>
                <p className="text-xs font-black text-[#17202a]">{rate.symbol}{rate.unit}</p>
                <p className="text-[10px] font-bold text-[#9a938a]">{rate.code}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black tabular-nums text-[#17202a]">
                  {formatWon(rate.value)}<span className="ml-0.5 text-[10px] font-bold text-[#8a95a1]">원</span>
                </p>
                <p className={`mt-0.5 flex items-center text-[10px] font-bold tabular-nums ${isUp ? "text-[#be4b49]" : isDown ? "text-[#2f7f7a]" : "text-[#8a95a1]"}`}>
                  {isUp ? <ArrowUpRight size={11} /> : isDown ? <ArrowDownRight size={11} /> : null}
                  {Math.abs(rate.changePercent).toFixed(2)}%
                </p>
              </div>
              <Sparkline points={rate.points} isUp={isUp} />
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function ExchangeRateCardSkeleton() {
  return <div className="h-[8.6rem] w-full max-w-[19rem] shrink-0 animate-pulse rounded-xl border border-[#eee8df] bg-white/60 sm:self-end" aria-hidden="true" />;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[4.5rem] overflow-visible" role="img" aria-label="최근 7일 환율 변동">
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
