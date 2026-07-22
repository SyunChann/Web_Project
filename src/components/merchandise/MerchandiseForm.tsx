"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState, type ReactNode, type KeyboardEvent } from "react";
import { searchNaverProducts, type NaverProductItem } from "@/lib/naverMerchandise";
import type { MerchandiseReview } from "@/data/merchandise";

type MerchandiseReviewFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  review?: MerchandiseReview;
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
  if (!value) return "";
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
  if (!compressibleImageTypes.includes(file.type)) return file;

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

  if (!context) return file;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);
  if (!blob || blob.size >= file.size) return file;

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
        <span className="text-[#be4b49]" aria-label="필수 입력">*</span>
      ) : (
        <span className="rounded bg-[#eee5dc] px-1.5 py-0.5 text-[11px] font-bold text-[#7a6f63]">선택</span>
      )}
    </span>
  );
}

// 네이버 API의 HTML 태그(<b> 등) 제거 유틸리티
function cleanHtmlTags(str: string) {
  return str.replace(/<[^>]*>?/gm, "");
}

export function MerchandiseReviewForm({
  action,
  submitLabel,
  review,
  showSlugField = false,
}: MerchandiseReviewFormProps) {
  const currentThumbnailName = getFileNameFromPath(review?.thumbnail);
  const [thumbnailStatus, setThumbnailStatus] = useState(
    currentThumbnailName
      ? `현재 썸네일: ${currentThumbnailName}. 새 파일을 선택하면 교체됩니다.`
      : "이미지는 업로드 전에 자동으로 1200px 이하 WebP로 압축됩니다.",
  );
  const [isCompressing, setIsCompressing] = useState(false);

  // 네이버 상품 검색 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NaverProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    productId?: string | null;
    productName?: string | null;
    lprice?: string | number | null; // 네이버 API(string)와 DB(number) 모두 호환되도록 수정
    image?: string | null;
  } | null>(
    review?.productId
      ? {
          productId: review.productId,
          productName: review.productName,
          lprice: review.currentLowestPrice,
          image: review.thumbnail,
        }
      : null
  );

  // 네이버 쇼핑 API 호출 함수
  async function handleSearchProduct() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const items = await searchNaverProducts(searchQuery);
      setSearchResults(items);
    } catch (error) {
      alert("상품 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      console.log(error);
    } finally {
      setIsSearching(false);
    }
  }

  // 검색창에서 엔터 눌렀을 때 폼 전송 방지 및 검색 실행
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchProduct();
    }
  }

  async function submitCompressedForm(formData: FormData) {
    const thumbnail = formData.get("thumbnail_file");

    if (thumbnail instanceof File && thumbnail.size > 0) {
      setIsCompressing(true);
      const compressedThumbnail = await compressThumbnail(thumbnail);
      formData.set("thumbnail_file", compressedThumbnail);
      setThumbnailStatus(
        compressedThumbnail.size < thumbnail.size
          ? `압축 완료: ${formatFileSize(thumbnail.size)} → ${formatFileSize(compressedThumbnail.size)}`
          : `원본 유지: ${formatFileSize(thumbnail.size)}`,
      );
    }

    if (selectedProduct?.productId) {
      formData.set("productId", selectedProduct.productId);
      formData.set("productName", selectedProduct.productName || "");
      formData.set("currentLowestPrice", String(selectedProduct.lprice) || "");
    }

    await action(formData);
    setIsCompressing(false);
  }

  return (
    <form action={submitCompressedForm} className="grid gap-5">
      <div className="grid gap-3 rounded-lg border border-[#d8cfc2] bg-[#fbfaf7] p-4">
        <FieldLabel>네이버 쇼핑 상품 연동 (최저가 비교용)</FieldLabel>
        
        {selectedProduct?.productId ? (
          <div className="flex items-center justify-between rounded-md border border-[#9349be] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              {selectedProduct.image && (
                <img src={selectedProduct.image} alt="" className="h-12 w-12 shrink-0 rounded object-cover border" />
              )}
              <div className="min-w-0">
                <span className="inline-block rounded bg-[#eee5dc] px-1.5 py-0.5 text-[10px] font-bold text-[#7a6f63] mb-1">
                  연동된 상품
                </span>
                <p className="truncate text-sm font-bold text-[#17202a]">{selectedProduct.productName}</p>
                <p className="text-xs font-bold text-[#9349be]">
                  현재 최저가: {Number(selectedProduct.lprice).toLocaleString()}원
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="shrink-0 text-xs font-bold text-[#7a6f63] underline hover:text-[#a749be] ml-2"
            >
              연동 해제
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="리뷰할 상품명을 입력하세요 (예: 에어팟 프로, 오메가3)"
              className="flex-1 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm outline-none focus:border-[#be4b49]"
            />
            <button
              type="button"
              onClick={handleSearchProduct}
              disabled={isSearching}
              className="shrink-0 rounded-md bg-[#9249be] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#863da8] disabled:opacity-50"
            >
              {isSearching ? "검색 중..." : "상품 검색"}
            </button>
          </div>
        )}

        {searchResults.length > 0 && !selectedProduct?.productId && (
          <ul className="max-h-60 overflow-y-auto divide-y divide-[#eee5dc] rounded-md border border-[#d8cfc2] bg-white">
            {searchResults.map((item) => {
              const cleanTitle = cleanHtmlTags(item.title);
              return (
                <li key={item.productId} className="flex items-center justify-between p-2 hover:bg-[#fbfaf7]">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#17202a]">{cleanTitle}</p>
                      <span className="text-[11px] text-[#7a6f63]">{item.mallName} | </span>
                      <span className="text-[11px] font-bold text-[#a349be]">{Number(item.lprice).toLocaleString()}원</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct({
                        productId: item.productId,
                        productName: cleanTitle,
                        lprice: item.lprice,
                        image: item.image,
                      });
                      setSearchResults([]); // 선택 후 리스트 닫기
                    }}
                    className="shrink-0 rounded bg-[#9d49be] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#863da8]"
                  >
                    선택
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 숨겨진 필드: 서버 전송용 네이버 상품 정보 */}
      <input type="hidden" name="productId" value={selectedProduct?.productId ?? ""} />
      <input type="hidden" name="productName" value={selectedProduct?.productName ?? ""} />
      <input type="hidden" name="currentLowestPrice" value={selectedProduct?.lprice ?? ""} />

      {showSlugField ? (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel>URL ID</FieldLabel>
          <input
            name="id"
            defaultValue={review?.id}
            placeholder="예: apple-airpods-pro-2"
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>리뷰 제목</FieldLabel>
        <input
          name="title"
          defaultValue={review?.title}
          required
          placeholder="예: 1년 동안 매일 써본 내돈내산 솔직 후기"
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>카테고리</FieldLabel>
          <select
            name="category"
            defaultValue={review?.category ?? "electronics"}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
          >
            <option value="electronics">전자제품/가전</option>
            <option value="fashion">의류/잡화</option>
            <option value="cosmetics">뷰티/화장품</option>
            <option value="supplements">영양제/식품</option>
            <option value="lifestyle">생활/리빙</option>
            <option value="sports">스포츠/레저</option>
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
            defaultValue={review?.rating ?? 5}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>구매일(혹은 사용 시작일)</FieldLabel>
          <input
            name="purchased_at"
            type="date"
            defaultValue={review?.purchasedAt}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel>태그 (키워드)</FieldLabel>
        <input
          name="tags"
          defaultValue={review?.tags.join(", ")}
          placeholder="쉼표(,)로 구분해 적어주세요. 예: 노이즈캔슬링, 가성비, 추천템"
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#8f49be] focus:bg-white"
        />
      </label>

      <input type="hidden" name="thumbnail" value={review?.thumbnail ?? ""} />

      <label className="grid gap-2 text-sm font-bold rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-4">
        <FieldLabel>썸네일 업로드 (미첨부 시 네이버 상품 이미지 사용 가능)</FieldLabel>
        {review?.thumbnail ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#d8cfc2] bg-white p-3">
            <NextImage
              src={review.thumbnail}
              alt={review.thumbnailAlt ?? ""}
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
          <span className="shrink-0 rounded-md bg-[#9249be] px-3 py-2 text-sm font-bold text-white">
            파일 선택
          </span>
          <span className="min-w-0 flex-1 break-all text-xs font-normal leading-5 text-[#7a6f63]">
            {thumbnailStatus}
          </span>
        </div>
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>한 줄 요약 (장단점 등)</FieldLabel>
        <textarea
          name="summary"
          defaultValue={review?.summary}
          required
          rows={2}
          placeholder="예: 노이즈 캔슬링 성능은 역대급이지만, 가격이 조금 부담스럽습니다."
          className="resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:border-[#8f49be] focus:bg-white"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>상세 사용 후기</FieldLabel>
        <textarea
          name="review"
          defaultValue={review?.review}
          required
          rows={8}
          placeholder="제품의 디자인, 성능, 실사용 장단점 등을 자유롭게 작성해 주세요."
          className="resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:border-[#8f49be] focus:bg-white"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isCompressing || isSearching}
          className="rounded-md bg-[#9249be] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#863da8] disabled:opacity-50"
        >
          {isCompressing ? "이미지 압축 중..." : submitLabel}
        </button>
        <Link
          href={review ? `/reviews/${review.id}` : "/reviews"}
          className="rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#8f49be] hover:text-[#8f49be]"
        >
          취소
        </Link>
      </div>
    </form>
  );
}