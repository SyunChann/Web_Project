"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, Search } from "lucide-react";
import { convertCurrency, type ExchangeRate, type ExchangeRateSnapshot } from "@/lib/exchangeRateModel";

const number = (value: number, decimals = 2) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
const shortDate = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;

export function ExchangeRateExplorer({ snapshot }: { snapshot: ExchangeRateSnapshot }) {
  const [selected, setSelected] = useState(snapshot.rates[0].code);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"to-krw" | "from-krw">("to-krw");
  const [amount, setAmount] = useState("10000");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const rate = snapshot.rates.find((item) => item.code === selected) ?? snapshot.rates[0];
  const filtered = snapshot.rates.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const result = convertCurrency(amount, rate, direction);
  const foreign = direction === "to-krw";

  return (
    <div className="space-y-4 pb-4 sm:space-y-7 sm:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-[var(--muted)] sm:gap-2 sm:text-sm">
        <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-300" />{snapshot.sourceLabel}</p>
        <p className="tabular-nums"><time dateTime={snapshot.date}>{snapshot.date.replaceAll("-", ". ")}</time> 고시 · {snapshot.rates.length}개 통화</p>
      </div>
      {snapshot.source === "frankfurter" ? (
        <p role="status" className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">한국수출입은행 자료를 사용할 수 없어 ECB 기준 원화 환산값을 표시합니다. 제공 통화와 고시일은 한국수출입은행과 다를 수 있습니다.</p>
      ) : null}

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="currency-heading" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:rounded-2xl sm:p-7">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 sm:gap-4">
            <div>
              <p className="hidden text-xs font-bold tracking-widest text-[var(--muted)] sm:block">CURRENCY TREND</p>
              <h2 id="currency-heading" className="text-base font-black sm:mt-2 sm:text-xl">{rate.name} <span className="ml-1 text-xs font-semibold text-[var(--muted)] sm:text-sm">{rate.code}</span></h2>
            </div>
            <label className="row-span-2 grid gap-1 text-xs font-bold text-[var(--muted)] sm:row-span-1">통화 선택
              <select value={rate.code} onChange={(event) => setSelected(event.target.value)} className="min-h-11 w-36 max-w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-base text-[var(--foreground)] sm:w-auto sm:max-w-52 sm:px-3 sm:text-sm">
                {snapshot.rates.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
              </select>
            </label>
            <div className="col-start-1 row-start-2 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1 sm:col-span-2 sm:mt-2 sm:gap-x-4 sm:gap-y-2">
              <p className="break-words text-xl font-black tabular-nums tracking-tight sm:text-4xl">{number(rate.value)}<span className="ml-1 text-sm font-bold text-[var(--muted)] sm:text-base">원</span></p>
              <Change value={rate.changePercent} />
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)] sm:mt-2 sm:text-sm">{rate.unit.toLocaleString("ko-KR")} {rate.code} 기준 · 최근 {rate.points.length}회 고시</p>
          <RateChart rate={rate} />
        </section>

        <section aria-labelledby="calculator-heading" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:rounded-2xl sm:p-7">
          <p className="hidden text-xs font-bold tracking-widest text-[var(--muted)] lg:block">QUICK CONVERTER</p>
          <div className="flex items-center justify-between gap-2 lg:mt-2">
            <h2 id="calculator-heading" className="text-base font-black sm:text-xl">얼마를 환전할까요?</h2>
            <button type="button" aria-expanded={calculatorOpen} aria-controls="exchange-calculator" onClick={() => setCalculatorOpen(!calculatorOpen)} className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold lg:hidden">{calculatorOpen ? "접기" : "계산기 열기"}</button>
          </div>
          <div id="exchange-calculator" className={calculatorOpen ? "block" : "hidden lg:block"}>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-muted)] p-2 sm:mt-5 sm:p-3">
              <span className="text-sm font-bold">{foreign ? rate.code : "KRW"} <span className="mx-2 text-[var(--muted)]">→</span> {foreign ? "KRW" : rate.code}</span>
              <button type="button" onClick={() => setDirection(foreign ? "from-krw" : "to-krw")} className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold" aria-label="환산 방향 바꾸기"><ArrowRightLeft size={16} />바꾸기</button>
            </div>
            <label htmlFor="exchange-amount" className="mt-3 block text-sm font-bold sm:mt-5">{foreign ? rate.name : "대한민국 원"} 금액 ({foreign ? rate.code : "KRW"})</label>
            <input id="exchange-amount" type="text" inputMode="decimal" autoComplete="off" value={amount} maxLength={20}
              onChange={(event) => setAmount(event.target.value.replaceAll(",", ""))} aria-describedby="amount-help" aria-invalid={amount !== "" && result === null}
              className="mt-2 min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base font-bold tabular-nums sm:min-h-12 sm:px-4 sm:text-xl" />
            <p id="amount-help" className="mt-2 text-xs leading-5 text-[var(--muted)]">0 이상의 숫자 · 정수 12자리, 소수 6자리까지 입력할 수 있습니다.</p>
            <div className="mt-3 rounded-xl bg-teal-50 p-3 text-teal-950 sm:mt-5 sm:p-4 dark:bg-teal-950/50 dark:text-teal-100" aria-live="polite" aria-atomic="true">
              <p className="text-sm font-bold">예상 환산 금액</p>
              <output htmlFor="exchange-amount" className="mt-1 block break-words text-xl font-black tabular-nums sm:mt-2 sm:text-2xl" data-testid="conversion-result">{result === null ? "금액을 확인해 주세요" : `${number(result)} ${foreign ? "원" : rate.code}`}</output>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)] sm:mt-4 sm:leading-6">매매기준율로 계산한 참고 금액입니다. 은행 수수료·환율 우대는 반영하지 않으며 실제 환전 금액과 다를 수 있습니다.</p>
          </div>
        </section>
      </div>

      <section aria-labelledby="all-rates-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:gap-3">
          <div><h2 id="all-rates-heading" className="text-base font-black sm:text-xl">전체 환율</h2><p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">통화를 누르면 그래프와 계산기에 반영됩니다.</p></div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 sm:w-64">
            <Search size={16} className="shrink-0 text-[var(--muted)]" /><input aria-label="통화 검색" placeholder="통화명 또는 코드 검색" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none sm:text-sm" />
          </label>
        </div>
        <div className="overflow-hidden rounded-xl border sm:rounded-2xl border-[var(--line)] bg-[var(--surface)]">
          <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-1 sm:gap-2 border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] sm:py-3 sm:text-xs font-bold text-[var(--muted)] sm:grid-cols-[1fr_8rem_8rem] sm:px-6"><span>통화 / 기준 단위</span><span className="text-right">원화 환율</span><span className="text-right">이전 고시 대비</span></div>
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((item) => <li key={item.code}>
              <button type="button" onClick={() => setSelected(item.code)} aria-pressed={rate.code === item.code} aria-label={`${item.name} ${item.code} 선택`}
                className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] items-center gap-1 px-3 py-2 sm:min-h-20 sm:gap-2 sm:py-3 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 sm:grid-cols-[1fr_8rem_8rem] sm:px-6 ${rate.code === item.code ? "bg-teal-50 dark:bg-teal-950/40" : ""}`}>
                <span className="min-w-0"><span className="block text-xs font-black sm:text-sm">{item.name}</span><span className="mt-0.5 block text-[11px] text-[var(--muted)] sm:mt-1 sm:text-xs">{item.code} · {item.unit.toLocaleString("ko-KR")}단위</span></span>
                <span className="whitespace-nowrap text-right text-xs font-black tabular-nums sm:text-base">{number(item.value)}<span className="ml-0.5 text-xs font-normal text-[var(--muted)]">원</span></span>
                <span className="flex justify-end"><Change value={item.changePercent} /></span>
              </button>
            </li>)}
          </ul>
          {!filtered.length ? <p role="status" className="p-8 text-center text-sm text-[var(--muted)]">검색한 통화가 없습니다.</p> : null}
        </div>
      </section>
      <p className="text-xs leading-6 text-[var(--muted)]">실시간 거래 시세가 아닌 고시 자료입니다. 휴일·고시 전에는 최근 제공일의 자료를 표시합니다. 그래프는 최근 조회 가능한 고시 최대 7회이며, 변동률은 직전 조회 가능한 고시와 비교합니다. 통화별 1단위·100단위 기준을 확인해 주세요.</p>
    </div>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-[var(--muted)]">비교 자료 없음</span>;
  return <span className={`inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-bold tabular-nums ${value > 0 ? "text-red-700 dark:text-red-300" : value < 0 ? "text-teal-700 dark:text-teal-300" : "text-[var(--muted)]"}`}>
    {value > 0 ? <ArrowUpRight size={14} /> : value < 0 ? <ArrowDownRight size={14} /> : null}{value > 0 ? "+" : ""}{number(value)}%
  </span>;
}

function RateChart({ rate }: { rate: ExchangeRate }) {
  const values = rate.points.map((point) => point.value);
  const min = Math.min(...values), max = Math.max(...values), range = max - min;
  const coordinates = rate.points.map((point, index) => ({ x: values.length === 1 ? 300 : 20 + index * 560 / (values.length - 1), y: range === 0 ? 85 : 145 - ((point.value - min) / range) * 120, point }));
  const color = (rate.changePercent ?? 0) > 0 ? "text-red-600 dark:text-red-300" : "text-teal-700 dark:text-teal-300";
  return <div className={`mt-3 sm:mt-7 ${color}`}>
    <svg viewBox="0 0 600 180" className="h-auto w-full" role="img" aria-label={`${rate.name} 최근 ${rate.points.length}회 고시 환율 추이`}>
      <title>{rate.points.map((point) => `${point.date}: ${number(point.value)}원`).join(", ")}</title>
      {[25, 85, 145].map((y) => <path key={y} d={`M 20 ${y} H 580`} stroke="var(--line)" strokeDasharray="3 5" />)}
      <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {coordinates.map(({ x, y, point }) => <circle key={point.date} cx={x} cy={y} r={4} fill="var(--surface)" stroke="currentColor" strokeWidth={2}><title>{`${point.date} · ${number(point.value)}원`}</title></circle>)}
    </svg>
    <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11px] text-[var(--muted)] sm:text-xs"><span>{shortDate(rate.points[0].date)}</span><span>최저 {number(min)}원 · 최고 {number(max)}원</span><span>{shortDate(rate.points.at(-1)!.date)}</span></div>
  </div>;
}
