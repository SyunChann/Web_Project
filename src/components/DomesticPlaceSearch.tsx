"use client";

import { CheckCircle2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { loadNaverMapsScript } from "@/lib/naverMaps"; // 작성하신 헬퍼 함수 임포트

export type SelectedPlaceData = {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  mapUrl: string;
};

type PlaceSearchProps = {
  onSelectPlace: (data: SelectedPlaceData) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  tone?: "overseas" | "travel";
};

type NaverPlaceItem = {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // KATECH X 정수
  mapy: string; // KATECH Y 정수
};

function cleanTitle(title: string) {
  return title.replace(/<[^>]*>?/g, "");
}

// 네이버 지역 API의 mapx, mapy(KATECH 좌표계)를 위도/경도(WGS84)로 변환
function convertKatechToLatLon(mapx: string, mapy: string) {
  const x = parseFloat(mapx);
  const y = parseFloat(mapy);
  return {
    latitude: y / 10000000,
    longitude: x / 10000000,
  };
}

export function DomesticPlaceSearch({
  onSelectPlace,
  label = "국내 맛집 장소 검색",
  description = "네이버 검색을 통해 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다.",
  placeholder = "예: 강남역 맛집, 성수동 카페, 홍대 타코",
  tone = "travel",
}: PlaceSearchProps) {
  const inputId = useId();
  const latestRequestRef = useRef(0);
  const focusBorderClass =
    tone === "travel"
      ? "focus:border-[#65a30d]"
      : tone === "overseas"
      ? "focus:border-[#0284c7]"
      : "focus:border-[#be4b49]";

  const [query, setQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false); // 네이버 SDK 로드 상태
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<NaverPlaceItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // 1. 컴포넌트 마운트 시 네이버 지도 SDK 스크립트 로드 수행
  useEffect(() => {
    let isMounted = true;

    loadNaverMapsScript()
      .then(() => {
        if (!isMounted) return;
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        console.error("네이버 지도 SDK를 불러오지 못했습니다:", error);
        setErrorMessage(
          "네이버 지도 SDK를 불러오지 못했습니다. 환경 변수 설정을 확인해 주세요."
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. 검색어 변경 시 디바운스 처리하여 백엔드 API 호출
  useEffect(() => {
    const trimmedQuery = query.trim();

    // SDK가 로드되지 않았거나 검색어가 2자 미만이면 패스
    if (!isLoaded || trimmedQuery.length < 2) return;

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    const timer = window.setTimeout(() => {
      setIsSearching(true);

      fetch(`/api/naver-search?query=${encodeURIComponent(trimmedQuery)}`)
        .then((res) => {
          if (!res.ok) throw new Error("검색 실패");
          return res.json();
        })
        .then((data) => {
          if (latestRequestRef.current !== requestId) return;
          setErrorMessage("");
          setSuggestions(data.items || []);
        })
        .catch((error) => {
          if (latestRequestRef.current !== requestId) return;
          console.error("네이버 장소 검색 중 오류 발생:", error);
          setSuggestions([]);
          setErrorMessage(
            "장소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          );
        })
        .finally(() => {
          if (latestRequestRef.current === requestId) {
            setIsSearching(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, isLoaded]);

  // 3. 리스트 항목 선택 시 데이터 가공 및 전달
  const handleSelectSuggestion = (item: NaverPlaceItem) => {
    try {
      const cleanName = cleanTitle(item.title);
      const { latitude, longitude } = convertKatechToLatLon(item.mapx, item.mapy);

      const extractedData: SelectedPlaceData = {
        storeName: cleanName,
        address: item.roadAddress || item.address || "주소 정보 없음",
        latitude,
        longitude,
        mapUrl: `https://map.naver.com/v5/search/${encodeURIComponent(cleanName)}`,
      };

      setQuery(cleanName);
      setSuggestions([]);
      setErrorMessage("");
      setSelectedName(cleanName);
      onSelectPlace(extractedData);
    } catch (error) {
      console.error("장소 정보 가공 중 오류 발생:", error);
      setErrorMessage("장소 정보를 처리하지 못했습니다.");
    }
  };

  return (
    <div className="w-full rounded-lg border border-[#ddd6cc] bg-[#fffdf8] p-4 shadow-sm">
      <label htmlFor={inputId} className="block text-sm font-bold text-[#17202a]">
        {label}
      </label>
      <p className="mt-1 text-xs text-[#6b7280]">{description}</p>

      <div className="relative mt-3">
        <Search
          size={18}
          className="pointer-events-none absolute top-[22px] left-3 z-10 -translate-y-1/2 text-[#8a95a1]"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          disabled={!isLoaded} // 로드되기 전에는 비활성화 (기존 구글맵 로직과 동일)
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setSelectedName(null);

            if (nextQuery.trim().length < 2) {
              setSuggestions([]);
              setIsSearching(false);
            }
          }}
          placeholder={
            isLoaded ? placeholder : "네이버 지도 설정을 불러오는 중..."
          }
          autoComplete="off"
          className={`h-11 w-full rounded-md border border-[#d8cfc2] bg-white pr-3 pl-10 text-sm font-semibold outline-none transition placeholder:text-[#8a95a1] disabled:bg-[#f7f2ea] ${focusBorderClass}`}
        />

        {isSearching ? (
          <div className="absolute top-[52px] right-0 left-0 z-20 rounded-md border border-[#ddd6cc] bg-white px-4 py-3 text-sm font-semibold text-[#6b7280] shadow-lg">
            장소를 검색하는 중...
          </div>
        ) : null}

        {!isSearching && suggestions.length > 0 ? (
          <div className="absolute top-[52px] right-0 left-0 z-20 max-h-60 overflow-y-auto rounded-md border border-[#ddd6cc] bg-white shadow-lg">
            {suggestions.map((item, index) => (
              <button
                key={`${item.mapx}-${item.mapy}-${index}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="block w-full px-4 py-3 text-left transition hover:bg-[#fbf5ee] focus:bg-[#fbf5ee] focus:outline-none"
              >
                <div className="text-sm font-semibold text-[#17202a]">
                  {cleanTitle(item.title)}
                </div>
                <div className="mt-0.5 text-xs text-[#8a95a1]">
                  {item.roadAddress || item.address}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-[#f0c9c6] bg-[#fff5f3] px-3 py-2 text-xs font-bold text-[#a73735]">
          {errorMessage}
        </p>
      ) : null}

      {selectedName ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-[#2f7f7a] bg-[#eefaf8] px-3 py-2 text-xs font-bold text-[#2f7f7a]">
          <CheckCircle2 size={16} />
          <span>선택 완료: {selectedName}</span>
        </div>
      ) : null}
    </div>
  );
}