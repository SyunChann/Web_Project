import Link from "next/link";
import type { Review } from "@/data/reviews";

type ReviewFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  review?: Review;
  showSlugField?: boolean;
};

export function ReviewForm({
  action,
  submitLabel,
  review,
  showSlugField = false,
}: ReviewFormProps) {
  return (
    <form action={action} className="grid gap-5">
      {showSlugField ? (
        <label className="grid gap-2 text-sm font-bold">
          URL ID
          <input
            name="id"
            defaultValue={review?.id}
            placeholder="예: my-favorite-movie"
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-bold">
        제목
        <input
          name="title"
          defaultValue={review?.title}
          required
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">
          카테고리
          <select
            name="type"
            defaultValue={review?.type ?? "movie"}
            className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
          >
            <option value="movie">영화</option>
            <option value="anime">애니</option>
            <option value="game">게임</option>
            <option value="drama">드라마</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold">
          별점
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
          감상일
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
        장르
        <input
          name="genre"
          defaultValue={review?.genre.join(", ")}
          placeholder="예: 로맨스, 판타지"
          className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <div className="grid gap-5 rounded-lg border border-[#ddd6cc] bg-[#fbfaf7] p-4">
        <label className="grid gap-2 text-sm font-bold">
          썸네일 업로드
          <input
            name="thumbnail_file"
            type="file"
            accept="image/*"
            className="rounded-md border border-[#d8cfc2] bg-white px-4 py-3 text-sm font-normal file:mr-4 file:rounded-md file:border-0 file:bg-[#be4b49] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          썸네일 URL
          <input
            name="thumbnail"
            defaultValue={review?.thumbnail}
            placeholder="파일을 올리면 자동으로 저장됩니다"
            className="rounded-md border border-[#d8cfc2] bg-white px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49]"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          썸네일 설명
          <input
            name="thumbnail_alt"
            defaultValue={review?.thumbnailAlt}
            placeholder="예: 작품 분위기를 보여주는 썸네일"
            className="rounded-md border border-[#d8cfc2] bg-white px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49]"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold">
        요약
        <textarea
          name="summary"
          defaultValue={review?.summary}
          required
          rows={3}
          className="resize-y rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal leading-7 outline-none transition focus:border-[#be4b49] focus:bg-white"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        감상평
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
          className="rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
        >
          {submitLabel}
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
