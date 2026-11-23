import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminApiDocs } from "@/components/admin/AdminApiDocs";
import { requireAdminSession } from "@/lib/adminSession";

export const metadata: Metadata = { title: "내부 API 문서 | 관리자 | 취향보관소" };

export default async function AdminApiDocsPage() {
  await requireAdminSession("/admin/api-docs");
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <AppNav active="admin" />
      <AdminSectionNav active="api-docs" />
      <header className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">내부 API 문서</h1>
        <p className="text-sm leading-6 text-[#52616b]">사이트가 제공하는 JSON API의 요청·응답을 확인합니다. 애니 신작 GET만 직접 실행할 수 있으며, 닉네임 POST는 설명만 제공합니다.</p>
        <p className="text-sm leading-6 text-[#52616b]">항공편·혼잡도·환율 등도 API를 사용합니다. 서버가 외부 API를 직접 호출하는 기능은 아래 ‘다른 데이터 호출 방식’에서 안내합니다.</p>
        <a href="/api/admin/openapi" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-[#be4b49] underline">OpenAPI JSON 보기</a>
      </header>
      <AdminApiDocs />
      <section aria-labelledby="other-data-calls" className="rounded-xl border border-[#d8cfc2] bg-white p-4 text-sm sm:p-5">
        <h2 id="other-data-calls" className="text-lg font-bold">다른 데이터 호출 방식</h2>
        <div className="mt-4 space-y-4 leading-7 text-[#52616b]">
          <p>외부 API 호출도 API 사용에 해당합니다. Swagger에는 이 사이트가 제공하는 고정된 URL·요청·응답 형식의 JSON API 두 개를 등록했습니다.</p>
          <dl className="space-y-3">
            <div><dt className="font-bold text-[#17212b]">Server Actions</dt><dd>회원가입·로그인·비밀번호 재설정, 로그인 후 계정 변경과 글 작성·수정·삭제를 처리합니다. 글 변경은 기능별 작성자·관리자 권한과 DB RLS로 확인합니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">항공편·출국장 혼잡도</dt><dd>Next.js 서버 → 공공데이터포털의 인천공항 API를 호출합니다. 결과를 서버에서 가공해 화면에 전달합니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">환율·추천 상품·LCK 일정</dt><dd>Next.js 서버 → 한국수출입은행·Frankfurter(ECB)·토스 쉐어링크·네이버 e스포츠의 외부 데이터를 조회합니다. 별도의 내부 JSON API 주소를 거치지 않습니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">네이버 상품 검색</dt><dd>브라우저 → Server Action → 네이버 검색 API 순서로 호출합니다. Server Actions도 HTTP 요청을 사용하지만, 호출 형식은 Next.js가 관리하므로 일반 JSON API와 구분해 안내합니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">글 목록·상세</dt><dd>서버에서 Supabase SDK로 데이터베이스를 조회합니다. SDK가 Supabase API를 사용하며, 사이트에 별도 목록·상세 JSON API를 만들지는 않았습니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">사진 업로드</dt><dd>로그인한 사용자의 브라우저에서 Supabase Storage SDK를 사용하며, 저장소 정책으로 업로드 권한을 제한합니다.</dd></div>
          </dl>
          <Link href="/admin/api-status" prefetch={false} className="inline-flex min-h-11 items-center font-bold text-[#be4b49] underline">외부 API 운영 현황 보기</Link>
        </div>
      </section>
    </div>
  </main>;
}
