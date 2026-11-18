import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminApiDocs } from "@/components/admin/AdminApiDocs";
import { requireAdminSession } from "@/lib/adminSession";

export const metadata: Metadata = { title: "내부 API 문서 | 관리자 | 취향보관소" };

export default async function AdminApiDocsPage() {
  await requireAdminSession();
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <AppNav active="admin" />
      <AdminSectionNav active="api-docs" />
      <header className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">내부 API 문서</h1>
        <p className="text-sm leading-6 text-[#52616b]">요청 형식과 응답을 확인하는 Swagger 문서입니다. 애니 신작 GET 조회만 직접 실행할 수 있으며, 닉네임 POST는 설명만 제공합니다.</p>
        <a href="/api/admin/openapi" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-[#be4b49] underline">OpenAPI JSON 보기</a>
      </header>
      <AdminApiDocs />
      <details className="rounded-xl border border-[#d8cfc2] bg-white p-4 text-sm">
        <summary className="cursor-pointer font-bold">문서에 없는 서버 기능은 어떻게 호출하나요?</summary>
        <div className="mt-4 space-y-4 leading-7 text-[#52616b]">
          <p>Swagger에는 JSON Route Handler 두 개만 등록했습니다. 아래 기능은 기존 방식을 유지하며, 문서용 REST API를 따로 만들지 않았습니다.</p>
          <dl className="space-y-3">
            <div><dt className="font-bold text-[#17212b]">Server Actions</dt><dd>회원가입·로그인·비밀번호 재설정, 로그인 후 계정 변경과 글 작성·수정·삭제를 처리합니다. 글 변경은 기능별 작성자·관리자 권한과 DB RLS로 확인합니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">서버에서 직접 조회</dt><dd>항공편·출국장 혼잡도·환율·토스 상품은 서버 코드에서 외부 서비스를 조회합니다. 네이버 상품 검색은 Server Action으로 조회합니다. API 인증키는 서버에서만 사용합니다.</dd></div>
            <div><dt className="font-bold text-[#17212b]">사진 업로드</dt><dd>로그인한 사용자의 브라우저에서 Supabase Storage SDK를 사용하며, 저장소 정책으로 업로드 권한을 제한합니다.</dd></div>
          </dl>
          <Link href="/admin/api-status" prefetch={false} className="inline-flex min-h-11 items-center font-bold text-[#be4b49] underline">외부 API 운영 현황 보기</Link>
        </div>
      </details>
    </div>
  </main>;
}
