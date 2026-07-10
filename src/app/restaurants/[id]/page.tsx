import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  ExternalLink,
  MapPin,
  Pencil,
  RotateCw,
  Star,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRestaurantReview } from "@/app/actions/restaurants";
import { AppNav } from "@/components/AppNav";
import { DeleteRestaurantsReviewButton } from "@/components/restaurants/DeleteRestaurantsReviewButton";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import {
  categoryLabel,
  categoryTheme,
  getRestaurantsReview,
  getRestaurantsReviews,
  sortRestaurantsReviews,
  type RestaurantsReview,
} from "@/data/restaurants";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RestaurantDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function companionLabel(companion?: string) {
  switch (companion) {
    case "solo":
      return "혼자";
    case "date":
      return "데이트";
    case "friends":
      return "친구 모임";
    case "family":
      return "가족 모임";
    case "business":
      return "비즈니스";
    default:
      return companion ?? "기타";
  }
}

export async function generateStaticParams() {
  const [domesticItems, overseasItems] = await Promise.all([
    getRestaurantsReviews("domestic"),
    getRestaurantsReviews("overseas"),
  ]);

  return [...domesticItems, ...overseasItems].map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: RestaurantDetailPageProps) {
  const { id } = await params;
  const item = await getRestaurantsReview(id);
  const title = item?.scope === "overseas" ? item.storeName : item?.title;

  return {
    title: title ? `${title} | 취향보관소` : "맛집 없음",
    description:
      item?.summary ?? item?.review.slice(0, 100) ?? "맛집 기록을 찾을 수 없습니다.",
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

  const isOverseas = item.scope === "overseas";
  const theme = categoryTheme(item.category);
  const deleteAction = deleteRestaurantReview.bind(null, item.id);
  const canManageReview = canManageContent(user, item.authorId);
  const listHref = isOverseas
    ? "/restaurants/items?scope=overseas"
    : "/restaurants/items";
  const title = isOverseas ? item.storeName : item.title;
  const badgeLabel = isOverseas ? "해외 맛집" : categoryLabel(item.category);
  const accentText = isOverseas ? "text-[#0284c7]" : "text-[#e57632]";
  const accentHoverText = isOverseas ? "hover:text-[#0369a1]" : "hover:text-[#a83f3d]";
  const accentBorder = isOverseas ? "border-l-[#0284c7]" : theme.border;
  const badgeClass = isOverseas ? "bg-[#e0f2fe] text-[#075985]" : theme.badge;
  const softBorder = isOverseas ? "border-[#bae6fd]" : "border-[#eadcc7]";
  const softBg = isOverseas ? "bg-[#f0f9ff]" : "bg-[#fffdf8]";
  const primaryBg = isOverseas ? "bg-[#0284c7]" : "bg-[#e57632]";
  const primaryHoverBg = isOverseas ? "hover:bg-[#0369a1]" : "hover:bg-[#a83f3d]";
  const controlHover = isOverseas
    ? "hover:border-[#0284c7] hover:text-[#0284c7]"
    : "hover:border-[#e57632] hover:text-[#e57632]";

  const orderedItems = sortRestaurantsReviews(
    await getRestaurantsReviews(item.scope),
    "created-desc",
  );
  const currentIndex = orderedItems.findIndex((review) => review.id === item.id);
  const previousItem = currentIndex >= 0 ? orderedItems[currentIndex + 1] : undefined;
  const nextItem = currentIndex > 0 ? orderedItems[currentIndex - 1] : undefined;

  const isParkingAvailable = String(item.hasParking) === "true";
  const isRevisitIntended = String(item.willRevisit) === "true";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active={isOverseas ? "restaurant-map" : "restaurants"} />

        <article className="mx-auto mt-10 w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={listHref}
              className={`inline-flex items-center gap-2 text-sm font-bold transition ${accentText} ${accentHoverText}`}
            >
              <ArrowLeft size={17} />
              {isOverseas ? "해외 맛집 목록" : "맛집 목록"}
            </Link>

            {canManageReview ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/restaurants/${item.id}/edit`}
                  className={`inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition ${controlHover}`}
                >
                  <Pencil size={16} />
                  수정
                </Link>
                <form action={deleteAction}>
                  <DeleteRestaurantsReviewButton title={title} />
                </form>
              </div>
            ) : null}
          </div>

          <header
            className={`mt-8 overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${accentBorder} bg-white shadow-sm`}
          >
            <ThumbnailImage
              src={item.thumbnail}
              alt={item.thumbnailAlt}
              title={title}
              label={badgeLabel}
              loading="eager"
              fetchPriority="high"
              googlePlaceId={isOverseas ? item.placeId : undefined}
              googlePlaceQuery={
                isOverseas ? [item.storeName, item.address].filter(Boolean).join(" ") : undefined
              }
            />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-md px-3 py-1 text-sm font-bold ${badgeClass}`}>
                  {badgeLabel}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-black text-[#17202a] ${softBorder} ${softBg}`}>
                  <Star size={16} fill="#f2b84b" color="#f2b84b" />
                  {item.rating}
                  <span className="font-normal text-[#8c9ba5]">/ 5.0</span>
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight text-[#17202a] sm:text-4xl">
                {title}
              </h1>

              {item.summary ? (
                <p className="mt-3 text-lg font-medium leading-relaxed text-[#52616b]">
                  {item.summary}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-md bg-[#f8f6f0] p-4 text-sm font-semibold text-[#52616b]">
                {!isOverseas ? (
                  <>
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
                  </>
                ) : null}
                {item.authorName ? (
                  <span className="flex items-center gap-2">
                    <Utensils size={16} className={accentText} />
                    <span className="text-[#8c9ba5]">작성자:</span>
                    {item.authorName}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-6 shadow-sm sm:p-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a6f63]">
              {isOverseas ? "Google Maps Info" : "Restaurant Info & Tips"}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className={`flex items-start gap-3 rounded-md border bg-white p-4 ${softBorder}`}>
                <Store className={`mt-0.5 shrink-0 ${accentText}`} size={18} />
                <div>
                  <p className="text-xs font-bold text-[#7a6f63]">상호명</p>
                  <p className="mt-0.5 font-bold text-[#17202a]">
                    {item.storeName || "-"}
                  </p>
                </div>
              </div>

              {!isOverseas ? (
                <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4">
                  <Car
                    className={`mt-0.5 shrink-0 ${
                      isParkingAvailable ? "text-blue-600" : "text-gray-400"
                    }`}
                    size={18}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#7a6f63]">주차 여부</p>
                    <p
                      className={`mt-0.5 font-bold ${
                        isParkingAvailable ? "text-blue-600" : "text-gray-600"
                      }`}
                    >
                      {isParkingAvailable ? "주차 가능" : "주차 불가"}
                    </p>
                  </div>
                </div>
              ) : null}

              {item.address ? (
                <div className={`flex items-start gap-3 rounded-md border bg-white p-4 sm:col-span-2 ${softBorder}`}>
                  <MapPin className={`mt-0.5 shrink-0 ${accentText}`} size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#7a6f63]">주소</p>
                    <p className="mt-0.5 break-words font-medium text-[#17202a]">
                      {item.address}
                    </p>
                  </div>
                  {item.mapUrl ? (
                    <a
                      href={item.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-white transition ${primaryBg} ${primaryHoverBg}`}
                    >
                      지도 보기
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {!isOverseas ? (
                <div className="flex items-start gap-3 rounded-md border border-[#eadcc7] bg-white p-4 sm:col-span-2">
                  <RotateCw
                    className={`mt-0.5 shrink-0 ${
                      isRevisitIntended ? "text-green-600" : "text-gray-400"
                    }`}
                    size={18}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#7a6f63]">재방문 의사</p>
                    <p
                      className={`mt-0.5 font-bold ${
                        isRevisitIntended ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {isRevisitIntended
                        ? "무조건 또 갈 거예요"
                        : "이번 한 번으로 만족해요"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
            <h2 className={`text-sm font-bold uppercase ${accentText}`}>
              {isOverseas ? "Restaurant Review" : "Visit Review"}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#3f4a54] sm:text-lg">
              {item.review}
            </p>
          </section>

          {previousItem || nextItem ? (
            <nav aria-label="맛집 이전 다음 글" className="mt-8 grid gap-4 sm:grid-cols-2">
              {previousItem ? (
                <RestaurantAdjacentCard
                  item={previousItem}
                  label={isOverseas ? "이전 해외 맛집" : "이전 맛집"}
                  direction="previous"
                />
              ) : (
                <div className="hidden sm:block" />
              )}
              {nextItem ? (
                <RestaurantAdjacentCard
                  item={nextItem}
                  label={isOverseas ? "다음 해외 맛집" : "다음 맛집"}
                  direction="next"
                />
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
  const title = item.scope === "overseas" ? item.storeName : item.title;
  const isOverseas = item.scope === "overseas";
  const accentBorder = isOverseas ? "border-l-[#0284c7]" : theme.border;
  const accentText = isOverseas ? "text-[#0284c7]" : "text-[#e57632]";
  const hoverText = isOverseas ? "group-hover:text-[#0284c7]" : "group-hover:text-[#e57632]";

  return (
    <Link
      href={`/restaurants/${item.id}`}
      className={`group grid grid-cols-[88px_1fr] overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${accentBorder} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
    >
      <ThumbnailImage
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        title={title}
        label={item.scope === "overseas" ? "해외 맛집" : categoryLabel(item.category)}
        className="h-full min-h-28 w-full object-cover"
        fallbackClassName="h-full min-h-28 w-full"
        loading="lazy"
        googlePlaceId={isOverseas ? item.placeId : undefined}
        googlePlaceQuery={
          isOverseas ? [item.storeName, item.address].filter(Boolean).join(" ") : undefined
        }
      />
      <div className="min-w-0 p-4">
        <p className={`flex items-center gap-1.5 text-xs font-bold ${accentText}`}>
          {direction === "previous" ? <Icon size={14} /> : null}
          {label}
          {direction === "next" ? <Icon size={14} /> : null}
        </p>
        <h2 className={`mt-2 line-clamp-2 font-bold leading-6 text-[#17202a] transition ${hoverText}`}>
          {title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6b7280]">
          <span>{formatFullDate(item.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Star size={13} fill="#f2b84b" color="#f2b84b" />
            {item.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatFullDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
