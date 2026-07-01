"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { YouTubePreviewField } from "@/components/YouTubePreviewField";
import type { Review } from "@/data/reviews";

type ReviewFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  review?: Review;
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
        <span className="text-[#be4b49]" aria-label="필수 입력">
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

export function ReviewForm({
  action,
  submitLabel,
  review,
  showSlugField = false,
}: ReviewFormProps) {
  const currentThumbnailName = getFileNameFromPath(review?.thumbnail);
  const [thumbnailStatus, setThumbnailStatus] = useState(
    currentThumbnailName
      ? `현재 썸네일: ${currentThumbnailName}. 새 파일을 선택하면 교체됩니다.`
      : "이미지는 업로드 전에 자동으로 1200px 이하 WebP로 압축됩니다.",
  );
  const [isCompressing, setIsCompressing] = useState(false);

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
      {showSlugField ? (
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel>URL ID</FieldLabel>
          <input
            name="id"
            defaultValue={review?.id}
            placeholder="예: my-favorite-movie"
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>제목</FieldLabel>
        <input
          name="title"
          defaultValue={review?.title}
          required
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>카테고리</FieldLabel>
          <select
            name="type"
            defaultValue={review?.type ?? "movie"}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          >
            <option value="movie">영화</option>
            <option value="anime">애니</option>
            <option value="game">게임</option>
            <option value="drama">드라마</option>
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
            defaultValue={review?.rating ?? 4}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          <FieldLabel required>감상일</FieldLabel>
          <input
            name="watched_at"
            type="date"
            defaultValue={review?.watchedAt}
            required
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel>장르</FieldLabel>
        <input
          name="genre"
          defaultValue={review?.genre.join(", ")}
          placeholder="예: 로맨스, 판타지"
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <YouTubePreviewField defaultValue={review?.youtubeUrl} />

      <input type="hidden" name="thumbnail" value={review?.thumbnail ?? ""} />

      <label className="grid gap-2 text-sm font-bold rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-4">
        <FieldLabel>썸네일 업로드</FieldLabel>
        {review?.thumbnail ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#d8cfc2] bg-white p-3">
            <NextImage
              src={review.thumbnail}
              alt={review.thumbnailAlt}
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
          <span className="shrink-0 rounded-md bg-[#be4b49] px-3 py-2 text-sm font-bold text-white">
            파일 선택
          </span>
          <span className="min-w-0 flex-1 break-all text-xs font-normal leading-5 text-[#7a6f63]">
            {thumbnailStatus}
          </span>
        </div>
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>요약</FieldLabel>
        <textarea
          name="summary"
          defaultValue={review?.summary}
          required
          rows={3}
          className="resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        <FieldLabel required>감상평</FieldLabel>
        <textarea
          name="review"
          defaultValue={review?.review}
          required
          rows={8}
          className="resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isCompressing}
          className="rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
        >
          {isCompressing ? "이미지 압축 중..." : submitLabel}
        </button>
        <Link
          href={review ? `/reviews/${review.id}` : "/reviews"}
          className="rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
