"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { loadKakaoMapsScript } from "@/lib/kakaoMaps";

// 리뷰 폼에서 저장/사용하는 최종 데이터 형태
export type SelectedPlaceData = {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  mapUrl: string;
  placeId?: string;
  photoUrl?: string;
};

// 카카오 키워드 검색 결과 하나(검색 결과 리스트 렌더링용 내부 타입)
type KakaoPlaceResult = {
  id: string;
  placeName: string;
  categoryName: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  placeUrl: string;
};

type DomesticPlaceSearchProps = {
  onSelectPlace: (place: SelectedPlaceData) => void;
  label?: string;
  description?: string;
  placeholder?: string;
};

export function DomesticPlaceSearch({
  onSelectPlace,
  label,
  description,
  placeholder = "상호명으로 검색 (예: 스타벅스 강남점)",
}: DomesticPlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setErrorMessage("");
    setResults([]);

    try {
      // services 라이브러리(키워드 장소 검색)까지 포함해서 로드
      await loadKakaoMapsScript();

      const places = new window.kakao.maps.services.Places();

      places.keywordSearch(trimmed, (data, status) => {
        setIsSearching(false);

        if (status !== window.kakao.maps.services.Status.OK) {
          setResults([]);
          setErrorMessage("검색 결과가 없습니다. 다른 상호명으로 시도해보세요.");
          return;
        }

        const mapped: KakaoPlaceResult[] = data.map((place) => ({
          id: place.id,
          placeName: place.place_name,
          categoryName: place.category_name,
          address: place.road_address_name || place.address_name,
          phone: place.phone,
          latitude: Number(place.y),
          longitude: Number(place.x),
          placeUrl: place.place_url,
        }));

        setResults(mapped);
      });
    } catch (error) {
      console.error("카카오맵 상호명 검색 실패:", error);
      setErrorMessage("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsSearching(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 상위 리뷰 작성 폼(<form>) 안에 중첩된 컴포넌트라 실제 <form> 태그를 쓸 수 없습니다.
    // 그래서 Enter 키를 직접 감지해 검색을 실행하고, 상위 폼이 제출되는 것을 막습니다.
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }

  function handleSelect(place: KakaoPlaceResult) {
    // 폼이 기대하는 SelectedPlaceData 형태로 변환해서 전달
    const selected: SelectedPlaceData = {
      storeName: place.placeName,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      mapUrl: place.placeUrl,
      placeId: place.id,
    };

    onSelectPlace(selected);
    setResults([]);
    setQuery(place.placeName);
  }

  return (
    <div className="relative">
      {label ? (
        <p className="mb-1 text-sm font-bold text-[#17202a]">{label}</p>
      ) : null}
      {description ? (
        <p className="mb-2 text-xs leading-5 text-[#52616b]">{description}</p>
      ) : null}

      {/* 주의: 이 컴포넌트는 리뷰 작성 폼의 <form> 내부에서 쓰이므로
          여기서는 절대 <form> 태그를 쓰면 안 됩니다 (HTML은 form 중첩을 허용하지 않음). */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-[#fdddba] px-3 py-2 text-sm outline-none focus:border-[#e57632]"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[#e57632] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0369a1] disabled:opacity-60"
        >
          {isSearching ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Search size={16} />
          )}
          검색
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-2 text-xs font-semibold text-[#a73735]">
          {errorMessage}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-[#fdddba] bg-white shadow-lg">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-[#f0f9ff] px-4 py-3 text-left transition hover:bg-[#f0f9ff] last:border-b-0"
              >
                <span className="flex items-center gap-1 text-sm font-bold text-[#17202a]">
                  <MapPin size={14} className="text-[#e57632]" />
                  {place.placeName}
                </span>
                {place.categoryName ? (
                  <span className="text-xs text-[#52616b]">
                    {place.categoryName}
                  </span>
                ) : null}
                <span className="text-xs text-[#52616b]">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
