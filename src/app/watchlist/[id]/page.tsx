import { ArrowLeft, Bookmark, CalendarClock, Pencil, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteWatchlistItem } from "@/app/actions/watchlist";
import { DeleteWatchlistButton } from "@/components/DeleteWatchlistButton";
import {
  getWatchItem,
  getWatchItems,
  watchStatusLabel,
  watchStatusTheme,
} from "@/data/watchlist";
import { typeLabel, typeTheme } from "@/data/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getYouTubeEmbedUrl } from "@/lib/supabase/utils";

type WatchlistDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateStaticParams() {
  const items = await getWatchItems();

  return items.map((item) => ({
    id: item.id,
  }));
}

export async function generateMetadata({ params }: WatchlistDetailPageProps) {
  const { id } = await params;
  const item = await getWatchItem(id);

  return {
    title: item ? `${item.title} | 기대작` : "기대작 없음",
    description: item?.reason ?? "기대작을 찾을 수 없습니다.",
  };
}

export default async function WatchlistDetailPage({
  params,
}: WatchlistDetailPageProps) {
  const { id } = await params;
  const item = await getWatchItem(id);

  if (!item) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const theme = typeTheme(item.type);
  const deleteAction = deleteWatchlistItem.bind(null, item.id);
  const embedUrl = getYouTubeEmbedUrl(item.youtubeUrl);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <article className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/watchlist/items"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"
          >
            <ArrowLeft size={17} />
            기대작 목록
          </Link>

          {user ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/watchlist/${item.id}/edit`}
                className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#38a39b] hover:text-[#2f7f7a]"
              >
                <Pencil size={16} />
                수정
              </Link>
              <form action={deleteAction}>
                <DeleteWatchlistButton title={item.title} />
              </form>
            </div>
          ) : null}
        </div>

        <header
          className={`mt-8 overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm`}
        >
          <Image
            src={item.thumbnail}
            alt={item.thumbnailAlt}
            width={960}
            height={540}
            className="aspect-video w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-3 py-1 text-sm font-bold ${theme.badge}`}
              >
                {typeLabel(item.type)}
              </span>
              <span
                className={`rounded-md px-3 py-1 text-sm font-bold ${watchStatusTheme(item.status)}`}
              >
                {watchStatusLabel(item.status)}
              </span>
              {item.genre.map((genre) => (
                <span
                  key={genre}
                  className="rounded-md bg-[#f3e6d8] px-3 py-1 text-sm font-semibold text-[#8a3b2f]"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
              {item.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-[#52616b]">
              <span className="flex items-center gap-2">
                <CalendarClock size={17} />
                {item.releaseLabel}
              </span>
              <span className="flex items-center gap-2">
                <Bookmark size={17} />
                {watchStatusLabel(item.status)}
              </span>
            </div>

            <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-[#3f4a54]">
              {item.reason}
            </p>
          </div>
        </header>

        {embedUrl ? (
          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e4f4f2] text-[#2f7f7a]">
                <Play size={18} fill="currentColor" />
              </span>
              <div>
                <h2 className="text-xl font-bold">관련 영상</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">
                  기대감을 남겨두기 좋은 영상입니다.
                </p>
              </div>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embedUrl}
                title={`${item.title} 관련 영상`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="absolute top-0 left-0 h-full w-full border-0"
              />
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
