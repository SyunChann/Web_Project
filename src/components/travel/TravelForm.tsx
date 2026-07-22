"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import type { Travel } from "@/data/travel";
import { PlaceSearch, type SelectedPlaceData } from "@/components/PlaceSearch";

type TravelFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  travel?: Travel;
  scope?: Travel["scope"];
  showSlugField?: boolean;
  legacyTravelIds?: string[];
};

type ItineraryPlace = SelectedPlaceData & {
  visitedAt: string;
  visitedTime: string;
};

const maxThumbnailWidth = 1200;
const maxThumbnailHeight = 1200;
const thumbnailQuality = 0.82;
const compressibleImageTypes = ["image/jpeg", "image/png", "image/webp"];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getCompressedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return `${baseName || "thumbnail"}.webp`;
}

function getFileNameFromPath(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(new URL(value, "http://local").pathname)
      .split("/")
      .filter(Boolean)
      .pop() ?? value;
  } catch {
    return value.split("/").filter(Boolean).pop() ?? value;
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", thumbnailQuality);
  });
}

async function compressThumbnail(file: File) {
  if (!compressibleImageTypes.includes(file.type)) {
    return file;
  }

  const image = await loadImage(file);
  const ratio = Math.min(
    1,
    maxThumbnailWidth / image.naturalWidth,
    maxThumbnailHeight / image.naturalHeight,
  );
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], getCompressedFileName(file.name), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      {required ? (
        <span className="text-[#5ca1e6]" aria-label="필수 입력">
          *
        </span>
      ) : (
        <span className="rounded bg-[#eee5dc] px-1.5 py-0.5 text-[11px] font-bold text-[#7a6f63]">
          선택
        </span>
      )}
    </span>
  );
}

