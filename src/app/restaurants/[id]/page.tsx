import { ArrowLeft, ArrowRight, Calendar, Car, ExternalLink, MapPin, Pencil, RotateCw, Star, Store, Users, Utensils,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRestaurantReview } from "@/app/actions/restaurants";
import { AppNav } from "@/components/AppNav";
import { DeleteRestaurantsReviewButton } from "@/components/restaurants/DeleteRestaurantsReviewButton";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import {
  getRestaurantsReview,
  getRestaurantsReviews,
  sortRestaurantsReviews,
  categoryLabel,
  categoryTheme,
  type RestaurantsReview,
} from "@/data/restaurants";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RestaurantDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// 방문유형(companion) 영문 키를 한국어 라벨로 변환
function companionLabel(companion?: string) {
  switch (companion) {
    case "solo": return "혼밥";
    case "date": return "데이트";
    case "friends": return "친목모임";
    case "family": return "가족모임";
    case "business": return "비즈니스";
    default: return companion ?? "기타";
  }
}

export async function generateStaticParams() {
  const items = await getRestaurantsReviews();
  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: RestaurantDetailPageProps) {
  const { id } = await params;
  const item = await getRestaurantsReview(id);

  return {
    title: item ? `${item.title} | 취향보관소` : "맛집 없음",
    description: item?.summary ?? item?.review.slice(0, 100) ?? "맛집 기록을 찾을 수 없습니다.",
  };
}

