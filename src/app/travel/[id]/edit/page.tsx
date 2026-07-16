import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTravel } from "@/app/actions/travel";
import { AppNav } from "@/components/AppNav";
import { TravelForm } from "@/components/travel/TravelForm";
import { getTravel, getTravels, sortTravelStops, travelToStop } from "@/data/travel";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TravelEditPageProps = { params: Promise<{ id: string }> };

export default async function TravelEditPage({ params }: TravelEditPageProps) {
  const { id } = await params;
  const item = await getTravel(id);

  if (!item) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!canManageContent(user, item.authorId)) redirect(`/travel/${item.id}`);

  const legacyTravelItems = item.itinerary.length || !item.tripTitle
    ? []
    : (await getTravels()).filter(
        (travel) =>
          travel.tripTitle === item.tripTitle &&
          travel.authorId === item.authorId &&
          travel.createdAt.slice(0, 10) === item.createdAt.slice(0, 10),
      );
  const editableTravel = legacyTravelItems.length
    ? { ...item, itinerary: sortTravelStops(legacyTravelItems.map(travelToStop)) }
    : item;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-3xl">
        <AppNav active="travel" />
        <Link href={`/travel/${item.id}`} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#4d7c0f]"><ArrowLeft size={17} />여행리뷰 상세</Link>
        <header className="py-8"><p className="text-sm font-bold uppercase text-[#4d7c0f]">edit travel</p><h1 className="mt-2 text-3xl font-black text-[#17202a]">여행 기록 수정</h1></header>
        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <TravelForm
            action={updateTravel.bind(null, item.id)}
            submitLabel="수정 완료"
            travel={editableTravel}
            scope="overseas"
            legacyTravelIds={legacyTravelItems.map((travel) => travel.id)}
          />
        </section>
      </section>
    </main>
  );
}
