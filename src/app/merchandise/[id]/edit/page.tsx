import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateMerchandiseReview } from "@/app/actions/merchandise";
import { MerchandiseReviewForm } from "@/components/merchandise/MerchandiseForm";
import { getMerchandiseReview } from "@/data/merchandise";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditReviewPage({ params }: EditReviewPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const review = await getMerchandiseReview(id);

  if (!review) {
    notFound();
  }

  if (!canManageContent(user, review.authorId)) {
    redirect(`/merchandise/${review.id}`);
  }

  const updateAction = updateMerchandiseReview.bind(null, review.id);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href={`/merchandise/${review.id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8f49be]"
        >
          <ArrowLeft size={17} />
          리뷰 상세
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#8f49be]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">리뷰 수정</h1>
        </header>

        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <MerchandiseReviewForm
            action={updateAction}
            submitLabel="수정 저장"
            review={review}
          />
        </section>
      </section>
    </main>
  );
}
