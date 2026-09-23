import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { getPublishedSharelinkPosts, getSharelinkEditorialPost } from "@/data/sharelink";
import { getTossEditorialProduct, type TossSharelinkProduct } from "@/lib/tossSharelink";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedSharelinkPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps<"/recommendations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getSharelinkEditorialPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} | 취향보관소`,
    description: post.summary,
    alternates: { canonical: `/recommendations/${post.slug}` },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
    },
  };
}

export default async function RecommendationPostPage({ params }: PageProps<"/recommendations/[slug]">) {
  const { slug } = await params;
  const post = getSharelinkEditorialPost(slug);
  if (!post) notFound();

  const productState = post.product ? await getTossEditorialProduct(post.product.tacaItemId) : null;
  const product = productState?.status === "ready" ? productState.product : null;
  const approvedImageUrl = post.product?.imageApproved ? getProductImageUrl(product) : null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" showAuth={false} />
        <div className="mt-6 sm:mt-8"><ContentSectionTabs active="recommendations" /></div>

        <Link href="/recommendations" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#64748b] transition hover:text-[#be4b49]">
          <ArrowLeft size={16} /> 추천 콘텐츠로 돌아가기
        </Link>

        <article className="mx-auto mt-5 max-w-4xl overflow-hidden rounded-2xl border border-[#eadfd6] bg-white shadow-sm sm:rounded-3xl">
          <header className="bg-[linear-gradient(135deg,#fff7f5_0%,#fff_58%,#f7f4ff_100%)] px-5 py-8 sm:px-10 sm:py-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black tracking-[0.16em] text-[#be4b49]">{post.eyebrow}</span>
              <span className="rounded-full border border-white bg-white/85 px-2.5 py-1 text-[11px] font-black text-[#64748b] shadow-sm">
                {post.kind === "product-review" ? "상품 상세 후기" : "선택 가이드"}
              </span>
            </div>
            <h1 className="mt-4 break-keep text-3xl font-black leading-tight tracking-tight text-[#17202a] sm:text-5xl">{post.title}</h1>
            <p className="mt-5 max-w-3xl break-keep text-base font-semibold leading-7 text-[#52616b] sm:text-lg sm:leading-8">{post.summary}</p>
            <time dateTime={post.publishedAt} className="mt-5 block text-xs font-bold text-[#94a3b8]">{formatDate(post.publishedAt)}</time>
          </header>

          {post.product ? (
            <aside className="border-y border-[#f0d4cf] bg-[#fff7f5] px-5 py-4 text-sm font-semibold leading-6 text-[#7f3c3a] sm:px-10">
              <span className="mr-2 inline-flex rounded-md bg-[#be4b49] px-2 py-0.5 text-xs font-black text-white">광고</span>
              이 글은 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정 수수료를 지급받습니다.
            </aside>
          ) : null}

          <div className="px-5 py-8 sm:px-10 sm:py-12">
            {product ? (
              <ProductSummary product={product} imageUrl={approvedImageUrl} />
            ) : post.product ? (
              <div className="mb-9 rounded-2xl border border-dashed border-[#d8cfc2] bg-[#faf9f7] p-5 text-sm font-semibold leading-6 text-[#64748b]">
                상품 정보는 현재 불러오지 못했습니다. 작성된 후기는 그대로 읽을 수 있으며, 가격과 재고는 토스쇼핑에서 최종 확인해 주세요.
              </div>
            ) : null}

            <div className="space-y-6 text-[15px] font-medium leading-8 text-[#374151] sm:text-base sm:leading-8">
              {post.paragraphs.map((paragraph) => <p key={paragraph} className="break-keep">{paragraph}</p>)}
            </div>

            <section className="mt-10 rounded-2xl border border-[#e6e0d8] bg-[#faf9f7] p-5 sm:p-7" aria-labelledby="checklist-title">
              <p className="text-xs font-black tracking-[0.15em] text-[#be4b49]">CHECK POINT</p>
              <h2 id="checklist-title" className="mt-2 text-xl font-black text-[#17202a]">선택할 때 확인한 기준</h2>
              <ul className="mt-5 space-y-3">
                {post.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-[#52616b] sm:text-base">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#be4b49]" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#eee8df] pt-6">
              <p className="text-sm font-semibold text-[#64748b]">실제 사용 장면과 선택 기준을 바탕으로 작성했습니다.</p>
              <Link href="/recommendations" className="inline-flex items-center gap-2 text-sm font-black text-[#a83f3d]">다른 추천 보기 <ArrowUpRight size={15} /></Link>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function ProductSummary({ product, imageUrl }: { product: TossSharelinkProduct; imageUrl: string | null }) {
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-[#e8e4de] bg-white shadow-sm" aria-labelledby="product-summary-title">
      {imageUrl ? (
        <div className="flex min-h-64 items-center justify-center border-b border-[#eee8df] bg-[#faf9f7] p-5 sm:min-h-80 sm:p-8">
          {/* 토스 원본 URL을 저장하거나 가공하지 않고 상세 후기에서만 직접 표시합니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`${product.displayName} 상품 이미지`} className="max-h-80 w-full object-contain" />
        </div>
      ) : null}

      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0ed] text-[#be4b49]"><ShoppingBag size={20} /></span>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-[#be4b49]">TOSS SHOPPING</p>
            <h2 id="product-summary-title" className="mt-1 break-keep text-lg font-black leading-7 text-[#17202a] sm:text-xl">{product.displayName}</h2>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              {product.discountRate && product.discountRate > 0 ? <span className="text-sm font-black text-[#d05b45]">{product.discountRate}%</span> : null}
              <span className="text-2xl font-black text-[#be4b49]">{product.displayPrice.toLocaleString("ko-KR")}원</span>
            </div>
            {product.reviewScore ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#64748b]">
                <Star size={14} className="fill-[#e8b44f] text-[#e8b44f]" />{product.reviewScore.toFixed(1)}
                {product.reviewCount ? <span>리뷰 {product.reviewCount.toLocaleString("ko-KR")}개</span> : null}
              </p>
            ) : null}
          </div>

          {product.isSoldOut ? (
            <span className="inline-flex items-center justify-center rounded-xl bg-[#ece7e4] px-5 py-3 text-sm font-black text-[#64748b]">현재 품절</span>
          ) : (
            <a href={product.shareUrl} target="_blank" rel="sponsored noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#be4b49] px-5 py-3 text-sm font-black text-white transition hover:bg-[#a83f3d]">토스에서 상품 보기 <ExternalLink size={16} /></a>
          )}
        </div>

        <p className="mt-5 flex items-start gap-2 border-t border-[#eee8df] pt-4 text-xs font-semibold leading-5 text-[#64748b]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#be4b49]" />가격·재고·할인 조건은 변경될 수 있으니 이동한 토스쇼핑 상품 화면에서 최종 확인해 주세요.
        </p>
      </div>
    </section>
  );
}

function getProductImageUrl(product: TossSharelinkProduct | null) {
  const candidate = product?.mainImageUrls?.[0] || product?.thumbnailUrl;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00+09:00`));
}
