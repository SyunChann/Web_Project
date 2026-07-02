import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateWatchlistItem } from "@/app/actions/watchlist";
import { WatchlistForm } from "@/components/WatchlistForm";
import { getWatchItem } from "@/data/watchlist";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditWatchlistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWatchlistPage({
  params,
}: EditWatchlistPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const item = await getWatchItem(id);

  if (!item) {
    notFound();
  }

  if (!canManageContent(user, item.authorId)) {
    redirect(`/watchlist/${item.id}`);
  }

  const updateAction = updateWatchlistItem.bind(null, item.id);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href={`/watchlist/${item.id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"
        >
          <ArrowLeft size={17} />
          기대작 상세
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#2f7f7a]">Watchlist</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">기대작 수정</h1>
        </header>

        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <WatchlistForm
            action={updateAction}
            submitLabel="수정 저장"
            item={item}
          />
        </section>
      </section>
    </main>
  );
}
