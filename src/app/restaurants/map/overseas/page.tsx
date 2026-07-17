import { ArrowRight, MapPinned, Plus } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { OverseasRestaurantsMapView } from "@/components/restaurants/overseas/OverseasRestaurantsMapView";
import { getRestaurantsReviews } from "@/data/restaurants";
 import { RestaurantScopeTabs } from "@/components/RestaurantScopeTabs";

export const metadata = {
  title: "해외 맛집리뷰 지도 | 취향보관소",
  description: "저장된 해외 맛집 리뷰를 지도에서 탐색합니다.",
};

export default async function RestaurantsMapPage() {
  const restaurants = await getRestaurantsReviews("overseas");
  const mappableItems = restaurants
    .filter(
      (item) =>
        typeof item.latitude === "number" && typeof item.longitude === "number",
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      storeName: item.storeName,
      categoryLabel: "해외 맛집",
      rating: item.rating,
      address: item.address,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      summary: item.summary,
      mapUrl: item.mapUrl,
    }));

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="overseas-restaurants-map" />

        <header className="py-10">
          <RestaurantScopeTabs active="overseas" view="map" />
          <div className="hidden">
            <MapPinned size={16} />
            해외 맛집리뷰 지도
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-[#0284c7]">
                Restaurant Map
              </p>
              <h1 className="mt-3 text-3xl font-black text-[#17202a] sm:text-4xl">
                해외 맛집 리뷰를 지도에서 봅니다
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
                Google Maps 장소 검색으로 저장된 해외 맛집 좌표를 지도에 표시합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/new?type=overseas-restaurants"
                className="inline-flex items-center gap-2 rounded-md bg-[#0284c7] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0369a1]"
              >
                <Plus size={16} />
                해외 맛집 작성
              </Link>
              <Link
                href="/restaurants/items?scope=overseas"
                className="inline-flex items-center gap-2 rounded-md border border-[#bae6fd] bg-white px-4 py-2 text-sm font-bold text-[#075985] shadow-sm transition hover:border-[#0284c7] hover:text-[#0284c7]"
              >
                목록으로 보기
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </header>

        <OverseasRestaurantsMapView items={mappableItems} />
      </section>
    </main>
  );
}