export function TravelForm({
  action,
  submitLabel,
  travel,
  scope,
  showSlugField = false,
  legacyTravelIds = [],
}: TravelFormProps) {
  const reviewScope = scope ?? travel?.scope ?? "overseas";
  const isOverseas = reviewScope === "overseas";
  const primaryButtonClass = "bg-[#65a30d] hover:bg-[#4d7c0f]";
  const secondaryButtonClass = "hover:border-[#65a30d] hover:text-[#4d7c0f]";
  const focusInputClass = "focus:border-[#65a30d]";
  const currentThumbnailName = getFileNameFromPath(travel?.thumbnail);
  const [thumbnailStatus, setThumbnailStatus] = useState(
    currentThumbnailName
      ? `현재 썸네일: ${currentThumbnailName}. 새 파일을 선택하면 교체됩니다.`
      : "이미지는 업로드 전에 자동으로 1200px 이하 WebP로 압축됩니다.",
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const isItineraryMode = isOverseas && (!travel || travel.itinerary.length > 0);

  const [placeData, setPlaceData] = useState< SelectedPlaceData | null >(
    travel
      ? {
        storeName: travel.storeName,
          address: travel.address ?? "",
          latitude: travel.latitude ?? 0,
          longitude: travel.longitude ?? 0,
          placeId: travel.placeId ?? "",
          mapUrl: travel.mapUrl ?? "",
          photoUrl: travel.thumbnail,
      }
      : null,
  )
  const [itineraryPlaces, setItineraryPlaces] = useState<ItineraryPlace[]>(
    travel?.itinerary.map((place) => ({
      storeName: place.storeName,
      address: place.address ?? "",
      latitude: place.latitude ?? 0,
      longitude: place.longitude ?? 0,
      placeId: place.placeId ?? `existing-${place.storeName}-${place.visitedAt}-${place.visitedTime ?? ""}`,
      mapUrl: place.mapUrl ?? "",
      photoUrl: place.photoUrl,
      visitedAt: place.visitedAt,
      visitedTime: place.visitedTime?.slice(0, 5) ?? "",
    })) ?? [],
  );
  const orderedItineraryPlaces = [...itineraryPlaces].sort((left, right) => {
    const leftKey = `${left.visitedAt || "9999-12-31"}T${left.visitedTime || "23:59"}`;
    const rightKey = `${right.visitedAt || "9999-12-31"}T${right.visitedTime || "23:59"}`;

    return leftKey.localeCompare(rightKey, "en");
  });

  function addItineraryPlace(data: SelectedPlaceData) {
    const today = new Date().toISOString().slice(0, 10);

    setPlaceData(data);
    setItineraryPlaces((places) => {
      const existingIndex = places.findIndex((place) => place.placeId === data.placeId);

      if (existingIndex >= 0) {
        return places;
      }

      return [...places, { ...data, visitedAt: today, visitedTime: "" }];
    });
  }

  function updateItineraryPlace(
    placeId: string,
    field: "visitedAt" | "visitedTime",
    value: string,
  ) {
    setItineraryPlaces((places) =>
      places.map((place) =>
        place.placeId === placeId ? { ...place, [field]: value } : place,
      ),
    );
  }

  async function submitCompressedForm(formData: FormData) {
    const thumbnail = formData.get("thumbnail_file");

    if (thumbnail instanceof File && thumbnail.size > 0) {
      setIsCompressing(true);
      const compressedThumbnail = await compressThumbnail(thumbnail);
      formData.set("thumbnail_file", compressedThumbnail);
      setThumbnailStatus(
        compressedThumbnail.size < thumbnail.size
          ? `압축 완료: ${formatFileSize(thumbnail.size)} → ${formatFileSize(
              compressedThumbnail.size,
            )}`
          : `원본 유지: ${formatFileSize(thumbnail.size)}`,
      );
    }

    await action(formData);
    setIsCompressing(false);
  }

  return (
    <form action={submitCompressedForm} className="grid gap-5">
      <input type="hidden" name="scope" value={reviewScope} />

      {isItineraryMode ? (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>여행 제목</FieldLabel>
          <input
            name="tripTitle"
            defaultValue={travel?.tripTitle}
            required
            placeholder="예: 2026 도쿄 3박 4일"
            className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
          />
        </label>
      ) : (
        <input type="hidden" name="tripTitle" value={travel?.tripTitle ?? ""} />
      )}

      {showSlugField ? (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel>URL ID</FieldLabel>
          <input
            name="id"
            defaultValue={travel?.id}
          placeholder="예: my-favorite-restaurant"
          className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
          />
        </label>
      ) : null}

      <PlaceSearch
        key={isItineraryMode ? `itinerary-${itineraryPlaces.length}` : "travel-place"}
        onSelectPlace={isItineraryMode ? addItineraryPlace : (data) => setPlaceData(data)}
        label={isItineraryMode ? "여행 장소 추가" : isOverseas ? "여행 장소 검색" : "맛집 장소 검색"}
        description={
          isItineraryMode
            ? "장소를 선택할 때마다 여행 동선에 추가됩니다. 여러 장소를 계속 검색해 넣을 수 있습니다."
            : isOverseas
            ? "일본어 상호명으로 검색해도 됩니다. 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다."
            : "Google Maps에서 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다."
        }
        placeholder={
          isOverseas
            ? "例: 天麩羅処ひらお, 一蘭 新宿, 鳥貴族 渋谷"
            : "예: 도톤보리(추가 설명)"
        }
        language={isOverseas ? "ja" : "ko"}
        region={isOverseas ? "jp" : undefined}
        includedRegionCodes={isOverseas ? ["jp"] : undefined}
        allowAllPlaceTypes
        tone="travel"
      />

      {isItineraryMode ? (
        <section className="grid gap-3 rounded-md border border-[#d9efb9] bg-[#fbfff5] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#365314]">여행 동선</p>
              <p className="mt-1 text-xs leading-5 text-[#64748b]">장소마다 방문일과 시간을 지정하세요.</p>
            </div>
            <span className="rounded-md bg-[#ecfccb] px-2.5 py-1 text-xs font-bold text-[#3f6212]">{itineraryPlaces.length}개 장소</span>
          </div>

          {itineraryPlaces.length ? (
            <div className="grid gap-3">
              {orderedItineraryPlaces.map((place) => (
                <div key={place.placeId} className="grid gap-3 rounded-md border border-[#d9efb9] bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-bold text-[#17202a]"><MapPin size={15} className="text-[#65a30d]" />{place.storeName}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-[#64748b]">{place.address}</p>
                  </div>
                  <label className="grid gap-1 text-xs font-bold text-[#52616b]">
                    방문일
                    <input type="date" value={place.visitedAt} onChange={(event) => updateItineraryPlace(place.placeId, "visitedAt", event.target.value)} className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-3 py-2 text-sm font-normal outline-none ${focusInputClass}`} />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-[#52616b]">
                    방문시간
                    <input type="time" value={place.visitedTime} onChange={(event) => updateItineraryPlace(place.placeId, "visitedTime", event.target.value)} className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-3 py-2 text-sm font-normal outline-none ${focusInputClass}`} />
                  </label>
                  <button type="button" onClick={() => setItineraryPlaces((places) => places.filter((item) => item.placeId !== place.placeId))} className="inline-flex h-10 items-center justify-center rounded-md border border-[#f1c9c6] px-3 text-[#be4b49] transition hover:bg-[#fff5f3]" aria-label={`${place.storeName} 삭제`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-[#cce5a4] px-3 py-4 text-sm font-semibold text-[#64748b]"><CalendarDays size={17} className="text-[#65a30d]" />위에서 첫 여행 장소를 검색해 추가해 주세요.</div>
          )}
          <input type="hidden" name="itinerary" value={JSON.stringify(itineraryPlaces)} />
          {legacyTravelIds.length ? <input type="hidden" name="legacyTravelIds" value={JSON.stringify(legacyTravelIds)} /> : null}
        </section>
      ) : null}

      {placeData && (
        <>
          <input type="hidden" name="address" value={placeData.address} />
          <input type="hidden" name="latitude" value={placeData.latitude} />
          <input type="hidden" name="longitude" value={placeData.longitude} />
          <input type="hidden" name="placeId" value={placeData.placeId} />
          <input type="hidden" name="mapUrl" value={placeData.mapUrl} />
          {reviewScope === "overseas" && placeData.photoUrl && !isItineraryMode ? (
            <input type="hidden" name="thumbnail" value={placeData.photoUrl} />
          ) : null}
        </>
      )}

      {reviewScope === "overseas" ? (
        <input
          type="hidden"
          name="title"
          value={placeData?.storeName ?? travel?.title ?? ""}
        />
      ) : (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>제목</FieldLabel>
          <input
            name="title"
            defaultValue={travel?.title}
            required
            className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
          />
        </label>
      )}

      {isItineraryMode ? (
        <input type="hidden" name="storeName" value={placeData?.storeName ?? ""} />
      ) : (
      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>여행지</FieldLabel>
        <input
          name="storeName"
          value={placeData?.storeName ?? ""}
          onChange={(e) =>
            setPlaceData((prev) =>
              prev
                ? { ...prev, storeName: e.target.value }
                : {
                    storeName: e.target.value,
                    address: "",
                    latitude: 0,
                    longitude: 0,
                    placeId: "",
                    mapUrl: "",
                  },
            )
          }
          required
          placeholder="위에 있는 구글 지도 검색을 이용하면 자동 입력됩니다."
          className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
        />
      </label>
      )}

      {reviewScope === "overseas" ? (
        <>
          {/* <input type="hidden" name="category" value="other" /> */}
          <input type="hidden" name="companion" value="other" />
          <input type="hidden" name="hasParking" value="false" />
          <input type="hidden" name="willRevisit" value="false" />

          <div className="flex w-full gap-4">
            <label className="grid w-2/3 gap-2 text-sm font-bold">
              <FieldLabel required>카테고리</FieldLabel>
                <select
                  name="category"
                  defaultValue={travel?.category ?? "korea"}
                  required
                  className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}>
                  <option value="korea">한국</option>
                  <option value="japan">일본</option>
                  <option value="china">중국</option>
                  <option value="other">기타</option>
                </select>
            </label>

            <label className="grid w-2/3 gap-2 text-sm font-bold">
              <FieldLabel required>도시</FieldLabel>
              <input
                name="city"   
                type="text"     
                defaultValue={travel?.city ?? ""} 
                placeholder="예: 후쿠오카, 도쿄" 
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="grid w-2/3 gap-2 text-sm font-bold">
              <FieldLabel required>별점</FieldLabel>
              <input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                defaultValue={travel?.rating ?? 4}
                required
                className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
              />
            </label>
          </div>

          {!isItineraryMode ? <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              <FieldLabel required>방문일</FieldLabel>
              <input
                name="visitedAt"
                type="date"
                defaultValue={travel?.visitedAt ?? new Date().toISOString().slice(0, 10)}
                required
                className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              <FieldLabel>방문시간</FieldLabel>
              <input
                name="visitedTime"
                type="time"
                defaultValue={travel?.visitedTime?.slice(0, 5)}
                className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
              />
            </label>
          </div>
          : null}
        </>
      ) : null}

      {reviewScope === "domestic" ? (
      <div className="grid gap-5 sm:grid-cols-3">

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>별점</FieldLabel>
          <input
            name="rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            defaultValue={travel?.rating ?? 4}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>방문일</FieldLabel>
          <input
            name="visitedAt"
            type="date"
            defaultValue={travel?.visitedAt}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
          />
        </label>
        
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>주차여부</FieldLabel>
            <select
              name="hasParking"
              defaultValue={travel?.hasParking}
              required
              className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
            >
              <option value="true">가능</option>
              <option value="false">불가능</option>
            </select>
        </label>
      </div>
      ) : null}

      {reviewScope === "domestic" || isItineraryMode ? (
      <>
      <input type="hidden" name="thumbnail" value={travel?.thumbnail ?? ""} />

      <label className="grid gap-2 text-sm font-bold rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-4">
        <FieldLabel>{isItineraryMode ? "대표 사진" : "썸네일 업로드"}</FieldLabel>
        {travel?.thumbnail ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#d8cfc2] bg-white p-3">
            <NextImage
              src={travel.thumbnail}
              alt={travel.thumbnailAlt}
              width={96}
              height={54}
              className="aspect-video w-24 rounded object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#52616b]">현재 썸네일</p>
              <p className="break-all text-sm font-normal text-[#17202a]">
                {currentThumbnailName}
              </p>
            </div>
          </div>
        ) : null}
        <input
          name="thumbnail_file"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            setThumbnailStatus(
              file
                ? `선택됨: ${file.name} (${formatFileSize(file.size)})`
                : "이미지는 업로드 전에 자동으로 1200px 이하 WebP로 압축됩니다.",
            );
          }}
          className="sr-only"
        />
        <div className="flex min-w-0 flex-wrap items-start gap-3 rounded-md border border-[#d8cfc2] bg-white p-3">
          <span className={`shrink-0 rounded-md px-3 py-2 text-sm font-bold text-white ${isItineraryMode ? "bg-[#65a30d]" : "bg-[#5ca1e6]"}`}>
            파일 선택
          </span>
          <span className="min-w-0 flex-1 break-all text-xs font-normal leading-5 text-[#7a6f63]">
            {thumbnailStatus}
          </span>
        </div>
      </label>
      </>
      ) : null}

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>{isItineraryMode ? "여행 메모" : "요약"}</FieldLabel>
        <textarea
          name="summary"
          defaultValue={travel?.summary}
          required
          rows={3}
          className={`resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:bg-white ${focusInputClass}`}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>{isItineraryMode ? "여행 기록" : "평가"}</FieldLabel>
        <textarea
          name="review"
          defaultValue={travel?.review}
          required
          rows={8}
          className={`resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:bg-white ${focusInputClass}`}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isCompressing}
          className={`rounded-md px-5 py-3 text-sm font-bold text-white shadow-sm transition ${primaryButtonClass}`}
        >
          {isCompressing ? "이미지 압축 중..." : submitLabel}
        </button>
        <Link
          href={travel ? `/travel/${travel.id}` : "/reviews"}
          className={`rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition ${secondaryButtonClass}`}
        >
          취소
        </Link>
      </div>
    </form>
  );
}