import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminServices } from "@/components/admin/AdminServices";
import { requireAdminSession } from "@/lib/adminSession";

export const metadata: Metadata = { title: "서비스·연동 관리 | 관리자 | 취향보관소" };

export default async function AdminServicesPage() {
  await requireAdminSession("/admin/services");
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <AppNav active="admin" />
      <AdminSectionNav active="services" />
      <AdminServices headingLevel="h1" />
    </div>
  </main>;
}
