import {
  ArrowUpRight,
  BadgePercent,
  Clock3,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import {
  getTossSharelinkContent,
  type TossSharelinkProduct,
} from "@/lib/tossSharelink";

export const metadata: Metadata = {
  title: "토스쇼핑 베스트 | 취향보관소",
  description: "토스쇼핑에서 지금 많이 팔리는 베스트셀러 20개를 확인합니다.",
};

export const revalidate = 3600;

export default async function RecommendationsPage() {
  const sharelink = await getTossSharelinkContent();
  const products = sharelink.status === "ready" ? sharelink.products : [];
  const podiumProducts = products.slice(0, 3);
  const rankedProducts = products.slice(3);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" showAuth={false} />

        <header className="mt-8 overflow-hidden rounded-3xl border border-[#eadfd6] bg-[linear-gradient(135deg,#fff9f4_0%,#fff_48%,#f8faf8_100%)] px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <ContentSectionTabs active="recommendations" />
          <div className="mt-7 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-black tracking-[0.14em] text-[#be4b49]">
                <TrendingUp size={17} /> TOSS SHOPPING BEST
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[#17202a] sm:text-5xl">
                베스트셀러 TOP 20
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#52616b] sm:text-lg">
                토스쇼핑에서 지금 많이 팔리는 상품을 순위대로 모았습니다. 상품명과 가격을
                비교하고, 관심 있는 상품은 토스에서 자세히 확인해 보세요.
              </p>
            </div>

            <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
              <Stat icon={<ShoppingBag size={16} />} value={String(products.length || 20)} label="상품" />
              <Stat icon={<Clock3 size={16} />} value="1시간" label="갱신" />
              <Stat icon={<ShieldCheck size={16} />} value="공식" label="API" />
            </dl>
          </div>
        </header>

        <aside className="mt-5 rounded-2xl border border-[#f0d4cf] bg-[#fff7f5] px-5 py-4 text-sm font-semibold leading-6 text-[#7f3c3a] sm:px-6">
          <span className="mr-2 inline-flex rounded-md bg-[#be4b49] px-2 py-0.5 text-xs font-black text-white">
            광고
          </span>
          이 콘텐츠는 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정
          수수료를 지급받습니다.
        </aside>

        {products.length > 0 ? (
          <>
            <section className="mt-9" aria-labelledby="top-three-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-[#be4b49]">TOP RANKING</p>
                  <h2 id="top-three-title" className="mt-1 text-2xl font-black text-[#17202a]">
                    가장 많이 팔리는 상품
                  </h2>
                </div>
                <p className="hidden text-sm font-semibold text-[#64748b] sm:block">현재 순위 1~3위</p>
              </div>

              <ol className="mt-5 grid gap-5 lg:grid-cols-3">
                {podiumProducts.map((product) => (
                  <TopProductCard key={product.tacaItemId} product={product} />
                ))}
              </ol>
            </section>

            {rankedProducts.length > 0 ? (
              <section className="mt-11" aria-labelledby="ranked-list-title">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-[#be4b49]">MORE BEST</p>
                    <h2 id="ranked-list-title" className="mt-1 text-2xl font-black text-[#17202a]">
                      이어지는 베스트 상품
                    </h2>
                  </div>
                  <p className="hidden text-sm font-semibold text-[#64748b] sm:block">현재 순위 4~20위</p>
                </div>

                <ol className="mt-5 grid gap-3 lg:grid-cols-2">
                  {rankedProducts.map((product) => (
                    <RankedProductRow key={product.tacaItemId} product={product} />
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-[#d8cfc2] bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto text-[#be4b49]" size={38} />
            <h2 className="mt-4 text-xl font-black text-[#17202a]">
              베스트셀러를 불러오지 못했습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">잠시 후 다시 확인해 주세요.</p>
          </div>
        )}

        <div className="mt-8 grid gap-3 text-sm font-semibold leading-6 text-[#52616b] sm:grid-cols-2">
          <p className="flex items-start gap-2 rounded-xl border border-[#e5e7eb] bg-white p-4">
            <Clock3 size={16} className="mt-1 shrink-0 text-[#be4b49]" />
            순위는 토스쇼핑 베스트셀러 API 기준으로 한 시간마다 갱신됩니다.
          </p>
          <p className="flex items-start gap-2 rounded-xl border border-[#e5e7eb] bg-white p-4">
            <ExternalLink size={16} className="mt-1 shrink-0 text-[#be4b49]" />
            가격·재고·할인 조건은 이동한 토스쇼핑 상품 화면에서 최종 확인해 주세요.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-white bg-white/80 px-3 py-3 shadow-sm">
      <div className="flex items-center justify-center gap-1.5 text-sm font-black text-[#17202a]">
        <span className="text-[#be4b49]">{icon}</span>
        {value}
      </div>
      <dt className="sr-only">{label}</dt>
      <dd className="mt-1 text-[11px] font-bold text-[#64748b]">{label}</dd>
    </div>
  );
}

function TopProductCard({ product }: { product: TossSharelinkProduct }) {
  return (
    <li className="relative flex min-h-80 flex-col overflow-hidden rounded-2xl border border-[#eadfd6] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -right-4 -top-8 text-[8rem] font-black leading-none text-[#f7ece8]" aria-hidden="true">
        {product.rank}
      </div>
      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-[#be4b49] px-3 text-lg font-black text-white shadow-sm">
          {product.rank}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-[#fff6df] px-2.5 py-1 text-xs font-black text-[#956b13]">
          <Sparkles size={13} /> 베스트
        </span>
      </div>

      <div className="relative mt-8 flex-1">
        <h3 className="line-clamp-3 text-xl font-black leading-7 text-[#17202a]">
          {product.displayName}
        </h3>
        <Price product={product} featured />
        <Review product={product} />
      </div>

      <ProductAction product={product} />
    </li>
  );
}

function RankedProductRow({ product }: { product: TossSharelinkProduct }) {
  return (
    <li className="group flex items-center gap-4 rounded-2xl border border-[#e8e4de] bg-white p-4 shadow-sm transition hover:border-[#dfbbb5] hover:shadow-md sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8f5f2] text-lg font-black text-[#8f3735]">
        {product.rank}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-black leading-6 text-[#17202a]">{product.displayName}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-lg font-black text-[#be4b49]">
            {product.displayPrice.toLocaleString("ko-KR")}원
          </span>
          {product.discountRate && product.discountRate > 0 ? (
            <span className="flex items-center gap-1 text-xs font-black text-[#d05b45]">
              <BadgePercent size={13} /> {product.discountRate}%
            </span>
          ) : null}
          {product.reviewScore ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#64748b]">
              <Star size={12} className="fill-[#e8b44f] text-[#e8b44f]" /> {product.reviewScore.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>

      {product.isSoldOut ? (
        <span className="shrink-0 rounded-lg bg-[#ece7e4] px-3 py-2 text-xs font-black text-[#64748b]">
          품절
        </span>
      ) : (
        <a
          href={product.shareUrl}
          target="_blank"
          rel="sponsored noreferrer"
          aria-label={`${product.displayName} 토스에서 보기`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0ed] text-[#be4b49] transition group-hover:bg-[#be4b49] group-hover:text-white"
        >
          <ArrowUpRight size={18} />
        </a>
      )}
    </li>
  );
}

function Price({ product, featured = false }: { product: TossSharelinkProduct; featured?: boolean }) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline gap-2">
        {product.discountRate && product.discountRate > 0 ? (
          <span className="text-sm font-black text-[#d05b45]">{product.discountRate}%</span>
        ) : null}
        <span className={featured ? "text-2xl font-black text-[#be4b49]" : "font-black text-[#be4b49]"}>
          {product.displayPrice.toLocaleString("ko-KR")}원
        </span>
      </div>
      {product.originalPrice && product.originalPrice > product.displayPrice ? (
        <p className="mt-1 text-sm font-semibold text-[#94a3b8] line-through">
          {product.originalPrice.toLocaleString("ko-KR")}원
        </p>
      ) : null}
    </div>
  );
}

function Review({ product }: { product: TossSharelinkProduct }) {
  if (!product.reviewScore) return null;

  return (
    <p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#64748b]">
      <Star size={14} className="fill-[#e8b44f] text-[#e8b44f]" />
      {product.reviewScore.toFixed(1)}
      {product.reviewCount ? <span>리뷰 {product.reviewCount.toLocaleString("ko-KR")}개</span> : null}
    </p>
  );
}

function ProductAction({ product }: { product: TossSharelinkProduct }) {
  if (product.isSoldOut) {
    return (
      <span className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#ece7e4] px-4 py-3 text-sm font-black text-[#64748b]">
        현재 품절
      </span>
    );
  }

  return (
    <a
      href={product.shareUrl}
      target="_blank"
      rel="sponsored noreferrer"
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#be4b49] px-4 py-3 text-sm font-black text-white transition hover:bg-[#a83f3d]"
    >
      토스에서 상품 보기 <ArrowUpRight size={16} />
    </a>
  );
}
