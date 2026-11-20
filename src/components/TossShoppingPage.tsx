import { ArrowUpRight, Clock3, ShoppingBag, Star } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { TossProductImage } from "@/components/TossProductImage";
import { getTossThumbnailUrl, parseTossProductIds } from "@/lib/tossProductImages";
import type { ReactNode } from "react";
import Link from "next/link";
import type { TossSharelinkProduct, TossSharelinkContentState } from "@/lib/tossSharelink";
import styles from "@/app/recommendations/Recommendations.module.css";

export function TossShoppingPage({ result, fashion = false, categoryName, children, loading = false }: {
  result: TossSharelinkContentState;
  fashion?: boolean;
  categoryName?: string;
  children?: ReactNode;
  loading?: boolean;
}) {
  const products = result.status === "ready" ? result.products : [];
  const blocked = parseTossProductIds(process.env.TOSS_IMAGE_BLOCKED_IDS);
  const imageFor = (product: TossSharelinkProduct) => getTossThumbnailUrl(product, blocked);
  return <main className="min-h-screen px-4 py-6 sm:px-10 sm:py-8">
    <section className={styles.shell}>
      <AppNav active="recommendations" showAuth={false} />
      <header className={styles.hero}>
        <ContentSectionTabs active="recommendations" />
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>{fashion ? "FASHION PICKS" : "SHOPPING PICKS"}</p>
            <h1>{fashion ? "패션 인기 상품" : "지금 많이 찾는 상품"}</h1>
            <p className={styles.description}>{fashion ? "토스쇼핑의 패션 카테고리에서 인기 상품을 확인해 보세요." : "토스쇼핑 베스트셀러를 한눈에. 마음에 드는 상품은 토스에서 확인해 보세요."}</p>
          </div>
          <span className={styles.update}><Clock3 size={14} aria-hidden="true" />{loading ? "상품을 불러오는 중" : `${fashion ? "매일 오전 9시 순위 갱신" : "1시간마다 갱신"} · ${products.length}개 상품`}</span>
        </div>
        <nav aria-label="추천 상품 분류" className={styles.shoppingTabs}>
          <Link href="/recommendations" prefetch={false} aria-current={!fashion ? "page" : undefined}>전체 베스트</Link>
          <Link href="/recommendations/fashion" prefetch={false} aria-current={fashion ? "page" : undefined}>패션</Link>
        </nav>
      </header>
      {children}
      <aside className={styles.disclosure}>
        <span>광고</span><p>이 콘텐츠는 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정 수수료를 지급받습니다.</p>
      </aside>
      {products.length ? <>
        <section className={styles.section} aria-labelledby="top-three-title">
          <div className={styles.sectionHeading}><h2 id="top-three-title">{fashion ? `${categoryName ?? "패션"} TOP ${Math.min(3, products.length)}` : `오늘의 TOP ${Math.min(3, products.length)}`}</h2><span>인기 순위 1–{Math.min(3, products.length)}위</span></div>
          <ol className={styles.podium}>
            {products.slice(0, 3).map((product) => {
              const imageUrl = imageFor(product);
              return <li key={product.tacaItemId} className={styles.featured}>
                <div className={styles.cardHeading}><span className={styles.topRank}>0{product.rank}</span><span>BEST SELLER</span></div>
                {imageUrl ? <div className={styles.featuredImage}><TossProductImage src={imageUrl} name={product.displayName} /></div> : null}
                <div className={styles.featuredBody}>
                  <h3 title={product.displayName}>{product.displayName}</h3>
                  <ProductPrice product={product} /><ProductReview product={product} />
                </div>
                <a href={product.shareUrl} target="_blank" rel="sponsored noreferrer" className={styles.featuredAction}>
                  토스에서 상품 보기 <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </li>;
            })}
          </ol>
        </section>
        {products.length > 3 ? <section className={styles.section} aria-labelledby="more-title">
          <div className={styles.sectionHeading}><h2 id="more-title">더 둘러보기</h2><span>인기 순위 4–{products.length}위</span></div>
          <ol start={4} className={styles.ranking}>
            {products.slice(3).map((product) => {
              const imageUrl = imageFor(product);
              return <li key={product.tacaItemId}>
                <a href={product.shareUrl} target="_blank" rel="sponsored noreferrer"
                  className={`${styles.rankRow} ${!imageUrl ? styles.textRow : ""}`} aria-label={`${product.rank}위 ${product.displayName}, 토스에서 보기 (새 창)`}>
                  <span className={styles.rankNumber}>{String(product.rank).padStart(2, "0")}</span>
                  {imageUrl ? <div className={styles.rowImage}><TossProductImage src={imageUrl} name={product.displayName} /></div> : null}
                  <div className={styles.rowBody}>
                    <h3 title={product.displayName}>{product.displayName}</h3>
                    <ProductPrice product={product} compact /><ProductReview product={product} compact />
                  </div>
                  <ArrowUpRight className={styles.rowArrow} size={18} aria-hidden="true" />
                </a>
              </li>;
            })}
          </ol>
        </section> : null}
      </> : loading ? <div className={styles.empty} role="status"><Clock3 size={28} aria-hidden="true" /><h2>인기 상품을 불러오는 중입니다</h2><p>상품 정보와 연결 링크를 확인하고 있습니다.</p></div> : <div className={styles.empty} role="status"><ShoppingBag size={32} aria-hidden="true" /><h2>{fashion ? result.status === "ready" ? "현재 이 분류에서 제공되는 인기 상품이 없습니다" : "패션 상품을 불러오지 못했습니다" : "베스트셀러를 불러오지 못했습니다"}</h2><p>{fashion && result.status === "ready" ? "다른 분류를 선택하거나 다음 순위 갱신 후 다시 확인해 주세요." : "잠시 후 다시 확인해 주세요."}</p></div>}
      <footer className={styles.footer}><span>{fashion ? `${categoryName ?? "패션"} 카테고리의 인기순으로 표시합니다. 원본 순위는 매일 오전 9시(KST)에 갱신됩니다.` : "순위는 토스쇼핑 베스트셀러 API 기준입니다."}</span><span>가격·재고·할인 조건은 이동한 상품 화면에서 최종 확인해 주세요.</span></footer>
    </section>
  </main>;
}

function ProductPrice({ product, compact = false }: { product: TossSharelinkProduct; compact?: boolean }) {
  return <div className={`${styles.price} ${compact ? styles.compactPrice : ""}`}>
    {product.discountRate && product.discountRate > 0 ? <span className={styles.discount}>{product.discountRate}%</span> : null}
    <strong>{product.displayPrice.toLocaleString("ko-KR")}<small>원</small></strong>
    {!compact && product.originalPrice && product.originalPrice > product.displayPrice ? <del>{product.originalPrice.toLocaleString("ko-KR")}원</del> : null}
  </div>;
}

function ProductReview({ product, compact = false }: { product: TossSharelinkProduct; compact?: boolean }) {
  if (!product.reviewScore) return null;
  return <p className={styles.review}><Star size={12} fill="currentColor" aria-hidden="true" /><strong>{product.reviewScore.toFixed(1)}</strong>
    {product.reviewCount ? <span>{compact ? "(" : "리뷰 "}{product.reviewCount.toLocaleString("ko-KR")}{compact ? ")" : "개"}</span> : null}
  </p>;
}
