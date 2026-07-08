"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { RestaurantsReview } from "@/data/restaurants";
import { PlaceSearch, type SelectedPlaceData } from "@/components/PlaceSearch";

type RestaurantsReviewFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  restaurantsReview?: RestaurantsReview;
  scope?: RestaurantsReview["scope"];
  showSlugField?: boolean;
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
        <span className="text-[#e57632]" aria-label="필수 입력">
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

export function RestaurantsReviewForm({
  action,
  submitLabel,
  restaurantsReview,
  scope,
  showSlugField = false,
}: RestaurantsReviewFormProps) {
  const reviewScope = scope ?? restaurantsReview?.scope ?? "domestic";
  const isOverseas = reviewScope === "overseas";
  const primaryButtonClass = isOverseas
    ? "bg-[#0284c7] hover:bg-[#0369a1]"
    : "bg-[#e57632] hover:bg-[#a83f3d]";
  const secondaryButtonClass = isOverseas
    ? "hover:border-[#0284c7] hover:text-[#0284c7]"
    : "hover:border-[#e57632] hover:text-[#e57632]";
  const focusInputClass = isOverseas
    ? "focus:border-[#0284c7]"
    : "focus:border-[#e57632]";
  const currentThumbnailName = getFileNameFromPath(restaurantsReview?.thumbnail);
  const [thumbnailStatus, setThumbnailStatus] = useState(
    currentThumbnailName
      ? `현재 썸네일: ${currentThumbnailName}. 새 파일을 선택하면 교체됩니다.`
      : "이미지는 업로드 전에 자동으로 1200px 이하 WebP로 압축됩니다.",
  );
  const [isCompressing, setIsCompressing] = useState(false);

  const [placeData, setPlaceData] = useState< SelectedPlaceData | null >(
    restaurantsReview
      ? {
        storeName: restaurantsReview.storeName,
          address: restaurantsReview.address ?? "",
          latitude: restaurantsReview.latitude ?? 0,
          longitude: restaurantsReview.longitude ?? 0,
          placeId: restaurantsReview.placeId ?? "",
          mapUrl: restaurantsReview.mapUrl ?? "",
          photoUrl: restaurantsReview.thumbnail,
      }
      : null,
  )

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

      {showSlugField ? (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel>URL ID</FieldLabel>
          <input
            name="id"
            defaultValue={restaurantsReview?.id}
          placeholder="예: my-favorite-restaurant"
          className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
          />
        </label>
      ) : null}

      <PlaceSearch
        onSelectPlace={(data) => setPlaceData(data)}
        label={isOverseas ? "일본 맛집 장소 검색" : "맛집 장소 검색"}
        description={
          isOverseas
            ? "일본어 상호명으로 검색해도 됩니다. 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다."
            : "Google Maps에서 장소를 선택하면 상호명, 주소, 위도/경도가 자동으로 입력됩니다."
        }
        placeholder={
          isOverseas
            ? "例: 天麩羅処ひらお, 一蘭 新宿, 鳥貴族 渋谷"
            : "예: 강남 라멘, 성수 카페, 홍대 스시"
        }
        language={isOverseas ? "ja" : "ko"}
        region={isOverseas ? "jp" : undefined}
        includedRegionCodes={isOverseas ? ["jp"] : undefined}
        tone={isOverseas ? "overseas" : "restaurant"}
      />

      {placeData && (
        <>
          <input type="hidden" name="address" value={placeData.address} />
          <input type="hidden" name="latitude" value={placeData.latitude} />
          <input type="hidden" name="longitude" value={placeData.longitude} />
          <input type="hidden" name="placeId" value={placeData.placeId} />
          <input type="hidden" name="mapUrl" value={placeData.mapUrl} />
          {reviewScope === "overseas" && placeData.photoUrl ? (
            <input type="hidden" name="thumbnail" value={placeData.photoUrl} />
          ) : null}
        </>
      )}

      {reviewScope === "overseas" ? (
        <input
          type="hidden"
          name="title"
          value={placeData?.storeName ?? restaurantsReview?.title ?? ""}
        />
      ) : (
      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>제목</FieldLabel>
        <input
          name="title"
          defaultValue={restaurantsReview?.title}
          required
          className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
        />
      </label>
      )}

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>식당명</FieldLabel>
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

      {reviewScope === "overseas" ? (
        <>
          <input type="hidden" name="category" value="other" />
          <input type="hidden" name="companion" value="other" />
          <input type="hidden" name="hasParking" value="false" />
          <input type="hidden" name="willRevisit" value="false" />
          <label className="grid gap-2 text-sm font-bold">
            <FieldLabel required>별점</FieldLabel>
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              defaultValue={restaurantsReview?.rating ?? 4}
              required
              className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
            />
          </label>
        </>
      ) : null}

      {reviewScope === "domestic" ? (
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>카테고리</FieldLabel>
            <select
              name="category"
              defaultValue={restaurantsReview?.category ?? "korean"}
              required
          className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
            >
              <option value="korean">한식</option>
              <option value="japanese">일식</option>
              <option value="chinese">중식</option>
              <option value="western">양식</option>
              <option value="asian">아시아</option>
              <option value="cafe">카페</option>
              <option value="other">기타</option>
            </select>
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>방문유형</FieldLabel>
            <select
              name="companion"
              defaultValue={restaurantsReview?.companion ?? "solo"}
              required
              className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:bg-white ${focusInputClass}`}
            >
              <option value="solo">혼밥</option>
              <option value="date">데이트</option>
              <option value="friends">친목모임</option>
              <option value="family">가족모임</option>
              <option value="business">비즈니스</option>
              <option value="other">기타</option>
            </select>
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>별점</FieldLabel>
          <input
            name="rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            defaultValue={restaurantsReview?.rating ?? 4}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>방문일</FieldLabel>
          <input
            name="visitedAt"
            type="date"
            defaultValue={restaurantsReview?.visitedAt}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
          />
        </label>
        
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>주차여부</FieldLabel>
            <select
              name="hasParking"
              defaultValue={restaurantsReview?.hasParking}
              required
              className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
            >
              <option value="true">가능</option>
              <option value="false">불가능</option>
            </select>
        </label>
        
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>재방문여부</FieldLabel>
            <select
              name="willRevisit"
              defaultValue={restaurantsReview?.willRevisit}
              required
              className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#e57632] focus:bg-white"
            >
              <option value="true">있음</option>
              <option value="false">없음</option>
            </select>
        </label>
      </div>
      ) : null}

      {reviewScope === "domestic" ? (
      <>
      <input type="hidden" name="thumbnail" value={restaurantsReview?.thumbnail ?? ""} />

      <label className="grid gap-2 text-sm font-bold rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-4">
        <FieldLabel>썸네일 업로드</FieldLabel>
        {restaurantsReview?.thumbnail ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#d8cfc2] bg-white p-3">
            <NextImage
              src={restaurantsReview.thumbnail}
              alt={restaurantsReview.thumbnailAlt}
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
          <span className="shrink-0 rounded-md bg-[#e57632] px-3 py-2 text-sm font-bold text-white">
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
        <FieldLabel required>요약</FieldLabel>
        <textarea
          name="summary"
          defaultValue={restaurantsReview?.summary}
          required
          rows={3}
          className={`resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:bg-white ${focusInputClass}`}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>맛집평</FieldLabel>
        <textarea
          name="review"
          defaultValue={restaurantsReview?.review}
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
          href={restaurantsReview ? `/restaurants/${restaurantsReview.id}` : "/reviews"}
          className={`rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition ${secondaryButtonClass}`}
        >
          취소
        </Link>
      </div>
    </form>
  );
}
