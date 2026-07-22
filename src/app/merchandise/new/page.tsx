import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMerchandiseReview } from "@/app/actions/merchandise";
import { MerchandiseReviewForm } from "@/components/merchandise/MerchandiseForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewReviewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8f49be]"
        >
          <ArrowLeft size={17} />
          리뷰 목록
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#a349be]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            새 리뷰 작성
          </h1>
        </header>

        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <MerchandiseReviewForm
            action={createMerchandiseReview}
            submitLabel="리뷰 저장"
            showSlugField
          />
        </section>
      </section>
    </main>
  );
}
