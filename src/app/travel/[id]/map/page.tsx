import { ArrowLeft, MapPinned } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TravelMapView, type TravelRouteStop } from "@/components/travel/TravelMapView";
import { getTravel, getTravels, sortTravelStops, travelToStop } from "@/data/travel";

type TravelRouteMapPageProps = { params: Promise<{ id: string }> };

export default async function TravelRouteMapPage({ params }: TravelRouteMapPageProps) {
  const { id } = await params;
  const item = await getTravel(id);

  if (!item) notFound();

  const legacyItems = item.itinerary.length || !item.tripTitle
    ? []
    : (await getTravels()).filter((travel) => travel.tripTitle === item.tripTitle && travel.authorId === item.authorId);
  const stops = (item.itinerary.length ? item.itinerary : legacyItems.length ? sortTravelStops(legacyItems.map(travelToStop)) : [travelToStop(item)])
    .filter((stop): stop is TravelRouteStop => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
    .map((stop) => ({ ...stop, latitude: stop.latitude, longitude: stop.longitude }));

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="travel" />
        <Link href={`/travel/${item.id}`} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#4d7c0f] hover:text-[#3f6212]"><ArrowLeft size={17} />여행리뷰 상세</Link>
        <header className="py-8"><p className="text-sm font-bold uppercase text-[#4d7c0f]">travel route</p><h1 className="mt-2 text-3xl font-black text-[#17202a]">{item.tripTitle ?? item.title} 동선 지도</h1><p className="mt-3 text-sm leading-6 text-[#52616b]">방문일과 시간 순서에 맞춰 장소를 연결해 표시합니다.</p></header>
        {stops.length ? <TravelMapView stops={stops} /> : <section className="rounded-lg border border-dashed border-[#d9efb9] bg-white p-10 text-center shadow-sm"><MapPinned className="mx-auto text-[#65a30d]" size={30} /><h2 className="mt-4 text-xl font-black text-[#17202a]">표시할 좌표가 없습니다</h2><p className="mt-2 text-sm text-[#64748b]">수정 화면에서 Google 장소를 다시 선택하면 동선 지도에 표시됩니다.</p></section>}
      </section>
    </main>
  );
}
