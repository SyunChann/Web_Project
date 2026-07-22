import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  MapPinned,
  Pencil,
  Star,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTravel } from "@/app/actions/travel";
import { AppNav } from "@/components/AppNav";
import { DeleteReviewButton } from "@/components/travel/DeleteTravelButtom";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { getTravel, getTravels, sortTravelStops, travelToStop } from "@/data/travel";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TravelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const items = await getTravels();

  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: TravelDetailPageProps) {
  const { id } = await params;
  const item = await getTravel(id);

  return {
    title: item ? `${item.tripTitle ?? item.title} | 해외여행` : "여행 기록 없음",
    description: item?.summary ?? "여행 기록을 찾을 수 없습니다.",
  };
}

export default async function TravelDetailPage({ params }: TravelDetailPageProps) {
  const { id } = await params;
  const item = await getTravel(id);

  if (!item) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const canManageTravel = canManageContent(user, item.authorId);
  const deleteAction = deleteTravel.bind(null, item.id);
  const legacyTravelItems = item.itinerary.length || !item.tripTitle
    ? []
    : (await getTravels()).filter(
        (travel) =>
          travel.tripTitle === item.tripTitle && travel.authorId === item.authorId,
      );
  const stops = item.itinerary.length
    ? item.itinerary
    : legacyTravelItems.length
      ? sortTravelStops(legacyTravelItems.map(travelToStop))
      : [{
          storeName: item.storeName,
          address: item.address,
          mapUrl: item.mapUrl,
          visitedAt: item.visitedAt,
          visitedTime: item.visitedTime,
        }];
  const title = item.tripTitle ?? item.title;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="travel" />

        <article className="mx-auto mt-7 w-full max-w-3xl sm:mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/travel/items" className="inline-flex items-center gap-2 text-sm font-bold text-[#4d7c0f] hover:text-[#3f6212]">
              <ArrowLeft size={17} />
              여행리뷰 목록
            </Link>
            {canManageTravel ? (
              <div className="flex flex-wrap gap-2">
                <Link href={`/travel/${item.id}/map`} className="inline-flex items-center gap-2 rounded-md border border-[#d9efb9] bg-[#f7fee7] px-4 py-2 text-sm font-bold text-[#4d7c0f] shadow-sm transition hover:border-[#65a30d]">
                  <MapPinned size={16} />
                  동선 지도
                </Link>
                <Link href={`/travel/${item.id}/edit`} className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#65a30d] hover:text-[#4d7c0f]">
                  <Pencil size={16} />
                  수정
                </Link>
                <form action={deleteAction}>
                  <DeleteReviewButton title={title} />
                </form>
              </div>
            ) : null}
          </div>

          {!canManageTravel ? <Link href={`/travel/${item.id}/map`} className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#d9efb9] bg-[#f7fee7] px-4 py-2 text-sm font-bold text-[#4d7c0f] shadow-sm transition hover:border-[#65a30d]"><MapPinned size={16} />동선 지도</Link> : null}

          <header className="mt-8 overflow-hidden rounded-lg border border-[#ddd6cc] bg-white shadow-sm">
            <ThumbnailImage src={item.thumbnail} alt={item.thumbnailAlt} title={title} label="해외여행" loading="eager" fetchPriority="high" googlePlaceId={item.placeId} googlePlaceQuery={[item.storeName, item.address].filter(Boolean).join(" ")} />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-md bg-[#f7fee7] px-3 py-1 text-sm font-bold text-[#4d7c0f]">여행 장소 {stops.length}곳</span>
                <span className="inline-flex items-center gap-1 text-sm font-black text-[#17202a]"><Star size={16} fill="#f2b84b" color="#f2b84b" />{item.rating}</span>
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight text-[#17202a] sm:text-4xl">{title}</h1>
              <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#52616b]">{item.summary}</p>
              {item.authorName ? <p className="mt-5 text-sm font-bold text-[#64748b]">작성자: {item.authorName}</p> : null}
            </div>
          </header>

          <section className="mt-8 rounded-lg border border-[#d9efb9] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 text-[#4d7c0f]"><MapPin size={18} /><h2 className="text-xl font-black text-[#17202a]">여행 동선</h2></div>
            <ol className="mt-6 grid gap-3 border-l-2 border-[#d9efb9] pl-5">
              {stops.map((stop, index) => (
                <li key={`${stop.storeName}-${index}`} className="relative rounded-md border border-[#e5e7eb] bg-[#fbfaf7] p-4">
                  <span className="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-[#65a30d]" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-bold text-[#17202a]">{stop.storeName}</h3>{stop.address ? <p className="mt-1 text-sm leading-6 text-[#64748b]">{stop.address}</p> : null}</div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#4d7c0f]"><CalendarDays size={15} />{formatDate(stop.visitedAt)} <Clock3 size={15} className="ml-1" />{stop.visitedTime?.slice(0, 5) ?? "시간 미정"}</span>
                  </div>
                  {stop.mapUrl ? <a href={stop.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#4d7c0f] hover:text-[#3f6212]">Google Maps <ExternalLink size={13} /></a> : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-sm font-bold uppercase text-[#4d7c0f]">Travel Review</h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#3f4a54] sm:text-lg">{item.review}</p>
          </section>
        </article>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}