export default async function RestaurantsDetailPage({
  params,
}: RestaurantDetailPageProps) {
  const { id } = await params;
  const item = await getRestaurantsReview(id);

  if (!item) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const theme = categoryTheme(item.category);
  const deleteAction = deleteRestaurantReview.bind(null, item.id);
  const canManageReview = canManageContent(user, item.authorId);

  const orderedItems = sortRestaurantsReviews(await getRestaurantsReviews(), "created-desc");
  const currentIndex = orderedItems.findIndex((rev) => rev.id === item.id);
  const previousItem = currentIndex >= 0 ? orderedItems[currentIndex + 1] : undefined;
  const nextItem = currentIndex > 0 ? orderedItems[currentIndex - 1] : undefined;

  // boolean 문자열("true"/"false") 또는 불리언 타입 대응
  const isParkingAvailable = String(item.hasParking) === "true";
  const isRevisitIntended = String(item.willRevisit) === "true";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="restaurants" />

        <article className="mx-auto mt-10 w-full max-w-3xl">
          {/* 1. 상단 네비게이션 및 관리 버튼 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/restaurants/items"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#e57632] transition hover:text-[#a83f3d]"
            >
              <ArrowLeft size={17} />
              맛집 목록
            </Link>

            {canManageReview ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/restaurants/${item.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#e57632] hover:text-[#e57632]"
                >
                  <Pencil size={16} />
                  수정
                </Link>
                <form action={deleteAction}>
                  <DeleteRestaurantsReviewButton title={item.title} />
                </form>
              </div>
            ) : null}
          </div>

          {/* 2. 메인 헤더 & 요약(Summary) */}
          <header
            className={`mt-8 overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme} bg-white shadow-sm`}
          >
            <ThumbnailImage
              src={item.thumbnail}
              alt={item.thumbnailAlt}
              title={item.title}
              label={categoryLabel(item.category)}
              loading="eager"
              fetchPriority="high"
            />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-md px-3 py-1 text-sm font-bold ${theme}`}>
                  {categoryLabel(item.category)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eadcc7] bg-[#fffdf8] px-3 py-1 text-sm font-black text-[#17202a]">
                  <Star size={16} fill="#f2b84b" color="#f2b84b" />
                  {item.rating}
                  <span className="font-normal text-[#8c9ba5]">/ 5.0</span>
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight text-[#17202a] sm:text-4xl">
                {item.title}
              </h1>

              {/* [추가됨] 요약(Summary) 영역 */}
              {item.summary ? (
                <p className="mt-3 text-lg font-medium leading-relaxed text-[#52616b]">
                  {item.summary}
                </p>
              ) : null}

              {/* 방문 메타 정보 바 */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-md bg-[#f8f6f0] p-4 text-sm font-semibold text-[#52616b]">
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#e57632]" />
                  <span className="text-[#8c9ba5]">방문일:</span>
                  {formatFullDate(item.visitedAt)}
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-[#e57632]" />
                  <span className="text-[#8c9ba5]">동행:</span>
                  {companionLabel(item.companion)}
                </span>
                {item.authorName ? (
                  <span className="flex items-center gap-2">
                    <Utensils size={16} className="text-[#e57632]" />
                    <span className="text-[#8c9ba5]">기록:</span>
                    {item.authorName}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {/* 3. [신설] 식당 정보 & 방문 팁 (StoreName, Address, Parking, Revisit, MapUrl) */}
          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-6 shadow-sm sm:p-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a6f63]">
              Restaurant Info & Tips
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* 식당명 */}
              <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4">
                <Store className="mt-0.5 shrink-0 text-[#e57632]" size={18} />
                <div>
                  <p className="text-xs font-bold text-[#7a6f63]">상호명</p>
                  <p className="mt-0.5 font-bold text-[#17202a]">{item.storeName || "-"}</p>
                </div>
              </div>

              {/* 주차 여부 */}
              <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4">
                <Car className={`mt-0.5 shrink-0 ${isParkingAvailable ? "text-blue-600" : "text-gray-400"}`} size={18} />
                <div>
                  <p className="text-xs font-bold text-[#7a6f63]">주차 여부</p>
                  <p className={`mt-0.5 font-bold ${isParkingAvailable ? "text-blue-600" : "text-gray-600"}`}>
                    {isParkingAvailable ? "🚗 주차 가능" : "🚫 주차 불가"}
                  </p>
                </div>
              </div>

              {/* 주소 */}
              {item.address ? (
                <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4 sm:col-span-2">
                  <MapPin className="mt-0.5 shrink-0 text-[#e57632]" size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#7a6f63]">주소</p>
                    <p className="mt-0.5 break-words font-medium text-[#17202a]">{item.address}</p>
                  </div>
                  {item.mapUrl ? (
                    <a
                      href={item.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-[#e57632] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#a83f3d]"
                    >
                      지도 보기
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {/* 재방문 의사 */}
              <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4 sm:col-span-2">
                <RotateCw className={`mt-0.5 shrink-0 ${isRevisitIntended ? "text-green-600" : "text-gray-400"}`} size={18} />
                <div>
                  <p className="text-xs font-bold text-[#7a6f63]">재방문 의사</p>
                  <p className={`mt-0.5 font-bold ${isRevisitIntended ? "text-green-600" : "text-gray-600"}`}>
                    {isRevisitIntended ? "🙆‍♂️ 무조건 또 갈 거예요! (재방문 확정)" : "🙅‍♂️ 이번 한 번으로 만족해요"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 상세 맛집평 (Review) */}
          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-sm font-bold uppercase text-[#e57632]">
              Visit Review
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#3f4a54] sm:text-lg">
              {item.review}
            </p>
          </section>

          {/* 5. 이전/다음 글 네비게이션 */}
          {previousItem || nextItem ? (
            <nav aria-label="맛집 이전 다음 글" className="mt-8 grid gap-4 sm:grid-cols-2">
              {previousItem ? (
                <RestaurantAdjacentCard item={previousItem} label="이전 맛집" direction="previous" />
              ) : (
                <div className="hidden sm:block" />
              )}
              {nextItem ? (
                <RestaurantAdjacentCard item={nextItem} label="다음 맛집" direction="next" />
              ) : null}
            </nav>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function RestaurantAdjacentCard({
  item,
  label,
  direction,
}: {
  item: RestaurantsReview;
  label: string;
  direction: "previous" | "next";
}) {
  const theme = categoryTheme(item.category);
  const Icon = direction === "previous" ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/restaurants/${item.id}`}
      className={`group grid grid-cols-[88px_1fr] overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
    >
      <ThumbnailImage
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        title={item.title}
        label={categoryLabel(item.category)}
        className="h-full min-h-28 w-full object-cover"
        fallbackClassName="h-full min-h-28 w-full"
        loading="lazy"
      />
      <div className="min-w-0 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[#e57632]">
          {direction === "previous" ? <Icon size={14} /> : null}
          {label}
          {direction === "next" ? <Icon size={14} /> : null}
        </p>
        <h2 className="mt-2 line-clamp-2 font-bold leading-6 text-[#17202a] transition group-hover:text-[#e57632]">
          {item.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6b7280]">
          <span>{formatDate(item.visitedAt)}</span>
          <span className="flex items-center gap-1">
            <Star size={13} fill="#f2b84b" color="#f2b84b" />
            {item.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatFullDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}