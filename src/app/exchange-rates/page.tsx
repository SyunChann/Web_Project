import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Banknote } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ExchangeRateExplorer } from "@/components/exchange/ExchangeRateExplorer";
import { getExchangeRateSnapshot } from "@/data/exchangeRates";

export const metadata: Metadata = {
  title: "환율 안내 | 취향보관소",
  description: "한국수출입은행의 통화별 고시 환율과 최근 추이를 확인하고 원화와 외화를 계산해 보세요.",
  alternates: { canonical: "/exchange-rates" },
};

export default function ExchangeRatesPage() {
  return <main className="min-h-screen"><section className="mx-auto w-full max-w-6xl">
    <AppNav active="exchange-rates" />
    <header className="py-4 sm:py-12">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={15} />홈으로</Link>
      <p className="mt-2 flex sm:mt-5 items-center gap-2 text-xs font-bold tracking-widest text-teal-700 dark:text-teal-300"><Banknote size={17} />EXCHANGE RATES</p>
      <h1 className="mt-2 text-2xl sm:mt-3 font-black tracking-tight sm:text-5xl">여행 전, 환율부터.</h1>
      <p className="mt-2 text-sm leading-6 sm:mt-4 sm:leading-7 text-[var(--muted)] sm:text-base">통화별 환율과 최근 흐름을 한눈에. 필요한 금액도 바로 계산해 보세요.</p>
    </header>
    <Suspense fallback={<div role="status" aria-live="polite" className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-8"><p className="text-sm text-[var(--muted)]">고시 환율을 불러오는 중입니다.</p><div className="mt-3 h-28 sm:mt-5 sm:h-48 animate-pulse rounded-xl bg-[var(--surface-muted)] motion-reduce:animate-none" /></div>}>
      <ExchangeRatesContent />
    </Suspense>
  </section></main>;
}

async function ExchangeRatesContent() {
  const snapshot = await getExchangeRateSnapshot();
  if (!snapshot) return <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-8 text-center" aria-labelledby="exchange-unavailable">
    <h2 id="exchange-unavailable" className="text-lg font-black">환율 정보를 불러오지 못했습니다</h2>
    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">잠시 후 다시 시도해 주세요. 확인되지 않은 환율로 계산하지 않습니다.</p>
    <a href="/exchange-rates" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-5 text-sm font-bold">다시 확인</a>
  </section>;
  return <ExchangeRateExplorer snapshot={snapshot} />;
}
