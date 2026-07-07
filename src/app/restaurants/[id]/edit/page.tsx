import { notFound, redirect } from "next/navigation";
import { updateRestaurantReview } from "@/app/actions/restaurants";
import { AppNav } from "@/components/AppNav";
import { RestaurantsReviewForm } from "@/components/restaurants/RestaurantReviewForm";
import { getRestaurantsReview } from "@/data/restaurants";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RestaurantEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: RestaurantEditPageProps) {
  const { id } = await params;
  const item = await getRestaurantsReview(id);

  return {
    title: item ? `${item.title} 수정 | 취향보관소` : "맛집 없음",
  };
}

export default async function RestaurantEditPage({
  params,
}: RestaurantEditPageProps) {
  const { id } = await params;
  const item = await getRestaurantsReview(id);

  // 1. 해당 맛집 기록이 존재하지 않으면 404 처리
  if (!item) {
    notFound();
  }

  // 2. Supabase 유저 및 수정 권한 체크
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const canManageReview = canManageContent(user, item.authorId);

  // 권한이 없다면 상세 페이지로 리다이렉트
  if (!canManageReview) {
    redirect(`/restaurants/${item.id}`);
  }

  // 3. Form에 넘겨줄 Server Action 생성 (기존 id 바인딩)
  const updateActionWithId = updateRestaurantReview.bind(null, item.id);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <AppNav active="restaurants" />

        <div className="mt-10 border-b border-[#eadcc7] pb-5">
          <p className="text-sm font-bold uppercase text-[#e57632]">edit archive</p>
          <h1 className="mt-2 text-3xl font-black text-[#17202a]">
            맛집 기록 수정하기
          </h1>
          <p className="mt-2 text-sm text-[#52616b]">
            구글 지도 정보와 썸네일 이미지, 세부 방문평을 최신 정보로 변경합니다.
          </p>
        </div>

        {/* 4. 수정 폼 렌더링 */}
        <div className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <RestaurantsReviewForm
            action={updateActionWithId}
            submitLabel="수정 완료"
            restaurantsReview={item}
            showSlugField={false}
          />
        </div>
      </section>
    </main>
  );
}