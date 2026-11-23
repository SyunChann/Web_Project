import type { Metadata } from "next";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminApiStatus } from "@/components/admin/AdminApiStatus";
import { requireAdminSession } from "@/lib/adminSession";

export const metadata: Metadata = { title: "외부 API 운영 현황 | 관리자 | 취향보관소" };

export default async function AdminApiStatusPage() {
  const { user } = await requireAdminSession("/admin/api-status");
  const now = new Date().getTime();
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <AppNav active="admin" />
      <AdminSectionNav active="api-status" />
      <Suspense fallback={<section role="status" className="grid gap-4"><h1 className="text-3xl font-black sm:text-4xl">외부 API 운영 현황</h1><p className="rounded-lg border bg-white p-5">운영 기록을 불러오고 있습니다…</p></section>}>
        <AdminApiStatus user={user} now={now} headingLevel="h1" />
      </Suspense>
    </div>
  </main>;
}
