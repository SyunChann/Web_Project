"use client";

import { AlertCircle, CheckCircle2, Play } from "lucide-react";
import { useMemo, useState } from "react";

type YouTubePreviewFieldProps = {
  defaultValue?: string | null;
  variant?: "reviews" | "watchlist";
};

const theme = {
  reviews: {
    focus: "focus:border-[#be4b49]",
    iconBg: "bg-[#fde8e7]",
    iconText: "text-[#be4b49]",
    border: "border-[#f0cfce]",
  },
  watchlist: {
    focus: "focus:border-[#38a39b]",
    iconBg: "bg-[#e4f4f2]",
    iconText: "text-[#2f7f7a]",
    border: "border-[#c8dedb]",
  },
};

export function YouTubePreviewField({
  defaultValue = "",
  variant = "reviews",
}: YouTubePreviewFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const videoId = useMemo(() => getYouTubeVideoId(value), [value]);
  const hasValue = value.trim().length > 0;
  const colors = theme[variant];

  return (
    <label className="grid gap-2 text-sm font-bold">
      <span className="flex items-center gap-2">
        유튜브 영상 링크
        <span className="rounded bg-[#eee4d8] px-1.5 py-0.5 text-xs text-[#9b8f82]">
          선택
        </span>
      </span>
      <input
        name="youtubeUrl"
        type="url"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder="예: https://www.youtube.com/watch?v=..."
        className={`rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition ${colors.focus} focus:bg-white`}
      />

      {videoId ? (
        <div
          className={`grid gap-3 rounded-lg border ${colors.border} bg-white p-3 sm:grid-cols-[160px_1fr]`}
        >
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="유튜브 영상 썸네일"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff0033] text-white shadow-md">
                <Play size={18} fill="currentColor" />
              </span>
            </span>
          </div>
          <div className="min-w-0 self-center">
            <p className={`flex items-center gap-2 font-bold ${colors.iconText}`}>
              <CheckCircle2 size={17} />
              영상 인식됨
            </p>
            <p className="mt-2 break-all text-xs font-normal leading-5 text-[#52616b]">
              상세 페이지에서 유튜브 영상으로 표시됩니다.
            </p>
          </div>
        </div>
      ) : hasValue ? (
        <p className="flex items-center gap-2 rounded-md border border-[#eadcc7] bg-[#fffdf8] px-3 py-2 text-xs font-normal text-[#8a5a2b]">
          <AlertCircle size={15} />
          유튜브 링크를 인식하지 못했습니다. watch, youtu.be, shorts 주소를
          입력해주세요.
        </p>
      ) : (
        <p className="text-xs font-normal leading-5 text-[#7a6f63]">
          입력하면 영상 인식 여부와 썸네일이 표시됩니다.
        </p>
      )}
    </label>
  );
}

function getYouTubeVideoId(value?: string | null) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(trimmedValue);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return normalizeVideoId(url.pathname.split("/").filter(Boolean)[0]);
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return normalizeVideoId(url.searchParams.get("v"));
      }

      const [, pathType, id] = url.pathname.split("/");

      if (pathType === "embed" || pathType === "shorts" || pathType === "live") {
        return normalizeVideoId(id);
      }
    }
  } catch {
    return normalizeVideoId(trimmedValue);
  }

  return "";
}

function normalizeVideoId(value?: string | null) {
  const videoId = value?.trim() ?? "";

  return /^[\w-]{11}$/.test(videoId) ? videoId : "";
}
