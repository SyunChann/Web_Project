/// <reference types="google.maps" />
"use client";

import { CheckCircle2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { loadGoogleMapsLibrary } from "@/lib/googleMaps";

export type SelectedPlaceData = {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  mapUrl: string;
  photoUrl?: string;
};

type PlaceSearchProps = {
  onSelectPlace: (data: SelectedPlaceData) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  language?: string;
  region?: string;
  includedRegionCodes?: string[];
  tone?: "restaurant" | "overseas";
};

type AutocompleteSuggestionItem = {
  placePrediction?: {
    text?: {
      toString: () => string;
    };
    toPlace: () => google.maps.places.Place;
  };
};

type AutocompleteSuggestionRequest = {
  input: string;
  includedPrimaryTypes: string[];
  language: string;
  includedRegionCodes?: string[];
  region?: string;
};

type AutocompleteSuggestionApi = {
  fetchAutocompleteSuggestions: (
    request: AutocompleteSuggestionRequest,
  ) => Promise<{ suggestions: AutocompleteSuggestionItem[] }>;
};

function getSuggestionText(suggestion: AutocompleteSuggestionItem) {
  return suggestion.placePrediction?.text?.toString() ?? "장소 이름 없음";
}

export function PlaceSearch({
  onSelectPlace,
  label = "맛집 장소 검색",
  description = "Google Maps에서 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다.",
  placeholder = "예: 신주쿠 라멘, 오사카 카페, 도쿄 스시",
  language = "ko",
  region,
  includedRegionCodes,
  tone = "restaurant",
}: PlaceSearchProps) {
  const inputId = useId();
  const latestRequestRef = useRef(0);
  const regionCodesKey = includedRegionCodes?.join(",") ?? "";
  const focusBorderClass =
    tone === "overseas" ? "focus:border-[#0284c7]" : "focus:border-[#be4b49]";
  const [placesLibrary, setPlacesLibrary] =
    useState<google.maps.PlacesLibrary | null>(null);
  const [query, setQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>(
    [],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsLibrary("places")
      .then((loadedPlacesLibrary) => {
        if (!isMounted) return;

        setPlacesLibrary(loadedPlacesLibrary);
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        console.error("Google Maps 장소 검색을 불러오지 못했습니다:", error);
        setErrorMessage(
          "Google Maps 장소 검색을 불러오지 못했습니다. API 키 설정을 확인해 주세요.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!placesLibrary || trimmedQuery.length < 2) {
      return;
    }

    const autocompleteSuggestion = placesLibrary.AutocompleteSuggestion as
      | AutocompleteSuggestionApi
      | undefined;

    if (!autocompleteSuggestion) {
      return;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    const timer = window.setTimeout(() => {
      setIsSearching(true);

      const request: AutocompleteSuggestionRequest = {
        input: trimmedQuery,
        includedPrimaryTypes: [
          "restaurant",
          "cafe",
          "bar",
          "bakery",
          "meal_takeaway",
        ],
        language,
      };

      if (region) {
        request.region = region;
      }

      if (includedRegionCodes?.length) {
        request.includedRegionCodes = includedRegionCodes;
      }

      autocompleteSuggestion
        .fetchAutocompleteSuggestions(request)
        .then(({ suggestions: nextSuggestions }) => {
          if (latestRequestRef.current !== requestId) return;

          setErrorMessage("");
          setSuggestions(nextSuggestions);
        })
        .catch((error: unknown) => {
          if (latestRequestRef.current !== requestId) return;

          console.error("Google Maps 장소 검색 중 오류가 발생했습니다:", error);
          setSuggestions([]);
          setErrorMessage(
            "Google Maps 장소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          );
        })
        .finally(() => {
          if (latestRequestRef.current === requestId) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    includedRegionCodes,
    language,
    placesLibrary,
    query,
    region,
    regionCodesKey,
  ]);

  const handleSelectSuggestion = async (
    suggestion: AutocompleteSuggestionItem,
  ) => {
    const placePrediction = suggestion.placePrediction;

    if (!placePrediction) return;

    try {
      setIsSearching(true);

      const place = placePrediction.toPlace();

      await place.fetchFields({
        fields: [
          "displayName",
          "formattedAddress",
          "googleMapsURI",
          "id",
          "location",
          "photos",
        ],
      });

      if (!place.location || !place.id) {
        setErrorMessage(
          "장소의 위치 정보를 불러오지 못했습니다. 다른 검색 결과를 선택해 주세요.",
        );
        return;
      }

      const extractedData: SelectedPlaceData = {
        storeName: place.displayName || "상호명 없음",
        address: place.formattedAddress || "주소 정보 없음",
        latitude: place.location.lat(),
        longitude: place.location.lng(),
        placeId: place.id,
        mapUrl:
          place.googleMapsURI ||
          `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        photoUrl: place.photos?.[0]?.getURI({
          maxWidth: 960,
          maxHeight: 540,
        }),
      };

      setQuery(extractedData.storeName);
      setSuggestions([]);
      setErrorMessage("");
      setSelectedName(extractedData.storeName);
      onSelectPlace(extractedData);
    } catch (error) {
      console.error("Google Maps 장소 정보를 불러오지 못했습니다:", error);
      setErrorMessage(
        "장소 정보를 불러오지 못했습니다. 다른 검색 결과를 선택해 주세요.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const displayedErrorMessage =
    errorMessage ||
    (isLoaded && placesLibrary && !placesLibrary.AutocompleteSuggestion
      ? "Google Maps 장소 자동완성을 사용할 수 없습니다. API 설정을 확인해 주세요."
      : "");

  return (
    <div className="w-full rounded-lg border border-[#ddd6cc] bg-[#fffdf8] p-4 shadow-sm">
      <label
        htmlFor={inputId}
        className="block text-sm font-bold text-[#17202a]"
      >
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
          disabled={!isLoaded}
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
            isLoaded ? placeholder : "Google Maps 장소 검색을 불러오는 중..."
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
          <div className="absolute top-[52px] right-0 left-0 z-20 overflow-hidden rounded-md border border-[#ddd6cc] bg-white shadow-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${getSuggestionText(suggestion)}-${index}`}
                type="button"
                onClick={() => void handleSelectSuggestion(suggestion)}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#17202a] transition hover:bg-[#fbf5ee] focus:bg-[#fbf5ee] focus:outline-none"
              >
                {getSuggestionText(suggestion)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {displayedErrorMessage ? (
        <p className="mt-3 rounded-md border border-[#f0c9c6] bg-[#fff5f3] px-3 py-2 text-xs font-bold text-[#a73735]">
          {displayedErrorMessage}
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
