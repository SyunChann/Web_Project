import { MobileFilterDetails } from "@/components/MobileFilterDetails";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Wine } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { StarRating } from "@/components/drinks/StarRating";
import styles from "@/components/drinks/Drinks.module.css";
import { getDrinkPosts, drinkPhotoUrl } from "@/data/drinks";
import { drinkCategories, drinkKinds, tasteTags, readDrinkFilters, type DrinkFilterParams } from "@/lib/drinks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "술 취향 | 취향보관소", description: "위스키·사케·전통주·맥주, 마신 술의 리뷰와 궁금한 술을 모읍니다." };
type Filters = DrinkFilterParams;
export default async function DrinksPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const filters = readDrinkFilters(params);
  return <main className={styles.page}><section className={styles.shell}>
    <Suspense fallback={<div aria-hidden="true" className="h-12 w-24 rounded-md bg-white" />}><AppNav active="drinks" /></Suspense>
    <header className={styles.hero}><div><p className={styles.eyebrow}>TASTE NOTES</p><h1>술 취향</h1><p className={styles.description}>마신 한 잔의 기억, 다음에 만나고 싶은 한 병.</p></div><Link href="/drinks/new" className={styles.primary}>술 기록 쓰기</Link></header>
    <form key={`filters:${JSON.stringify(filters)}`} action="/drinks" className={styles.filters}>
      <label className={styles.nameFilter}>술 이름<input name="q" type="search" maxLength={80} defaultValue={filters.q} placeholder="궁금한 술을 찾아보세요" /></label>
      <button className={styles.secondary} type="submit">검색</button>
      <div className={styles.filterOptions}><MobileFilterDetails label="술 필터" active={Boolean(filters.category || filters.kind || filters.rating || filters.tag)}>
        <div className={styles.filterFields}>
          <label>술 종류<select name="category" aria-label="술 종류" defaultValue={filters.category}><option value="">전체 종류</option>{Object.entries(drinkCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>글 구분<select name="kind" aria-label="글 구분" defaultValue={filters.kind}><option value="">전체 글</option>{Object.entries(drinkKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <details className={styles.extraFilters} open={Boolean(filters.rating || filters.tag)}><summary>별점·맛 필터{filters.rating || filters.tag ? " · 적용 중" : ""}</summary><div>
            <label>별점<select name="rating" defaultValue={filters.rating}><option value="">전체 별점</option>{Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map((value) => <option key={value} value={value}>★ {value.toFixed(1)} 이상</option>)}</select></label>
            <label>맛 태그<select name="tag" defaultValue={filters.tag}><option value="">전체 맛</option>{tasteTags.map((tag) => <option key={tag}>{tag}</option>)}</select></label>
          </div></details>
        </div>
      </MobileFilterDetails></div>
    </form>
    <Suspense key={`results:${JSON.stringify(filters)}`} fallback={<p role="status" className={styles.notice}>술 기록을 불러오고 있습니다…</p>}>
      <DrinkResults params={params} />
    </Suspense>
  </section></main>;
}

async function DrinkResults({ params }: { params: Filters }) {
  const { posts, count, error, filters } = await getDrinkPosts(params);
  const pages = Math.max(1, Math.ceil(count / 24));
  const pageHref = (page: number) => `/drinks?${new URLSearchParams({ ...filters, page: String(page) })}`;
  const filtered = Boolean(filters.q || filters.category || filters.kind || filters.rating || filters.tag);
  return <>
    <div className={styles.meta}><span>{count}개의 술 기록 · 최신순</span>{filtered ? <Link href="/drinks">필터 초기화</Link> : null}</div>
    {filters.rating || filters.tag ? <p className={styles.hint}>별점·맛 필터는 마신 술 리뷰에 적용됩니다.{filters.kind === "curious" ? " 궁금한 술을 보려면 별점·맛 필터를 해제해 주세요." : ""}</p> : null}
    {error ? <p role="status" className={styles.notice}>{error}</p> : posts.length ? <div className={styles.grid}>
      {posts.map((post) => <Link key={post.id} href={`/drinks/${post.id}`} className={styles.card}>
        <div className={styles.cardImage}>{post.image ? <Image src={drinkPhotoUrl(post.image)} alt={`${post.name} 대표 사진`} fill sizes="(max-width:480px) 83px, (max-width:800px) 50vw, 384px" unoptimized={post.image.endsWith(".gif")} /> : <Wine size={48} strokeWidth={1.2} aria-hidden="true" />}</div>
        <div className={styles.cardBody}><div className={styles.badges}><span>{drinkCategories[post.category]}</span><span>{drinkKinds[post.kind]}</span></div>
          <h2>{post.name}</h2>{post.rating !== null ? <StarRating rating={Number(post.rating)} /> : <span className={styles.hint}>마셔보고 싶은 술</span>}
          <p className={styles.excerpt}>{post.excerpt}</p>
          {post.tags.length ? <p className={styles.hint}>{post.tags.slice(0, 3).join(" · ")}</p> : null}
          <div className={styles.meta}><span>{post.author_name}</span><time dateTime={post.created_at}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(post.created_at))}</time></div>
        </div>
      </Link>)}
    </div> : <div className={styles.notice}>{filtered ? "조건에 맞는 술 기록이 없습니다. 필터를 바꿔 찾아보세요." : "아직 술 기록이 없습니다. 첫 한 잔의 이야기를 남겨보세요."}</div>}
    {!error && (pages > 1 || filters.page > 1) ? <nav className={styles.pagination} aria-label="술 목록 페이지">{filters.page > 1 ? <Link className={styles.secondary} href={pageHref(filters.page - 1)}>이전</Link> : null}<span>{filters.page} / {pages}</span>{filters.page < pages ? <Link className={styles.secondary} href={pageHref(filters.page + 1)}>다음</Link> : null}</nav> : null}
  </>;
}
