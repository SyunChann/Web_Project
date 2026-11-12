import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTossSharelinkContent } from "@/lib/tossSharelink";
import { getTossThumbnailUrl, parseTossProductIds } from "@/lib/tossProductImages";

export const dynamic = "force-dynamic";

export default async function TossImagesAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login");
  if (!isAdminUser(user)) notFound();

  const result = await getTossSharelinkContent();
  const approved = parseTossProductIds(process.env.TOSS_IMAGE_APPROVED_IDS);
  const blocked = parseTossProductIds(process.env.TOSS_IMAGE_BLOCKED_IDS);
  return <main className="min-h-screen px-4 py-6 sm:px-10">
    <section className="mx-auto grid max-w-4xl gap-5">
      <Link href="/admin" className="text-sm font-bold text-[#be4b49]">← 관리자 화면</Link>
      <h1 className="text-2xl font-black">토스 상품 이미지 관리</h1>
      <div className="rounded-xl border border-[#ddd6cc] bg-white p-5 text-sm leading-7 text-[#52616b]">
        <p>상품 상세 페이지의 이미지 사용 금지 표시를 확인한 뒤 상품 ID를 복사해 Vercel 환경변수에 등록해 주세요.</p>
        <p className="mt-2 break-all"><strong>TOSS_IMAGE_APPROVED_IDS</strong>: 사용을 확인한 상품 ID 목록</p>
        <p className="break-all"><strong>TOSS_IMAGE_BLOCKED_IDS</strong>: 사용 금지·삭제 요청 상품 ID 목록 (차단 우선)</p>
        <p className="mt-2">여러 ID는 쉼표로 구분합니다. 설정 변경 후 재배포해야 반영됩니다. 이 화면은 현재 목록과 적용 상태를 확인하는 용도이며, 환경변수를 직접 저장하지 않습니다.</p>
      </div>
      {result.status !== "ready" ? <p role="status" className="rounded-xl bg-white p-5">{result.status === "not-configured" ? "토스 프록시 환경변수가 설정되지 않았습니다." : "상품 정보를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요."}</p> : (
        <ul className="grid gap-3">
          {result.products.map((product) => {
            const visible = getTossThumbnailUrl(product, approved, blocked);
            const state = blocked.has(product.tacaItemId) ? "노출 중단" : !approved.has(product.tacaItemId)
              ? "사용 확인 필요" : visible ? "이미지 노출 허용" : "허용됨 · 유효한 이미지 URL 없음";
            return <li key={product.tacaItemId} className="grid gap-3 rounded-xl border border-[#ddd6cc] bg-white p-4">
              <p className="font-bold">{product.rank}. {product.displayName}</p>
              <p className="text-sm text-[#52616b]">상품 ID: {product.tacaItemId} · {state}</p>
              <div className="flex flex-wrap items-center gap-3">
                <CopyButton value={String(product.tacaItemId)} label="상품 ID 복사" />
                <a href={product.shareUrl} target="_blank" rel="sponsored noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-[#be4b49]">토스에서 상품 확인 ↗</a>
              </div>
            </li>;
          })}
        </ul>
      )}
    </section>
  </main>;
}
