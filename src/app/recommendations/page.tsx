import { ArrowUpRight, Clock3, ImageIcon, ShoppingBag, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { getTossSharelinkContent } from "@/lib/tossSharelink";

export const metadata: Metadata = {
  title: "토스쇼핑 베스트 | 취향보관소",
  description: "토스쇼핑에서 지금 많이 팔리는 베스트셀러 20개를 확인합니다.",
};

export const revalidate = 3600;

export default async function RecommendationsPage() {
  const sharelink = await getTossSharelinkContent();
  const products = sharelink.status === "ready" ? sharelink.products : [];

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" showAuth={false} />

        <header className="py-10">
          <ContentSectionTabs active="recommendations" />
          <p className="flex items-center gap-2 text-sm font-black tracking-wide text-[#be4b49]">
            <Sparkles size={16} /> TOSS SHOPPING BEST
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#17202a] sm:text-5xl">
            지금 많이 팔리는 상품 20
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            토스쇼핑 Open API의 베스트셀러 순위를 한 시간마다 갱신해 보여드립니다.
            가격과 판매 상태는 토스쇼핑에서 최종 확인해 주세요.
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-[#efd5d1] bg-[#fff7f5] px-6 py-4 text-sm font-bold leading-6 text-[#8f3735]">
          <span className="mr-2 inline-flex rounded bg-[#be4b49] px-2 py-0.5 text-xs text-white">
            광고
          </span>
          이 콘텐츠는 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정
          수수료를 지급받습니다.
        </div>

        {products.length > 0 ? (
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="토스쇼핑 베스트셀러 상위 20개">
            {products.map((product) => (
              <li
                key={product.tacaItemId}
                className="flex overflow-hidden rounded-2xl border border-[#efd5d1] bg-white shadow-sm"
              >
                <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-3 bg-[#f8f5f2] p-4 text-center text-[#8f3735]">
                  <span className="text-3xl font-black">{product.rank}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <ShoppingBag size={24} />
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold">
                    <ImageIcon size={12} /> 이미지 미사용
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="inline-flex rounded-full bg-[#fff0ed] px-2.5 py-1 text-xs font-black text-[#be4b49]">
                      베스트 {product.rank}위
                    </span>
                    <h2 className="mt-3 line-clamp-2 text-base font-black leading-6 text-[#17202a]">
                      {product.displayName}
                    </h2>
                    <p className="mt-2 text-xl font-black text-[#be4b49]">
                      {product.displayPrice.toLocaleString("ko-KR")}원
                    </p>
                    {product.discountRate && product.discountRate > 0 ? (
                      <p className="mt-1 text-xs font-bold text-[#64748b]">
                        {product.discountRate}% 할인
                        {product.originalPrice
                          ? ` · 정가 ${product.originalPrice.toLocaleString("ko-KR")}원`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    {product.isSoldOut ? (
                      <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-[#ece7e4] px-4 py-2.5 text-sm font-black text-[#64748b]">
                        현재 품절
                      </span>
                    ) : (
                      <a
                        href={product.shareUrl}
                        target="_blank"
                        rel="sponsored noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#be4b49] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#a83f3d]"
                      >
                        토스에서 상품 보기 <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8cfc2] bg-white p-10 text-center">
            <ShoppingBag className="mx-auto text-[#be4b49]" size={34} />
            <h2 className="mt-4 text-lg font-black text-[#17202a]">
              베스트셀러를 불러오지 못했습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              잠시 후 다시 확인해 주세요.
            </p>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2 rounded-xl bg-[#f8faf8] p-4 text-sm font-semibold leading-6 text-[#52616b]">
          <Clock3 size={16} className="mt-1 shrink-0 text-[#be4b49]" />
          순위는 토스쇼핑 베스트셀러 API 기준이며 실제 가격·재고·할인 조건은 이동한 상품
          화면에서 달라질 수 있습니다. 상품 이미지는 사용 범위 확인 전까지 노출하지 않습니다.
        </p>
      </section>
    </main>
  );
}
