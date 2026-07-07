/// <reference types="google.maps" />
"use client";

import { useEffect, useRef, useState } from "react";
// 🟢 Loader 클래스 대신 최신 함수형 API인 setOptions 와 importLibrary 를 가져옵니다.
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Search, CheckCircle2 } from "lucide-react";

export type SelectedPlaceData = {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  mapUrl: string;
};

type PlaceSearchProps = {
  onSelectPlace: (data: SelectedPlaceData) => void;
};

export function PlaceSearch({ onSelectPlace }: PlaceSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    // 1. 🟢 최신 방식: API 옵션을 먼저 전역으로 설정합니다.
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      v: "weekly",
      libraries: ["places"],
    });

    // 2. 🟢 최신 방식: importLibrary 함수로 "places" 라이브러리를 직접 호출합니다.
    importLibrary("places").then(() => {
      setIsLoaded(true);
      if (!inputRef.current || !window.google) return;

      // 3. 구글 자동완성(Autocomplete) 객체 생성
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["name", "formatted_address", "geometry", "place_id", "url"],
        types: ["establishment"], // 업체/상가 위주로 검색
      });

      // 4. 장소 선택 완료 이벤트
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location || !place.place_id) {
          alert("장소의 상세 위치 정보를 불러올 수 없습니다. 다른 검색어를 선택해주세요.");
          return;
        }

        // 구글 API 데이터 ➔ 우리 DB 형식으로 변환
        const extractedData: SelectedPlaceData = {
          storeName: place.name || "상호명 없음",
          address: place.formatted_address || "주소 정보 없음",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          placeId: place.place_id,
          mapUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        };

        setSelectedName(extractedData.storeName);
        onSelectPlace(extractedData);
      });
    }).catch((err: unknown) => {
      console.error("구글 지도 스크립트를 불러오는 중 오류가 발생했습니다:", err);
    });
  }, [onSelectPlace]);

  return (
    <div className="w-full rounded-lg border border-[#ddd6cc] bg-[#fffdf8] p-4 shadow-sm">
      <label className="block text-sm font-bold text-[#17202a]">
        🗺️ 식당 장소 검색 (Google Maps)
      </label>
      <p className="mt-1 text-xs text-[#6b7280]">
        방문하신 식당 이름을 검색한 뒤, 목록에서 클릭하시면 위도/경도와 주소가 자동 입력됩니다.
      </p>

      <div className="relative mt-3">
        <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8a95a1]" />
        <input
          ref={inputRef}
          type="text"
          disabled={!isLoaded}
          placeholder={isLoaded ? "예: 도쿄 이치란 시부야점, 성수 소문난감자탕..." : "구글 지도 불러오는 중..."}
          className="h-11 w-full rounded-md border border-[#d8cfc2] bg-white pr-3 pl-10 text-sm font-semibold outline-none transition focus:border-[#be4b49] disabled:bg-gray-100"
        />
      </div>

      {selectedName && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-[#2f7f7a] bg-[#eefaf8] px-3 py-2 text-xs font-bold text-[#2f7f7a]">
          <CheckCircle2 size={16} />
          <span>선택 완료: {selectedName} (위치 정보가 폼에 자동 적용되었습니다!)</span>
        </div>
      )}
    </div>
  );
}