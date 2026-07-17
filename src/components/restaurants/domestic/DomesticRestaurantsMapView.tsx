"use client";

import { ExternalLink, List, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadKakaoMapsScript } from "@/lib/kakaoMaps";

type DomesticRestaurantMapItem = {
  id: string;
  title: string;
  storeName: string;
  categoryLabel: string;
  rating: number;
  address?: string;
  latitude: number;
  longitude: number;
  summary: string;
  mapUrl?: string;
};

type DomesticRestaurantsMapViewProps = {
  items: DomesticRestaurantMapItem[];
};

const defaultCenter = {
  lat: 35.681236,
  lng: 139.767125,
};

// 카카오맵은 마커에 임의 HTML을 직접 못 넣기 때문에
// CustomOverlay + DOM 엘리먼트로 파란 물방울 핀 모양을 재현합니다.
function createPinElement(): HTMLDivElement {
  const pin = document.createElement("div");
  pin.style.width = "26px";
  pin.style.height = "26px";
  pin.style.borderRadius = "50% 50% 50% 0";
  pin.style.background = "#0284c7";
  pin.style.border = "2px solid #ffffff";
  pin.style.transform = "rotate(-45deg)";
  pin.style.boxShadow = "0 2px 4px rgba(0,0,0,0.35)";
  pin.style.cursor = "pointer";
  return pin;
}

export function DomesticRestaurantsMapView({ items }: DomesticRestaurantsMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlayRefs = useRef<kakao.maps.CustomOverlay[]>([]);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  useEffect(() => {
    let isMounted = true;

    loadKakaoMapsScript()
      .then(() => {
        if (!isMounted || !mapContainerRef.current || !window.kakao) return;

        overlayRefs.current.forEach((overlay) => overlay.setMap(null));
        overlayRefs.current = [];

        const initialCenter = items[0]
          ? new window.kakao.maps.LatLng(items[0].latitude, items[0].longitude)
          : new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng);

        // 카카오맵은 확대/축소를 zoom이 아니라 level(숫자가 작을수록 확대)로 씁니다.
        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          level: items.length > 1 ? 8 : 4,
        });

        mapRef.current = map;

        if (items.length === 0) {
          return;
        }

        const bounds = new window.kakao.maps.LatLngBounds();

        items.forEach((item) => {
          const position = new window.kakao.maps.LatLng(
            item.latitude,
            item.longitude,
          );

          bounds.extend(position);

          const pinElement = createPinElement();
          pinElement.addEventListener("click", () => {
            setSelectedId(item.id);
            map.panTo(position);
            if (map.getLevel() > 4) {
              map.setLevel(4);
            }
          });

          const overlay = new window.kakao.maps.CustomOverlay({
            position,
            content: pinElement,
            map,
            yAnchor: 1,
          });

          overlayRefs.current.push(overlay);
        });

        if (items.length > 1) {
          map.setBounds(bounds, 72, 72, 72, 72);
        }
      })
      .catch((error: unknown) => {
        console.error("카카오맵을 불러오지 못했습니다:", error);
        setErrorMessage(
          "카카오맵을 불러오지 못했습니다. API 키 설정을 확인해 주세요.",
        );
      });

    return () => {
      isMounted = false;
      overlayRefs.current.forEach((overlay) => overlay.setMap(null));
      overlayRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function handleSelectItem(item: DomesticRestaurantMapItem) {
    const position = new window.kakao.maps.LatLng(item.latitude, item.longitude);

    setSelectedId(item.id);
    mapRef.current?.panTo(position);
    if ((mapRef.current?.getLevel() ?? 4) > 4) {
      mapRef.current?.setLevel(4);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#bae6fd] bg-[#f0f9ff] p-8 text-center shadow-sm">
        <MapPin className="mx-auto text-[#0284c7]" size={28} />
        <h2 className="mt-4 text-xl font-black text-[#17202a]">
          지도에 표시할 국내 맛집이 없습니다
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#52616b]">
          카카오맵 상호명 검색으로 좌표가 저장된 국내 맛집 리뷰를 작성하면 지도에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <section className="grid overflow-hidden rounded-lg border border-[#ddd6cc] bg-white shadow-sm lg:h-[760px] lg:grid-cols-[380px_1fr]">
      <aside className="order-2 flex min-h-0 flex-col border-t border-[#bae6fd] bg-[#f0f9ff] lg:order-1 lg:h-full lg:border-t-0 lg:border-r">
        <div className="border-b border-[#bae6fd] p-5">
          <p className="text-xs font-black uppercase text-[#0284c7]">
            Domestic Restaurant Map
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#17202a]">
            지도에 저장된 국내 맛집
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52616b]">
            마커나 목록을 선택하면 해당 국내 맛집 정보를 확인할 수 있습니다.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {items.map((item) => {
            const isSelected = item.id === selectedItem?.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectItem(item)}
                className={`mb-3 block w-full rounded-lg border p-4 text-left transition ${
                  isSelected
                    ? "border-[#0284c7] bg-white shadow-md"
                    : "border-[#bae6fd] bg-white/70 hover:border-[#0284c7]/60 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0284c7]">
                      {item.categoryLabel}
                    </p>
                    <h3 className="mt-1 line-clamp-1 text-lg font-black text-[#17202a]">
                      {item.storeName}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-[#17202a]">
                    <Star size={14} fill="#f2b84b" color="#f2b84b" />
                    {item.rating}
                  </span>
                </div>
                {item.address ? (
                  <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#52616b]">
                    {item.address}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="order-1 grid min-h-[520px] grid-rows-[minmax(420px,1fr)_auto] lg:order-2 lg:min-h-0">
        <div className="relative min-h-[420px] bg-[#f5efe6] lg:min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />
          {errorMessage ? (
            <div className="absolute inset-x-4 top-4 rounded-md border border-[#f0c9c6] bg-[#fff5f3] px-4 py-3 text-sm font-bold text-[#a73735] shadow-sm">
              {errorMessage}
            </div>
          ) : null}
        </div>

        {selectedItem ? (
          <div className="border-t border-[#bae6fd] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-[#0284c7]">
                  {selectedItem.categoryLabel}
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#17202a]">
                  {selectedItem.storeName}
                </h2>
                <p className="mt-2 text-sm font-bold text-[#52616b]">
                  {selectedItem.title}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1 text-sm font-black text-[#17202a]">
                <Star size={15} fill="#f2b84b" color="#f2b84b" />
                {selectedItem.rating}
              </span>
            </div>

            {selectedItem.address ? (
              <p className="mt-4 flex gap-2 text-sm font-semibold leading-6 text-[#52616b]">
                <MapPin className="mt-0.5 shrink-0 text-[#0284c7]" size={16} />
                {selectedItem.address}
              </p>
            ) : null}

            <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#3f4a54]">
              {selectedItem.summary}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/restaurants/${selectedItem.id}`}
                className="inline-flex items-center gap-2 rounded-md bg-[#0284c7] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0369a1]"
              >
                <List size={16} />
                리뷰 보기
              </Link>
              {selectedItem.mapUrl ? (
                <a
                  href={selectedItem.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-[#bae6fd] bg-white px-4 py-2 text-sm font-bold text-[#075985] shadow-sm transition hover:border-[#0284c7] hover:text-[#0284c7]"
                >
                  카카오맵에서 보기
                  <ExternalLink size={15} />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}