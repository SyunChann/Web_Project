import { ArrowRight, ArrowUpRight, Check, CircleDollarSign, Clock3, FileText, ImageIcon, MousePointerClick, ShoppingBag, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { featuredSharelinkPost } from "@/data/sharelink";
import { getTossSharelinkContent } from "@/lib/tossSharelink";

export const metadata: Metadata = {
  title: "추천 콘텐츠 | 취향보관소",
  description: "직접 검토하고 고른 상품을 한 편의 게시글로 소개합니다.",
};

export const revalidate = 3600;

export default async function RecommendationsPage() {
  const sharelink = await getTossSharelinkContent();
  const product = sharelink.status === "ready" ? sharelink.product : null;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" showAuth={false} />
        <header className="py-10">
          <ContentSectionTabs active="recommendations" />
          <p className="flex items-center gap-2 text-sm font-black tracking-wide text-[#be4b49]"><Sparkles size={16} /> CURATED STORY</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#17202a] sm:text-5xl">추천 콘텐츠</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">상품을 검색하거나 가격순으로 나열하지 않습니다. 직접 정한 기준과 사용 장면을 담은 게시글 안에서 한 가지 상품을 소개합니다.</p>
        </header>

        <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#efd5d1] bg-white shadow-sm">
          <div className="border-b border-[#efd5d1] bg-[#fff7f5] px-6 py-4 text-sm font-bold leading-6 text-[#8f3735] sm:px-8">
            <span className="mr-2 inline-flex rounded bg-[#be4b49] px-2 py-0.5 text-xs text-white">광고</span>
            이 콘텐츠는 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정 수수료를 지급받습니다.
          </div>

          <div className="p-6 sm:p-10">
            <p className="text-sm font-black tracking-wider text-[#be4b49]">{featuredSharelinkPost.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#17202a]">{featuredSharelinkPost.title}</h2>
            <p className="mt-4 text-lg leading-8 text-[#52616b]">{featuredSharelinkPost.summary}</p>

            <div className="mt-8 space-y-5 text-base leading-8 text-[#35424d]">
              {featuredSharelinkPost.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>

            <section className="mt-8 rounded-xl bg-[#f8faf8] p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-black text-[#17202a]"><Check size={18} className="text-[#be4b49]" /> 고를 때 확인한 기준</h3>
              <ul className="mt-4 grid gap-3 text-sm font-semibold text-[#52616b]">
                {featuredSharelinkPost.checklist.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#be4b49]" />{item}</li>)}
              </ul>
            </section>

            <section className="mt-8 overflow-hidden rounded-xl border border-[#efd5d1] bg-white shadow-sm" aria-label="토스쇼핑 추천 상품 노출 영역">
              <div className="grid sm:grid-cols-[13rem_minmax(0,1fr)]">
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 bg-[#f8f5f2] p-6 text-center text-[#8f3735]">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm"><ShoppingBag size={30} /></span>
                  <p className="flex items-center gap-1.5 text-xs font-black"><ImageIcon size={14} /> 토스쇼핑 상품 이미지 영역</p>
                </div>

                <div className="flex min-w-0 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <span className="inline-flex rounded-full bg-[#fff0ed] px-3 py-1 text-xs font-black text-[#be4b49]">
                      {product ? "오늘의 한 가지" : "심사용 노출 시안"}
                    </span>
                    <h3 className="mt-3 text-xl font-black leading-snug text-[#17202a]">
                      {product?.displayName ?? "데일리 보온 텀블러 500ml"}
                    </h3>
                    <p className="mt-2 text-2xl font-black text-[#be4b49]">
                      {product ? `${product.displayPrice.toLocaleString("ko-KR")}원` : "29,900원 (예시)"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">
                      {product
                        ? "토스쇼핑 Open API에서 받은 상품명과 현재 가격을 표시합니다."
                        : "승인 후 이 자리에 Open API로 조회한 실제 상품명과 가격이 표시됩니다."}
                    </p>
                  </div>

                  <div className="mt-5">
                    {product && !product.isSoldOut ? (
                      <a href={product.shareUrl} target="_blank" rel="sponsored noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#be4b49] px-5 py-3 text-sm font-black text-white transition hover:bg-[#a83f3d] sm:w-auto">
                        토스에서 상품 보기 <ArrowUpRight size={16} />
                      </a>
                    ) : product?.isSoldOut ? (
                      <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-[#ece7e4] px-5 py-3 text-sm font-black text-[#64748b] sm:w-auto">현재 품절</span>
                    ) : (
                      <span aria-disabled="true" className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#be4b49] px-5 py-3 text-sm font-black text-white opacity-80 sm:w-auto">
                        토스에서 상품 보기 <ArrowUpRight size={16} />
                      </span>
                    )}
                    <p className="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-[#64748b]">
                      <Clock3 size={14} className="mt-0.5 shrink-0" />
                      {product ? "가격과 판매 상태는 게시 시점에 다시 확인합니다." : "현재는 승인 전 화면 시안이며 버튼은 동작하지 않습니다. 승인 후 발급된 쉐어링크가 새 창에서 열립니다."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </article>

        <section className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          <InfoCard icon={<FileText size={18} />} title="게시글 중심" text="상품 DB, 검색, 카테고리 탐색, 가격 비교 기능 없이 직접 작성한 추천 글 안에서만 상품을 소개합니다." />
          <InfoCard icon={<CircleDollarSign size={18} />} title="명확한 제휴 표시" text="수수료 지급 사실을 상품 소개와 구매 링크보다 먼저, 접지 않고 바로 보이는 위치에 표시합니다." />
        </section>

        <section className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#d8cfc2] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="sharelink-flow-title">
          <p className="text-sm font-black tracking-wide text-[#be4b49]">노출 및 이동 방식</p>
          <h2 id="sharelink-flow-title" className="mt-2 text-2xl font-black text-[#17202a]">쉐어링크는 이 경로에서만 사용합니다</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            <FlowStep icon={<Sparkles size={18} />} number="1" title="홈에서 진입" text="홈 화면의 추천 콘텐츠 카드를 선택합니다." />
            <FlowStep icon={<FileText size={18} />} number="2" title="추천 글 확인" text="광고 안내와 직접 작성한 추천 내용을 먼저 읽습니다." />
            <FlowStep icon={<MousePointerClick size={18} />} number="3" title="토스로 이동" text="상품 보기 버튼을 누르면 발급된 쉐어링크가 새 창에서 열립니다." />
          </ol>
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-[#f8faf8] p-4 text-sm font-semibold leading-6 text-[#52616b]">
            <ArrowRight size={17} className="mt-1 shrink-0 text-[#be4b49]" />
            한 게시글에서 한 가지 상품만 소개하며, 상품 검색·목록·가격 비교 화면에는 쉐어링크를 노출하지 않습니다.
          </p>
        </section>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-[#efd5d1] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black text-[#17202a]"><span className="text-[#be4b49]">{icon}</span>{title}</h2><p className="mt-2 text-sm leading-6 text-[#52616b]">{text}</p></div>;
}

function FlowStep({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return (
    <li className="rounded-xl border border-[#eee8df] bg-[#fffdfa] p-4">
      <div className="flex items-center gap-2 text-[#be4b49]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff0ed] text-xs font-black">{number}</span>{icon}</div>
      <h3 className="mt-3 font-black text-[#17202a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{text}</p>
    </li>
  );
}
